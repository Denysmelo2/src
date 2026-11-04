// rankRoutes — order of the route boxes on /compare (handover 04/11/2026
// "estratégias", task 5).
//
// Highest £ first. On a tie (within half a penny) the automatic route
// wins over a curated one: it is the simpler way to the same money
// (owner, 04/11/2026). Before, the curated card won only because it was
// put in the list first, so Sainsbury's showed "NX or Avios — which pays
// more" above the plain "NX Rewards 10%" at the same £10.
//
// Pure; tests/rankRoutes.test.js runs it under plain Node.

const TIE_GBP = 0.005;

export function rankRoutes(items) {
  return (items || [])
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      const diff = (Number(b.item.gbpReturn) || 0) - (Number(a.item.gbpReturn) || 0);
      if (Math.abs(diff) >= TIE_GBP) return diff;
      const curated = (x) => (x.item.source === 'curated' ? 1 : 0);
      return curated(a) - curated(b) || a.i - b.i;
    })
    .map((x) => x.item);
}

/**
 * Curated "compare" cards (live_compare: Sainsbury's, Boots, Deliveroo)
 * are the comparison of the automatic routes, not a route of their own:
 * they never enter the ranking and carry no £ of their own.
 */
export function splitCurated(curated) {
  const ranked = [];
  const compare = [];
  for (const c of curated || []) (c.live_compare ? compare : ranked).push(c);
  return { ranked, compare };
}
