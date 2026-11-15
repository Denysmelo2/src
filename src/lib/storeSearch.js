// storeSearch — the order of store search results (handover 14/11/2026,
// task E).
//
// 2,418 of the 7,144 active stores had no valid offer, and the search put
// them level with the others: "John Lewis" showed an empty store next to
// "John Lewis & Partners" (NX, Cheddar, Avios); "Booking" two Booking.com
// rows; Next and Zara empty since Picodi left. Nothing is hidden or
// changed in the data (the Cowork does not switch stores off in bulk):
// stores with a live offer come first, the others after them, marked
// "No offers yet" by the caller.
//
// "Live" is the site's own rule: an active offer verified in the last 30
// days (lib/dataFreshness.js hiddenBeforeIso), in any of cashback, gift
// card, points or fixed-bonus offers. hooks/useCatalog.js useLiveStoreIds
// reads it for the stores shown.
//
// Pure functions, no imports from '@/': tests/storeSearch.test.js runs
// them under plain Node.

/** 0 exact, 1 starts with, 2 contains, -1 no match (case-insensitive). */
export function matchTier(name, query) {
  const n = String(name || '').toLowerCase();
  const q = String(query || '').trim().toLowerCase();
  if (!q) return -1;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  return -1;
}

/**
 * Stores that match `query`, best first:
 *   1. a live offer (only when `live`, a Set of store ids, is known);
 *   2. exact name, then starts with, then contains;
 *   3. name.
 * With `live` null (still loading), only 2 and 3 apply.
 * `{ matchOnly: false }` keeps every store (the query is already applied,
 * e.g. by the database) and only orders them.
 */
export function rankStores(stores, query, live = null, { matchOnly = true } = {}) {
  const list = (Array.isArray(stores) ? stores : [])
    .map((s) => ({ s, tier: matchTier(s.name, query) }))
    .filter((x) => !matchOnly || x.tier >= 0);
  const liveRank = (s) => (live instanceof Set ? (live.has(s.id) ? 0 : 1) : 0);
  list.sort(
    (a, b) =>
      liveRank(a.s) - liveRank(b.s) ||
      (a.tier < 0 ? 9 : a.tier) - (b.tier < 0 ? 9 : b.tier) ||
      String(a.s.name || '').localeCompare(String(b.s.name || ''))
  );
  return list.map((x) => x.s);
}

/**
 * Near-duplicate names ("Sainsbury's Groceries" / "Sainsbury's Grocery",
 * "The X" / "X") share a key; the search shows only the first of each.
 * Run it after rankStores, so the row with a live offer is the one kept.
 */
export function nameKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['’‘`"]/g, '')
    .replace(/^the\s+/, '')
    .replace(/\s+/g, ' ')
    .replace(/s$/, '')
    .trim();
}

export function dedupeByName(stores) {
  const seen = new Set();
  const out = [];
  for (const s of stores || []) {
    const k = nameKey(s.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/** True when the store is known to have no live offer (`live` loaded). */
export function hasNoOffers(store, live) {
  return live instanceof Set && !live.has(store?.id);
}
