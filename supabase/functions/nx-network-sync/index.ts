// nx-network-sync — refresh WHICH stores are in the NX Rewards network,
// and nothing else.
//
// This replaces `nx-sync`, which must not be scheduled. Three things
// were wrong with it, all verified against the live site on 2026-10-09:
//
//   1. It did not read rates. It carried a hand-typed PREMIUM_RATES map
//      from May 2026 and applied a flat 10% to everything else, then
//      stamped last_verified_at = now(). That hides staleness instead
//      of fixing it, which is worse than leaving the data alone.
//   2. Its extractor read merchant names out of <a> tags. There are 44
//      anchors on the All Retailers page and every one of them is
//      chrome — sign in, FAQ, cookies, terms. It therefore found zero
//      names, failed its own `live.length >= SEED/2` check, and fell
//      back to the May seed list silently, every single run.
//   3. It DELETEd all ~1,325 NX rows before re-inserting, outside a
//      transaction, so a failed insert loses the catalogue.
//
// What is actually on the public page (probed, not assumed):
//   * ~1,000 merchant names, each in its own
//       <div class="col-xs-6 col-md-3" data-action="edit-text">NAME</div>
//   * exactly ONE percentage in 151 KB of markup: "10%", the
//     network-wide guarantee. Per-store rates sit behind the sign-in
//     form on that same page.
//
// So this function refreshes membership and the guaranteed floor. It
// cannot refresh per-store rates and does not pretend to.
//
// Rules it follows:
//   * NEVER deletes. A store that leaves the network is deactivated,
//     so the row and its history survive.
//   * NEVER touches a rate above the floor. The 50 premium rows
//     (Lebara 100%, NordVPN 40%, …) keep both their rate AND their old
//     last_verified_at, because this run does not verify them. Marking
//     them fresh would be the same lie nx-sync told.
//   * ABORTS rather than falling back. Too few names parsed means the
//     markup changed; that is a signal to fix the parser, not to write
//     a guess.
//
// POST {} or {"dryRun": true} — dry run reports every change it would
// make and writes nothing. Run that first.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NX_URL = 'https://www.nxrewards.com/Home/AllRetailers/1173670';
const PLATFORM = 'NX Rewards';

// The guarantee, confirmed by the operator 2026-10-09 and the single
// percentage on the public page.
const NX_FLOOR = 10;

// The page carried ~1,000 names when last probed. Well under that means
// the markup moved and the parse is not to be trusted.
const MIN_PLAUSIBLE_NAMES = 500;

// One merchant per div. Verified against the live markup, not guessed.
const MERCHANT_RE =
  /<div\s+class="col-xs-6 col-md-3"\s+data-action="edit-text"\s*>([^<]{2,80})<\/div>/gi;

const NOISE_SUFFIXES = [
  'egift', 'gift card', 'giftcard', 'gift', 'card',
  'uk', 'ie', 'com', 'co uk', 'net', 'org',
  'ltd', 'limited', 'llc', 'inc', 'plc',
  'shop', 'store', 'online',
];

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/** Keys a name can be matched on: the whole thing, plus progressively
 *  shorter forms with trailing noise words removed. */
function keysFor(name: string): string[] {
  const out = new Set<string>();
  let s = decode(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return [];

  const squash = (x: string) => x.replace(/ /g, '');
  if (squash(s).length >= 2) out.add(squash(s));

  let changed = true;
  while (changed) {
    changed = false;
    s = s.replace(/\s*\d+\s*gbp$/i, '').trim();
    for (const suf of NOISE_SUFFIXES) {
      if (s.endsWith(' ' + suf)) {
        s = s.slice(0, -(suf.length + 1)).trim();
        changed = true;
      }
    }
    if (squash(s).length >= 2) out.add(squash(s));
  }
  return [...out];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let dryRun = false;
  try {
    const payload = await req.json().catch(() => ({}));
    dryRun = payload?.dryRun === true;
  } catch { /* empty body is a real run */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const report = {
    dryRun,
    namesParsed: 0,
    storesMatched: 0,
    floorRefreshed: 0,
    premiumPreserved: 0,
    inserted: 0,
    deactivated: 0,
    flagsSet: 0,
    flagsCleared: 0,
    samplePremiumPreserved: [] as { store: string; rate: number; verified: string | null }[],
    sampleInserted: [] as string[],
    sampleDeactivated: [] as string[],
    errors: [] as string[],
  };

  // ── 1. Read the network list ───────────────────────────────────────
  let html: string;
  try {
    const r = await fetch(NX_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnapGain/1.0)' },
    });
    if (!r.ok) return json({ ok: false, error: `NX returned HTTP ${r.status}`, report }, 502);
    html = await r.text();
  } catch (e) {
    return json({ ok: false, error: `fetch failed: ${String(e)}`, report }, 502);
  }

  const names = [
    ...new Set(
      [...html.matchAll(MERCHANT_RE)]
        .map(m => decode(m[1]).replace(/\s+/g, ' ').trim())
        .filter(n => n.length >= 2)
    ),
  ];
  report.namesParsed = names.length;

  if (names.length < MIN_PLAUSIBLE_NAMES) {
    return json(
      {
        ok: false,
        error:
          `parsed only ${names.length} merchant names, expected >= ${MIN_PLAUSIBLE_NAMES}. ` +
          `The markup has probably changed — fix the selector rather than writing this.`,
        report,
      },
      502
    );
  }

  const nxKeys = new Set<string>();
  for (const n of names) for (const k of keysFor(n)) nxKeys.add(k);

  // ── 2. Match against the store catalogue ───────────────────────────
  const CHUNK = 1000;
  const inNetwork = new Map<string, string>(); // store id -> store name
  const allStores: { id: string; name: string; in_nx_network: boolean | null }[] = [];
  for (let offset = 0; ; offset += CHUNK) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, in_nx_network')
      .range(offset, offset + CHUNK - 1);
    if (error) {
      report.errors.push(`stores ${offset}: ${error.message}`);
      break;
    }
    if (!data?.length) break;
    allStores.push(...data);
    for (const s of data) {
      if (keysFor(s.name).some(k => nxKeys.has(k))) inNetwork.set(s.id, s.name);
    }
    if (data.length < CHUNK) break;
  }
  report.storesMatched = inNetwork.size;

  // ── 3. Existing NX offers ──────────────────────────────────────────
  const existing = new Map<string, { id: string; rate: number; is_active: boolean; last_verified_at: string | null }>();
  for (let offset = 0; ; offset += CHUNK) {
    const { data, error } = await supabase
      .from('cashback_offers')
      .select('id, store_id, rate, is_active, last_verified_at')
      .eq('platform', PLATFORM)
      .range(offset, offset + CHUNK - 1);
    if (error) {
      report.errors.push(`offers ${offset}: ${error.message}`);
      break;
    }
    if (!data?.length) break;
    for (const o of data) {
      existing.set(o.store_id, {
        id: o.id,
        rate: Number(o.rate),
        is_active: o.is_active,
        last_verified_at: o.last_verified_at,
      });
    }
    if (data.length < CHUNK) break;
  }

  const now = new Date().toISOString();
  const toInsert: Record<string, unknown>[] = [];
  const toFloor: string[] = [];
  const toDeactivate: string[] = [];

  for (const [storeId, storeName] of inNetwork) {
    const cur = existing.get(storeId);
    if (!cur) {
      toInsert.push({
        store_id: storeId,
        platform: PLATFORM,
        rate: NX_FLOOR,
        is_active: true,
        last_verified_at: now,
      });
      if (report.sampleInserted.length < 10) report.sampleInserted.push(storeName);
      continue;
    }
    if (cur.rate > NX_FLOOR) {
      // Premium. This run did not verify it, so neither the rate nor
      // last_verified_at is touched.
      report.premiumPreserved++;
      if (report.samplePremiumPreserved.length < 10) {
        report.samplePremiumPreserved.push({
          store: storeName,
          rate: cur.rate,
          verified: cur.last_verified_at,
        });
      }
      continue;
    }
    toFloor.push(cur.id);
  }

  for (const [storeId, cur] of existing) {
    if (!inNetwork.has(storeId) && cur.is_active) {
      toDeactivate.push(cur.id);
      if (report.sampleDeactivated.length < 10) {
        const s = allStores.find(x => x.id === storeId);
        report.sampleDeactivated.push(s?.name ?? storeId);
      }
    }
  }

  report.inserted = toInsert.length;
  report.floorRefreshed = toFloor.length;
  report.deactivated = toDeactivate.length;
  report.flagsSet = [...inNetwork.keys()].filter(
    id => allStores.find(s => s.id === id)?.in_nx_network !== true
  ).length;
  report.flagsCleared = allStores.filter(
    s => s.in_nx_network === true && !inNetwork.has(s.id)
  ).length;

  if (dryRun) return json({ ok: true, wrote: false, report });

  // ── 4. Write ───────────────────────────────────────────────────────
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase.from('cashback_offers').insert(toInsert.slice(i, i + 500));
    if (error) report.errors.push(`insert ${i}: ${error.message}`);
  }
  for (let i = 0; i < toFloor.length; i += 500) {
    const { error } = await supabase
      .from('cashback_offers')
      .update({ rate: NX_FLOOR, is_active: true, last_verified_at: now })
      .in('id', toFloor.slice(i, i + 500));
    if (error) report.errors.push(`floor ${i}: ${error.message}`);
  }
  for (let i = 0; i < toDeactivate.length; i += 500) {
    const { error } = await supabase
      .from('cashback_offers')
      .update({ is_active: false })
      .in('id', toDeactivate.slice(i, i + 500));
    if (error) report.errors.push(`deactivate ${i}: ${error.message}`);
  }

  const ids = [...inNetwork.keys()];
  for (let i = 0; i < ids.length; i += 500) {
    const { error } = await supabase
      .from('stores')
      .update({ in_nx_network: true })
      .in('id', ids.slice(i, i + 500));
    if (error) report.errors.push(`flag ${i}: ${error.message}`);
  }
  const stale = allStores.filter(s => s.in_nx_network === true && !inNetwork.has(s.id)).map(s => s.id);
  for (let i = 0; i < stale.length; i += 500) {
    const { error } = await supabase
      .from('stores')
      .update({ in_nx_network: false })
      .in('id', stale.slice(i, i + 500));
    if (error) report.errors.push(`unflag ${i}: ${error.message}`);
  }

  return json({ ok: report.errors.length === 0, wrote: true, report });
});
