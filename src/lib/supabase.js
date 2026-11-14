// Single Supabase browser client for the whole app.
//
// IMPORTANT: there must be exactly ONE createClient() call across the
// bundle. Two clients with different storageKey configs caused the
// 2026-06-01 bug where AuthContext stored the session under one key
// and AdminPlatformChangesPage looked under another → getSession()
// returned null → functions.invoke() sent the publishable key as
// Bearer → 401 UNAUTHORIZED_INVALID_JWT_FORMAT.
//
// Pattern: singleton via globalThis. Both `lib/supabase` and the
// legacy `lib/customSupabaseClient` import paths resolve to this
// same instance (customSupabaseClient.js just re-exports).
//
// Config: defaults (no storageKey override) — auth-js stores the
// session under `sb-<projectref>-auth-token`, which is what every
// user currently has cached. Changing it would log everyone out.

import { createClient } from '@supabase/supabase-js';
import { recoveryTarget } from '@/lib/authRedirects';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://ffowgyjdbgkphsflxybk.supabase.co';

// New "Publishable" key (sb_publishable_*) — replaces the legacy anon
// JWT which Supabase disabled 2026-05. Safe in the browser bundle;
// RLS still controls per-row access.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_fG0AhiV3dznAp7DcHm5jPA_jepTG5-W';

const g = globalThis;
if (!g.__snapgain_supabase__) {
  g.__snapgain_supabase__ = createClient(supabaseUrl, supabaseAnonKey);
  // A password-reset link signs the person in with a PASSWORD_RECOVERY
  // event. Send them to /reset-password wherever Supabase landed them
  // (08/11/2026: a bad redirect_to dropped them on the home page, signed
  // in, with no way to set the password). Registered here, right after
  // createClient, because supabase-js emits that event once, shortly
  // after it reads the link, and a listener added later in a React
  // effect can miss it. The session is already saved when it fires, so
  // a full page load keeps the person signed in.
  if (typeof window !== 'undefined') {
    g.__snapgain_supabase__.auth.onAuthStateChange((event) => {
      const target = recoveryTarget(event, window.location.pathname);
      if (target) window.location.replace(target);
    });
  }
}

export const supabase = g.__snapgain_supabase__;
export default supabase;
