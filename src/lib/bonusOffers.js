// bonusOffers — which fixed "N Avios per order" bonuses become routes
// (handover 14/11/2026, task D).
//
// The Avios eStore pays Sainsbury's Grocery a fixed bonus that depends on
// who you are and where you order: on 14/11, 2,400 Avios for a new
// customer in the app, 2,160 for a new customer on the website, 288 for
// an existing customer. /compare does not ask who the visitor is, so it
// listed every bonus, and the top two routes were the same new-customer
// offer in two channels (£22.08 and £19.87).
//
// Without a context: one route per programme and customer type, the best
// channel, with the other channels kept for a detail line. With a context
// (the store page asks new/existing and web/app): only the bonuses that
// match it, the best one per programme, as before.
//
// Pure functions, no imports from '@/': tests/bonusOffers.test.js runs
// them under plain Node.

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const WHO = { new: 'new customers only', existing: 'existing customers' };
const WHERE = { web: 'website', app: 'app' };

/** True when `bonus` applies to `context` ({customerType, channel}). */
export function matchesContext(bonus, context) {
  if (!context) return true;
  return (
    (bonus.customer_type === 'any' || bonus.customer_type === context.customerType) &&
    (bonus.channel === 'any' || bonus.channel === context.channel)
  );
}

/**
 * Bonuses to show as routes. `reachable` are the bonuses whose minimum
 * spend the order meets (and that match the context, if any).
 * Returns [{ bonus, otherChannels: [{channel, points}], existingPoints }]:
 *   * otherChannels: the same programme and customer type in another
 *     channel (no context only), best first;
 *   * existingPoints: on a new-customer route, what an existing customer
 *     gets from the same programme, or null.
 */
export function pickBonuses(reachable, { context = null } = {}) {
  const list = Array.isArray(reachable) ? reachable : [];
  const groupKey = (b) => (context ? String(b.airline) : `${b.airline}|${b.customer_type || 'any'}`);
  const groups = new Map();
  for (const b of list) {
    const k = groupKey(b);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  const out = [];
  for (const items of groups.values()) {
    const sorted = [...items].sort((a, b) => num(b.bonus_points) - num(a.bonus_points));
    const best = sorted[0];
    const otherChannels = context
      ? []
      : sorted
          .slice(1)
          .filter((b) => b.channel !== best.channel)
          .map((b) => ({ channel: b.channel, points: num(b.bonus_points) }));
    let existingPoints = null;
    if (best.customer_type === 'new') {
      const existing = list
        .filter((b) => b.airline === best.airline && b.customer_type === 'existing')
        .sort((a, b) => num(b.bonus_points) - num(a.bonus_points))[0];
      if (existing) existingPoints = num(existing.bonus_points);
    }
    out.push({ bonus: best, otherChannels, existingPoints });
  }
  return out;
}

/**
 * The route's subtitle, e.g.
 *   "2,400 Avios per order (new customers only · app · min £50) ·
 *    website: 2,160 · existing customers: 288"
 */
export function bonusSubtitle({ bonus, otherChannels = [], existingPoints = null }, unit = 'Avios') {
  const points = num(bonus.bonus_points);
  const minSpend = num(bonus.min_spend);
  const conditions = [
    WHO[bonus.customer_type],
    WHERE[bonus.channel],
    minSpend > 0 ? `min £${minSpend}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const extras = [
    ...otherChannels
      .filter((o) => WHERE[o.channel])
      .map((o) => `${WHERE[o.channel]}: ${o.points.toLocaleString('en-GB')}`),
    existingPoints != null ? `existing customers: ${existingPoints.toLocaleString('en-GB')}` : null,
  ].filter(Boolean);
  return (
    `${points.toLocaleString('en-GB')} ${unit} per order${conditions ? ` (${conditions})` : ''}` +
    (extras.length ? ` · ${extras.join(' · ')}` : '')
  );
}
