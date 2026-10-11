// dataFreshness — how old is the number we are about to show a user?
//
// Every rate on this site comes from an ingestion run that stamps
// `last_verified_at` on the offer row. That column was already being
// selected, mapped through `computeStrategies` and then dropped on the
// floor: the UI rendered a rate verified today and a rate verified in
// May 2026 in exactly the same type, with nothing to tell them apart.
// The audit of 2026-10-09 found five of eleven sources between 95 and
// 143 days stale, so that was not a theoretical problem.
//
// Thresholds match `ops.data_freshness` (migration 0006) deliberately:
// the monitor and the UI should not disagree about what "late" means.
// Both are calibrated to the cadence the pipeline actually has — bulk
// runs roughly every six days — not to the daily one it was assumed to
// have.
//
// Nothing here hides a number or changes a ranking. It only labels.

/** At or under this many days, the figure is as fresh as the pipeline gets. */
export const FRESH_DAYS = 8;
/** Past this, the figure should be treated as unreliable. */
export const STALE_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * The verification date of a whole route.
 *
 * A stack is only as current as its stalest input: a 7.8% gift-card
 * discount checked this morning stacked on a cashback rate last seen in
 * May is a May number. So this returns the OLDEST timestamp across the
 * layers, not the newest.
 *
 * Returns null — "we don't know" — when ANY layer lacks a usable
 * timestamp, not only when all of them do. A layer with no date is not
 * a layer that is fine; falling back to the dated sibling would report
 * a two-platform route as "checked 5 days ago" on the strength of half
 * of it, which is the same flattery this module exists to remove.
 * There are no such rows today (every active offer carries a date), but
 * the function should not start lying the day one appears.
 */
export function oldestVerifiedAt(layers) {
  if (!Array.isArray(layers) || layers.length === 0) return null;
  let oldest = null;
  let oldestMs = Infinity;
  for (const layer of layers) {
    const iso = layer?.lastVerifiedAt;
    if (!iso) return null;
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return null;
    if (ms < oldestMs) {
      oldestMs = ms;
      oldest = iso;
    }
  }
  return oldest;
}

/**
 * Turn a timestamp into something sayable.
 *
 * `state` is for styling: 'unknown' | 'fresh' | 'late' | 'stale'.
 * `label` is the short line next to the rate. `title` is the tooltip,
 * which carries the actual date so a sceptical user can check it.
 *
 * `now` is injectable so this is testable and so a single render pass
 * uses one clock for every card.
 */
export function describeAge(iso, now = Date.now()) {
  if (!iso) {
    return {
      iso: null,
      days: null,
      state: 'unknown',
      label: 'Verification date unknown',
      title:
        'This rate has no verification date recorded, so we cannot tell you how current it is. Confirm it on the provider’s site before you buy.',
    };
  }

  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return describeAge(null, now);

  // Floor, not round: a figure checked 47 hours ago is "1 day ago", not
  // "2 days ago". Rounding up ages data that is fine; rounding down a
  // whole day would flatter data that is not.
  const days = Math.max(0, Math.floor((now - then) / DAY_MS));

  let label;
  if (days === 0) label = 'Verified today';
  else if (days === 1) label = 'Verified yesterday';
  else label = `Verified ${days} days ago`;

  const state =
    days <= FRESH_DAYS ? 'fresh' : days <= STALE_DAYS ? 'late' : 'stale';

  const when = new Date(then).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const title =
    state === 'stale'
      ? `Last verified ${when}. That is over ${STALE_DAYS} days ago — the provider has very likely changed this rate since. Check it on their site before you buy.`
      : state === 'late'
        ? `Last verified ${when}. Our usual refresh is every few days, so this one is overdue — worth confirming on the provider’s site.`
        : `Last verified ${when}.`;

  return { iso, days, state, label, title };
}

/** Tailwind classes per state, so the three call sites agree. */
export const AGE_CLASS = {
  unknown: 'text-muted-foreground',
  fresh: 'text-muted-foreground',
  late: 'text-amber-700',
  stale: 'text-red-700 font-medium',
};
