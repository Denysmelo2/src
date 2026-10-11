// rate-entry — the operator types a rate in, and it lands with an honest
// verification date.
//
// WHY A FUNCTION AND NOT RLS. The obvious way to build the admin screen
// was a write policy on gift_card_offers mirroring the ones on
// cashback_offers. Those were keyed on `is_admin()`, which at the time
// read `auth.users.raw_user_meta_data->>'role'` — the field
// `auth.updateUser({ data })` writes — so any user could make it true
// for themselves. Adding a policy keyed on that check would have widened
// a live hole from one table to two. Migration 0009 has since repointed
// `is_admin()` at `user_profiles.role`, so that specific objection is
// now historical.
//
// This still routes through a function rather than a new policy, for
// reasons that outlive the hole: `gift_card_offers` has no admin write
// policy at all, and a single server-side path is where the four-source
// allowlist, the 0–100 range check and the validate-everything-before-
// writing-anything rule actually live. An RLS policy can authorise a
// write; it cannot refuse a typo. The admin check reads
// `user_profiles.role`, which migration 0007 made trustworthy by
// revoking the column grants that let a user write it.
//
// WHY THE FOUR SOURCES ARE HARDCODED. EverUp, Airtime and the
// TopCashback and Quidco gift-card shops have no automatable feed:
// probed 2026-10-09, giftcards.quidco.com answers HTTP 403 behind a
// Cloudflare challenge, top-giftcards.topcashback.co.uk redirects to a
// member login, and both affiliate programmes are new-member CPL deals
// through Awin that publish no rates. Hand entry is the only honest
// option for those, which is what this serves. The allowlist keeps it to
// those four: without it, one mistaken request could rewrite the 3,591
// Quidco cashback rows that a working feed maintains.
//
// WHAT IT WILL NOT DO:
//   * never DELETE — leaving the network is `is_active = false`
//   * never touch a platform outside the allowlist
//   * never accept a rate outside 0–100
//   * never write without stamping last_verified_at, because a rate
//     whose age we cannot state is the problem this whole piece of work
//     exists to fix
//
// POST, Authorization: Bearer <the signed-in admin's JWT>
//
//   { action: 'list',       source: 'everup' }
//   { action: 'save',       source: 'everup',
//     edits: [{ id: '<uuid>', value: 7.8 }, ...] }
//   { action: 'reconfirm',  source: 'everup', confirm: true }
//   { action: 'deactivate', source: 'everup', ids: ['<uuid>', ...] }
//
// `reconfirm` re-stamps last_verified_at WITHOUT changing a rate: the
// operator has looked at the source and the numbers are unchanged. That
// is a human assertion, which is exactly what `nx-sync` got wrong by
// making it automatically. It needs confirm: true, it is scoped to one
// source, and the UI says in words what is being asserted.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** The only four things this function may write. */
const SOURCES = {
  everup: {
    label: 'EverUp gift cards',
    table: 'gift_card_offers',
    platform: 'everup',
    valueColumn: 'discount_pct',
    valueLabel: '% off',
  },
  'topcashback-giftcards': {
    label: 'TopCashback gift cards',
    table: 'gift_card_offers',
    platform: 'topcashback-giftcards',
    valueColumn: 'discount_pct',
    valueLabel: '% off',
  },
  'quidco-giftcards': {
    label: 'Quidco gift cards',
    table: 'gift_card_offers',
    platform: 'quidco-giftcards',
    valueColumn: 'discount_pct',
    valueLabel: '% off',
  },
  airtime: {
    label: 'Airtime cashback',
    table: 'cashback_offers',
    platform: 'airtime',
    valueColumn: 'rate',
    valueLabel: '% cashback',
  },
} as const;

type SourceKey = keyof typeof SOURCES;

const MAX_EDITS = 500;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // ── Who is calling? ────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing bearer token' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve the token to a user by passing it to getUser() explicitly,
  // rather than building a second client around SUPABASE_ANON_KEY.
  // Deliberate: this project moved to the new `sb_publishable_*` key and
  // Supabase disabled the legacy anon JWT in May 2026 (see the comment
  // at the top of src/lib/supabase.js), so the SUPABASE_ANON_KEY in this
  // function's environment may well be the dead one — which would have
  // failed the happy path with a confusing 401 while every deny path
  // still looked correct.
  //
  // A service-role key passed here is NOT a user and is refused, which
  // is the right answer: this endpoint is for a signed-in human, and
  // holding the service key is not the same as being an admin of this
  // app.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const uid = userData?.user?.id;
  if (userErr || !uid) {
    return json(
      {
        ok: false,
        error: 'this token does not identify a user; sign in as an admin',
        detail: userErr?.message ?? null,
      },
      401
    );
  }

  // ── Is that user an admin? ─────────────────────────────────────────
  // Reads user_profiles.role directly rather than calling is_admin().
  // Same source of truth since migration 0009 repointed that function at
  // this column, but reading it here keeps this endpoint's authorization
  // legible in one place and independent of a shared helper that two
  // other tables' policies also depend on.
  const { data: profile, error: profErr } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', uid)
    .maybeSingle();
  if (profErr) return json({ ok: false, error: `profile lookup failed: ${profErr.message}` }, 500);
  if (profile?.role !== 'admin') {
    return json({ ok: false, error: 'admin only' }, 403);
  }

  // ── Parse ──────────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'body must be JSON' }, 400);
  }

  const action = String(payload.action ?? '');
  const sourceKey = String(payload.source ?? '') as SourceKey;
  const source = SOURCES[sourceKey];
  if (!source) {
    return json(
      { ok: false, error: `unknown source`, allowed: Object.keys(SOURCES) },
      400
    );
  }

  const { table, platform, valueColumn } = source;
  const stamp = new Date().toISOString();

  // ── list ───────────────────────────────────────────────────────────
  if (action === 'list') {
    const rows: unknown[] = [];
    const CHUNK = 1000;
    for (let offset = 0; ; offset += CHUNK) {
      const { data, error } = await admin
        .from(table)
        .select(`id, store_id, ${valueColumn}, is_active, last_verified_at, conditions, stores(name)`)
        .eq('platform', platform)
        .range(offset, offset + CHUNK - 1);
      if (error) return json({ ok: false, error: error.message }, 500);
      if (!data?.length) break;
      rows.push(...data);
      if (data.length < CHUNK) break;
    }
    return json({ ok: true, source: { key: sourceKey, ...source }, count: rows.length, rows });
  }

  // ── save ───────────────────────────────────────────────────────────
  if (action === 'save') {
    const edits = Array.isArray(payload.edits) ? payload.edits : null;
    if (!edits || edits.length === 0) {
      return json({ ok: false, error: 'edits must be a non-empty array' }, 400);
    }
    if (edits.length > MAX_EDITS) {
      return json({ ok: false, error: `at most ${MAX_EDITS} edits per call` }, 400);
    }

    // Validate EVERYTHING before writing ANYTHING, so a typo in the last
    // row cannot leave the first half applied.
    const clean: { id: string; value: number }[] = [];
    for (const [i, e] of edits.entries()) {
      const id = String((e as Record<string, unknown>)?.id ?? '');
      const value = Number((e as Record<string, unknown>)?.value);
      if (!UUID_RE.test(id)) {
        return json({ ok: false, error: `edits[${i}]: not a uuid` }, 400);
      }
      if (!Number.isFinite(value)) {
        return json({ ok: false, error: `edits[${i}]: value is not a number` }, 400);
      }
      if (value < 0 || value > 100) {
        return json(
          { ok: false, error: `edits[${i}]: ${value} is outside 0–100` },
          400
        );
      }
      clean.push({ id, value });
    }

    // Each row is updated with BOTH `platform` and `id` in the filter.
    // The id alone would be enough, but carrying the platform means a
    // wrong id from the client cannot reach a row belonging to a source
    // this endpoint is not allowed to touch.
    const updated: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const { id, value } of clean) {
      const { data, error } = await admin
        .from(table)
        .update({ [valueColumn]: value, last_verified_at: stamp })
        .eq('id', id)
        .eq('platform', platform)
        .select('id');
      if (error) failed.push({ id, error: error.message });
      else if (!data?.length) failed.push({ id, error: 'no row for this id on this platform' });
      else updated.push(id);
    }

    return json({
      ok: failed.length === 0,
      action,
      source: sourceKey,
      verifiedAt: stamp,
      updated: updated.length,
      failed,
    });
  }

  // ── reconfirm ──────────────────────────────────────────────────────
  // "I have just looked at the source and these numbers are unchanged."
  if (action === 'reconfirm') {
    if (payload.confirm !== true) {
      return json(
        {
          ok: false,
          error:
            'reconfirm re-dates every active offer on this source without changing a rate. ' +
            'Send confirm: true only if you have actually just checked the source.',
        },
        400
      );
    }
    const { data, error } = await admin
      .from(table)
      .update({ last_verified_at: stamp })
      .eq('platform', platform)
      .eq('is_active', true)
      .select('id');
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({
      ok: true,
      action,
      source: sourceKey,
      verifiedAt: stamp,
      reconfirmed: data?.length ?? 0,
    });
  }

  // ── deactivate ─────────────────────────────────────────────────────
  // The offer is gone from the source. The row stays, so its history and
  // its last real verification date survive; it just stops being shown.
  if (action === 'deactivate') {
    const ids = Array.isArray(payload.ids) ? payload.ids.map(String) : null;
    if (!ids || ids.length === 0) {
      return json({ ok: false, error: 'ids must be a non-empty array' }, 400);
    }
    if (ids.length > MAX_EDITS) {
      return json({ ok: false, error: `at most ${MAX_EDITS} ids per call` }, 400);
    }
    const bad = ids.find((id) => !UUID_RE.test(id));
    if (bad) return json({ ok: false, error: `not a uuid: ${bad}` }, 400);

    const { data, error } = await admin
      .from(table)
      .update({ is_active: false })
      .in('id', ids)
      .eq('platform', platform)
      .select('id');
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({
      ok: true,
      action,
      source: sourceKey,
      deactivated: data?.length ?? 0,
    });
  }

  return json(
    { ok: false, error: 'unknown action', allowed: ['list', 'save', 'reconfirm', 'deactivate'] },
    400
  );
});
