// signup-alert
//
// Emails the owner every time someone signs up (owner's request,
// 26/11/2026). Called by the trigger ops.notify_signup() on auth.users
// (migration 0052) through pg_net, with the new user's id. The email has
// the address, how they signed up (email or Google), whether the address
// is confirmed yet, and how many accounts SnapGain has now.
//
// Auth model (same as source-alert / daily-boost-digest): verify_jwt=false
// because pg_net doesn't carry a JWT. We require X-Internal-Key OR the
// service-role key in Authorization. Anonymous traffic is rejected.
//
// Secrets (already set for source-alert): RESEND_API_KEY, EMAIL_FROM,
// ALERT_EMAIL (who gets the alert; several addresses separated by
// commas), INTERNAL_SYNC_KEY (optional, for manual calls).
//
// Manual test: POST {"user_id": "<uuid>", "dry_run": true}.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'SnapGain <noreply@snapgain.uk>';
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') || '';
const INTERNAL_SYNC_KEY = Deno.env.get('INTERNAL_SYNC_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isAuthorized(req: Request): boolean {
  const internal = req.headers.get('x-internal-key');
  if (INTERNAL_SYNC_KEY && internal === INTERNAL_SYNC_KEY) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });

  let body: { user_id?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  if (!body.user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 });

  const { data: got, error } = await supabase.auth.admin.getUserById(body.user_id);
  if (error || !got?.user) {
    return new Response(JSON.stringify({ error: error?.message || 'user not found' }), { status: 404 });
  }
  const u = got.user;
  if (u.is_anonymous) return new Response(JSON.stringify({ skipped: 'anonymous user' }), { status: 200 });

  // Total accounts, to show the count in the email (first page is enough
  // for a small project; perPage 1000).
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const total = (list?.users || []).filter((x) => !x.is_anonymous).length;

  const email = u.email || '(no email)';
  const provider = (u.app_metadata?.provider as string) || 'email';
  const how = provider === 'google' ? 'Google' : provider === 'email' ? 'email and password' : provider;
  const when = new Date(u.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' });
  const confirmed = u.email_confirmed_at ? 'yes' : 'not yet (they still have to click the link in the email)';

  const subject = `New SnapGain sign-up: ${email}`;
  const text = [
    'Someone just signed up to SnapGain.',
    '',
    `Email: ${email}`,
    `Signed up with: ${how}`,
    `When: ${when} (London)`,
    `Email confirmed: ${confirmed}`,
    '',
    `SnapGain now has ${total} accounts.`,
  ].join('\n');
  const html = `<p>Someone just signed up to SnapGain.</p>
<ul>
<li><b>Email:</b> ${esc(email)}</li>
<li><b>Signed up with:</b> ${esc(how)}</li>
<li><b>When:</b> ${esc(when)} (London)</li>
<li><b>Email confirmed:</b> ${esc(confirmed)}</li>
</ul>
<p>SnapGain now has <b>${total}</b> accounts.</p>`;

  const recipients = ALERT_EMAIL.split(',').map((s) => s.trim()).filter(Boolean);
  if (body.dry_run) {
    return new Response(JSON.stringify({ dry_run: true, recipients: recipients.length, subject, text }), { status: 200 });
  }
  if (!RESEND_API_KEY || !recipients.length) {
    console.error('[signup-alert] RESEND_API_KEY or ALERT_EMAIL not set');
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY or ALERT_EMAIL not set' }), { status: 500 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: recipients, subject, html, text }),
  });
  const out = await res.text();
  if (!res.ok) {
    console.error('[signup-alert] Resend error', res.status, out);
    return new Response(JSON.stringify({ error: 'resend', status: res.status }), { status: 502 });
  }
  return new Response(JSON.stringify({ sent: true, total }), { status: 200 });
});
