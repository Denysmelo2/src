#!/usr/bin/env node
// check-curated — every active curated strategy against today's rates.
//
// Handover 04/11/2026 "estratégias": the error of 04/11 (Amazon at 5%,
// typed by hand, when the real figure was £1 + 1%) must not come back
// unseen. The site now computes every strategy's return from today's
// rates (src/lib/curatedReturn.js); this script runs the same function
// against the live database and prints what each strategy shows today.
// The £ is the ranked total: the 1% card step is not in it (owner,
// 05/11/2026, option a) and is printed apart.
//
// It exits 1 when a strategy that is in the ranking (playbook_only
// false) cannot be computed: a live step with no rate in the last 30
// days (the site hides it), or a step whose `store_slug` names no store.
// Playbook-only strategies are listed but never fail the check.
//
// Usage (read-only, public key):
//   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… node scripts/check-curated.mjs [amount]

import { computeCuratedLive, curatedGbp, liveStepKind, stepStoreSlugs } from '../src/lib/curatedReturn.js';
import { hiddenBeforeIso } from '../src/lib/dataFreshness.js';

const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const AMOUNT = Number(process.argv[2]) || 100;
if (!URL_ || !KEY) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (the public key).');
  process.exit(2);
}

async function rest(path) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${path.split('?')[0]}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}
const inList = (xs) => `(${xs.map((x) => `"${x}"`).join(',')})`;

const strategies = await rest(
  'curated_strategies?select=slug,title,playbook_only,target_store_id,applicable_store_ids,steps&is_active=eq.true&order=playbook_only,display_order'
);

// Every store a live step can read: named slugs, targets, applicable stores.
const slugs = stepStoreSlugs(strategies);
const ids = new Set();
for (const s of strategies) {
  if (s.target_store_id) ids.add(s.target_store_id);
  for (const id of s.applicable_store_ids || []) ids.add(id);
}
const ors = [];
if (ids.size) ors.push(`id.in.${inList([...ids])}`);
if (slugs.length) ors.push(`slug.in.${inList(slugs)}`);
const stores = ors.length ? await rest(`stores?select=id,slug,name&or=(${ors.join(',')})`) : [];
const storesById = new Map(stores.map((s) => [s.id, s]));
const storesBySlug = new Map(stores.map((s) => [s.slug, s]));

const cutoff = encodeURIComponent(hiddenBeforeIso());
const storeIds = [...storesById.keys()];
const byStore = (rows) => {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.store_id)) m.set(r.store_id, []);
    m.get(r.store_id).push(r);
  }
  return m;
};
let giftCards = new Map();
let cashback = new Map();
if (storeIds.length) {
  const q = `store_id=in.${inList(storeIds)}&is_active=eq.true&last_verified_at=gte.${cutoff}`;
  giftCards = byStore(await rest(`gift_card_offers?select=store_id,platform,discount_pct,last_verified_at&${q}`));
  cashback = byStore(await rest(`cashback_offers?select=store_id,platform,rate,last_verified_at&${q}`));
}

const problems = [];
console.log(`Curated strategies on £${AMOUNT}, rates verified since ${decodeURIComponent(cutoff).slice(0, 10)}:\n`);
for (const s of strategies) {
  const steps = Array.isArray(s.steps) ? s.steps : [];
  for (const st of steps) {
    if (liveStepKind(st) && st.store_slug && !storesBySlug.has(st.store_slug)) {
      problems.push(`${s.slug}: step "${st.title}" names store_slug "${st.store_slug}", which does not exist`);
    }
  }
  // A strategy for many stores is checked at each of them.
  const contexts = s.target_store_id ? [s.target_store_id] : (s.applicable_store_ids || []).length ? s.applicable_store_ids : [null];
  const rows = contexts.map((contextStoreId) => {
    const live = computeCuratedLive(s, { contextStoreId, storesById, storesBySlug, giftCards, cashback });
    return { contextStoreId, live };
  });
  const ok = rows.filter((r) => r.live.missing.length === 0);
  const r0 = ok[0] || rows[0];
  const gbp = curatedGbp(r0.live, AMOUNT);
  const where = r0.contextStoreId ? storesById.get(r0.contextStoreId)?.name || r0.contextStoreId : '—';
  const flag = s.playbook_only ? 'playbook' : ok.length === rows.length ? 'ok' : ok.length ? 'partly hidden' : 'HIDDEN';
  console.log(
    `${flag.padEnd(13)} ${s.slug.padEnd(28)} ${(gbp == null ? '—' : `£${gbp.toFixed(2)}`).padStart(8)}  ` +
      `${r0.live.label || '(no number)'}` +
      `${r0.live.cardPct ? `  (+ ${r0.live.cardPct}% card, shown apart, not ranked)` : ''}${rows.length > 1 ? `  [${ok.length}/${rows.length} stores, e.g. ${where}]` : ''}`
  );
  if (!s.playbook_only && ok.length < rows.length) {
    const miss = rows.find((r) => r.live.missing.length);
    problems.push(
      `${s.slug}: no rate today for "${miss.live.missing.join('", "')}"` +
        (miss.contextStoreId ? ` at ${storesById.get(miss.contextStoreId)?.name || miss.contextStoreId}` : '') +
        ` (${rows.length - ok.length} of ${rows.length} store(s)); the site hides it there`
    );
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.error(`- ${p}`));
  process.exit(1);
}
console.log('\nAll ranked strategies have today\'s rates.');
