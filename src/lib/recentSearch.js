// recentSearch — what a comparison writes to "Recent searches" (owner's
// tests 21/11/2026, C5). Only the search page wrote there, and almost
// everyone compares from /compare, so the list stayed empty. A store
// opened on /compare now writes "Currys · £100" (recent_searches.query
// has one text column); the Dashboard reads it back to link to that
// comparison again.
//
// Pure, no imports from '@/': tests/recentSearch.test.js.

const SEP = ' · £';

/** "Currys · £100", or just "Currys" without an amount. */
export function recentQuery(name, amount) {
  const n = String(name || '').trim();
  if (!n) return '';
  const a = Number(amount);
  if (!(a > 0)) return n;
  return `${n}${SEP}${Number.isInteger(a) ? a : a.toFixed(2)}`;
}

/** "Currys · £100" -> { name: 'Currys', amount: '100' }; plain text -> { name, amount: null }. */
export function parseRecent(query) {
  const q = String(query || '');
  const i = q.lastIndexOf(SEP);
  if (i > 0 && /^\d+(\.\d+)?$/.test(q.slice(i + SEP.length))) return { name: q.slice(0, i), amount: q.slice(i + SEP.length) };
  return { name: q, amount: null };
}

/** Where a recent search goes back to: the search page with the amount. */
export function recentHref(query) {
  const { name, amount } = parseRecent(query);
  const p = new URLSearchParams();
  if (name) p.set('q', name);
  if (amount) p.set('amount', amount);
  const qs = p.toString();
  return qs ? `/search?${qs}` : '/search';
}
