// curatedReturn — what a curated strategy pays TODAY, from today's rates.
//
// Owner's call (handover 04/11/2026 "estratégias", task 4): no strategy
// shows a fixed number any more. Until then `hero_return_pct` was typed
// by hand (mostly on 16/09) and ranked against routes that update every
// day: Amazon showed 5% when the real figure was £1 + 1%.
//
// How a strategy's return is built, step by step (`steps` jsonb):
//   * a gift-card step (platform EverUp, Cheddar or JamDoughnut, or
//     `rate_source: "gift_card"`) takes the BEST active gift-card
//     discount today for its store, across all gift-card platforms;
//   * a cashback step (NX Rewards, Quidco, Rakuten, TopCashback, or
//     `rate_source: "cashback"`) takes that platform's active rate today
//     for its store;
//   * the store of a live step is `store_slug` on the step (Amazon via a
//     Currys gift card: "currys"), else the store being looked at, else
//     the strategy's target store;
//   * a card step (`platform_slug: "credit_card"`) does NOT count in the
//     return: owner's decision of 05/11/2026 (option a). It is reported
//     as `cardPct` and shown as an extra line, the same on every route
//     paid by card, so it never changes the ranking;
//   * any other step with `earn_pct` (Ribbon) counts as written: it is
//     not a rate anyone publishes;
//   * `earn_flat_gbp` on a step is a fixed amount per order (Rakuten's
//     £1 on Amazon);
//   * `rate_source: "fixed"` on a step forces it to count as written.
// "Active today" means is_active and verified in the last 30 days, the
// same rule as every other offer on the site (hiddenBeforeIso). A live
// step with no such rate makes the whole strategy unavailable: the
// caller hides it instead of showing an old number.
//
// Pure functions, no imports from '@/': tests/curatedReturn.test.js runs
// them under plain Node.

const GIFT_CARD_PLATFORMS = new Set(['everup', 'cheddar', 'jamdoughnut']);
const CASHBACK_PLATFORMS = new Set(['nxrewards', 'nx', 'quidco', 'rakuten', 'topcashback']);
const LABELS = {
  everup: 'EverUp',
  cheddar: 'Cheddar',
  jamdoughnut: 'JamDoughnut',
  nxrewards: 'NX Rewards',
  nx: 'NX Rewards',
  quidco: 'Quidco',
  rakuten: 'Rakuten',
  topcashback: 'TopCashback',
};

export const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const label = (platform) => LABELS[norm(platform)] || String(platform || '');
const round2 = (n) => Math.round(n * 100) / 100;
const fmtPct = (n) => `${round2(n)}%`;
const fmtGbp = (n) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** A "pay with a card that earns 1%" step. */
export const isCardStep = (step) => norm(step?.platform_slug) === 'creditcard';

/** 'gift_card', 'cashback' or null (counts as written). */
export function liveStepKind(step) {
  if (!step) return null;
  if (step.rate_source === 'fixed') return null;
  if (step.rate_source === 'gift_card' || step.rate_source === 'cashback') return step.rate_source;
  if (step.earn_pct == null) return null;
  const p = norm(step.platform_slug);
  if (GIFT_CARD_PLATFORMS.has(p)) return 'gift_card';
  if (CASHBACK_PLATFORMS.has(p)) return 'cashback';
  return null;
}

/** Store slugs the steps name explicitly (to look up their ids). */
export function stepStoreSlugs(strategies) {
  const out = new Set();
  for (const s of strategies || []) {
    for (const step of Array.isArray(s.steps) ? s.steps : []) {
      if (liveStepKind(step) && step.store_slug) out.add(step.store_slug);
    }
  }
  return [...out];
}

/** The store id a live step reads its rate for, or null. */
function stepStoreId(step, strategy, ctx) {
  if (step.store_slug) return ctx.storesBySlug?.get(step.store_slug)?.id ?? null;
  return ctx.contextStoreId || strategy.target_store_id || null;
}

/**
 * The strategy's return today.
 *
 * ctx = {
 *   contextStoreId,            // the store being looked at, if any
 *   storesBySlug: Map<slug, {id, name, slug}>,
 *   storesById:   Map<id, {id, name, slug}>,
 *   giftCards:    Map<storeId, [{platform, discount_pct, last_verified_at}]>,
 *   cashback:     Map<storeId, [{platform, rate, last_verified_at}]>,
 * }
 * Offers in ctx must already be active and verified in the last 30 days.
 *
 * Returns {
 *   pct,         // sum of the percentage steps (card excluded), or null
 *   cardPct,     // the card step's %, shown apart, never ranked
 *   liveParts,   // [{kind, platform, value}] per live step
 *   flatGbp,     // sum of the fixed £ per order
 *   isLive,      // at least one step reads a rate from the tables
 *   verifiedAt,  // oldest last_verified_at among the live steps
 *   missing,     // live steps with no rate today (non-empty = hide)
 *   parts,       // [{text}] for the breakdown label
 *   label,       // "Currys gift card 6.5% (Cheddar) + 1% card"
 * }
 */
export function computeCuratedLive(strategy, ctx = {}) {
  const steps = Array.isArray(strategy?.steps) ? strategy.steps : [];
  let pct = 0;
  let hasPct = false;
  let cardPct = 0;
  const liveParts = [];
  let flatGbp = 0;
  let isLive = false;
  let oldest = null;
  const missing = [];
  const parts = [];

  for (const step of steps) {
    const kind = liveStepKind(step);
    if (kind) {
      isLive = true;
      const storeId = stepStoreId(step, strategy, ctx);
      const store = storeId ? ctx.storesById?.get(storeId) : null;
      let best = null;
      if (storeId && kind === 'gift_card') {
        for (const o of ctx.giftCards?.get(storeId) || []) {
          const d = Number(o.discount_pct);
          if (d > 0 && (!best || d > best.value)) best = { value: d, platform: o.platform, at: o.last_verified_at };
        }
      } else if (storeId && kind === 'cashback') {
        const want = norm(step.platform_slug || step.platform);
        const wantNx = want === 'nx' || want === 'nxrewards';
        for (const o of ctx.cashback?.get(storeId) || []) {
          const p = norm(o.platform);
          const same = wantNx ? p === 'nx' || p === 'nxrewards' : p === want;
          const r = Number(o.rate);
          if (same && r > 0 && (!best || r > best.value)) best = { value: r, platform: o.platform, at: o.last_verified_at };
        }
      }
      if (!best) {
        missing.push(step.title || `step ${step.step ?? ''}`.trim());
        continue;
      }
      pct += best.value;
      hasPct = true;
      liveParts.push({ kind, platform: norm(best.platform), value: best.value });
      if (best.at && (!oldest || new Date(best.at) < new Date(oldest))) oldest = best.at;
      parts.push({
        text:
          kind === 'gift_card'
            ? `${store?.name ? `${store.name} gift card` : 'Gift card'} ${fmtPct(best.value)} (${label(best.platform)})`
            : `${label(best.platform)} ${fmtPct(best.value)}`,
      });
    } else if (step.earn_pct != null && Number(step.earn_pct) > 0) {
      const v = Number(step.earn_pct);
      if (isCardStep(step)) {
        cardPct += v;
      } else {
        pct += v;
        hasPct = true;
        parts.push({ text: `${step.platform || 'Step'} ${fmtPct(v)}` });
      }
    }
    if (step.earn_flat_gbp != null && Number(step.earn_flat_gbp) > 0) {
      const f = Number(step.earn_flat_gbp);
      flatGbp += f;
      parts.unshift({ text: `${fmtGbp(f)} per order${step.platform ? ` (${step.platform})` : ''}` });
    }
  }

  return {
    pct: hasPct ? round2(pct) : null,
    cardPct: round2(cardPct),
    liveParts,
    flatGbp: round2(flatGbp),
    isLive,
    verifiedAt: isLive && missing.length === 0 ? oldest : null,
    missing,
    parts,
    label: parts.map((p) => p.text).join(' + '),
  };
}

/** £ for a purchase of `amount`, or null when nothing is known. */
export function curatedGbp(live, amount) {
  if (!live || (live.pct == null && !live.flatGbp)) return null;
  return round2(((live.pct || 0) / 100) * (Number(amount) || 0) + (live.flatGbp || 0));
}

/**
 * The extra card line: "+ ~£1.00 if you pay with a 1% card (or 100
 * points)" for a purchase of `amount`, or null when `pct` is 0.
 */
export function cardLine(pct, amount) {
  const p = Number(pct) || 0;
  const a = Number(amount) || 0;
  if (p <= 0 || a <= 0) return null;
  const gbp = (p / 100) * a;
  // Points cards earn about 1 point per £1 spent.
  return `+ ~£${gbp.toFixed(2)} if you pay with a ${fmtPct(p)} card (or ${Math.round(a).toLocaleString('en-GB')} points)`;
}

/** The big number on a card: "6.5%", "£1", or null. */
export function curatedHeadline(live) {
  if (!live) return null;
  const bits = [];
  if (live.pct != null) bits.push(fmtPct(live.pct));
  if (live.flatGbp) bits.push(fmtGbp(live.flatGbp));
  return bits.length ? bits.join(' + ') : null;
}
