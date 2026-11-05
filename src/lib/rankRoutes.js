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

const normP = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A curated route that is only a copy of an automatic one (handover
 * 05/11/2026, task 6): one live step, nothing else counted (no fixed £,
 * no written %), and an automatic route of the same kind on the same
 * platform paying the same £. Uber's "gift card + card" is Cheddar 4.5%
 * once the card is out of the total, the same as the automatic Cheddar
 * route. Such a curated route leaves the ranking and rides along with the
 * automatic one as its step-by-step guide (`guide`), so the same route
 * never shows twice.
 *
 * Items are /compare route items: curated ones carry `curated.live`
 * (lib/curatedReturn.js), automatic ones carry `strategy` (lib/strategies).
 * Returns { curated, auto } with copies removed from `curated` and
 * attached to their twin in `auto`.
 */
export function mergeCopies(curatedItems, autoItems) {
  const auto = (autoItems || []).map((a) => ({ ...a }));
  const kept = [];
  for (const c of curatedItems || []) {
    const live = c.curated?.live;
    const part = live?.liveParts?.length === 1 ? live.liveParts[0] : null;
    const onlyThatStep = part && !live.flatGbp && Number(live.pct) === Number(part.value);
    const twin =
      onlyThatStep &&
      auto.find(
        (a) =>
          !a.guide &&
          a.strategy?.type === part.kind &&
          normP(a.strategy?.layers?.[0]?.platform) === part.platform &&
          Math.abs((Number(a.gbpReturn) || 0) - (Number(c.gbpReturn) || 0)) < TIE_GBP
      );
    if (twin) twin.guide = c.curated;
    else kept.push(c);
  }
  return { curated: kept, auto };
}
