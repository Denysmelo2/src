/**
 * SnapGain — strategy computation engine.
 *
 * Pure functions. Given a store + purchase amount + the offers we have on
 * file (cashback, points) + miles program metadata (for points → £
 * conversion), produces a ranked list of strategies the user can execute,
 * each with an estimated GBP return.
 *
 * Stacking strategies (cashback × gift card × card × bank-offer) come in a
 * later iteration — for now this is a flat per-route list which is the most
 * common case and mirrors the original mock data shape.
 */

import { getAffiliateLink, resolveOpenUrl } from '@/lib/affiliateLinks';

const POINT_LABELS_BY_PROGRAM = [
  { match: /avios/i, unit: 'Avios' },
  { match: /virgin/i, unit: 'Virgin Points' },
  { match: /flying ?blue/i, unit: 'Flying Blue miles' },
  { match: /skywards/i, unit: 'Skywards miles' },
  { match: /etihad/i, unit: 'Etihad Guest miles' },
  { match: /nectar/i, unit: 'Nectar pts' },
  { match: /amex|membership/i, unit: 'MR points' },
];

function pointUnitLabel(programName) {
  const hit = POINT_LABELS_BY_PROGRAM.find((row) => row.match.test(programName || ''));
  return hit ? hit.unit : 'points';
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** "3–10%" for a cashback layer with a range, "5%" otherwise. */
export function cashbackPctText(layer) {
  return layer?.ratePctMax != null
    ? `${layer.ratePct}–${layer.ratePctMax}%`
    : `${layer?.ratePct ?? 0}%`;
}

/** "£3.00–£10.00" when the top of a range differs, "£3.00" otherwise. */
function gbpText(low, high) {
  return high != null && high > low
    ? `£${low.toFixed(2)}–£${high.toFixed(2)}`
    : `£${low.toFixed(2)}`;
}

/**
 * NX Rewards guarantees a minimum 10% rebate on every retailer in its
 * network — but actual rates vary by store (Avis 12%, others 10%, etc.).
 *
 * PAUSED 2026-05-18: the flat 10% synthetic was overriding real per-
 * store rates that we'll eventually scrape from cashback.nxrewards.com.
 * Until we have a proper NX scraper, this returns the list untouched
 * so the only NX rows the app shows are the ones admins enter manually
 * in cashback_offers. Re-enable by flipping NX_SYNTHETIC_ENABLED.
 */
export const NX_PLATFORM_NAME = 'NX Rewards';
export const NX_FLOOR_PCT = 10;
const NX_SYNTHETIC_ENABLED = false;

export function withSyntheticNxOffer(cashbackOffers, store) {
  const list = cashbackOffers || [];
  if (!NX_SYNTHETIC_ENABLED) return list;
  if (!store?.in_nx_network) return list;
  const alreadyHasNx = list.some(
    (o) => String(o.platform || '').toLowerCase().includes('nx')
  );
  if (alreadyHasNx) return list;
  return [
    ...list,
    {
      id: store?.id ? `synthetic-nx-${store.id}` : 'synthetic-nx',
      store_id: store?.id,
      platform: NX_PLATFORM_NAME,
      rate: NX_FLOOR_PCT,
      affiliate_link: null,
      last_verified_at: null,
      synthetic: true,
    },
  ];
}

/**
 * Compute ranked strategies for a store + amount.
 *
 * Generates flat per-route strategies AND multi-layer "stack" strategies
 * (gift_card × cashback, gift_card × points). Stacks are ranked alongside
 * single routes by total £ return so the best route — be it flat or
 * stacked — surfaces at the top.
 *
 * @param {object} args
 * @param {object} [args.store]            { id, slug, name, ... }
 * @param {number} args.amount             Purchase amount in £
 * @param {Array}  args.cashbackOffers     rows from public.cashback_offers
 * @param {Array}  args.pointOffers        rows from public.point_offers
 * @param {Array}  [args.giftCardOffers]   rows from public.gift_card_offers
 * @param {Array}  args.milesPrograms      rows from public.miles_programs (has conversion_rate)
 * @param {object} [args.userWallet]       { cashbackPlatformNames: Set<string>, milesProgramNames: Set<string> }
 * @param {boolean} [args.includeStacks=true]  When false, only flat per-route
 *                                              strategies are returned (gates the
 *                                              stacking feature behind premium).
 * @returns {Array<object>} Strategies sorted by gbpReturn desc.
 */
export function computeStrategies({
  store,
  amount,
  cashbackOffers = [],
  pointOffers = [],
  giftCardOffers = [],
  milesPrograms = [],
  userWallet = null,
  includeStacks = true,
}) {
  const out = [];
  const numAmount = safeNumber(amount, 0);

  // Real DB rows take precedence over the synthetic NX entry — see
  // withSyntheticNxOffer above for the full rationale.
  const cashbackOffersWithNx = withSyntheticNxOffer(cashbackOffers, store);

  let cashbackToUse = cashbackOffersWithNx;
  let pointsToUse = pointOffers;
  // Gift card platforms aren't user-scoped — anyone can use JamDoughnut etc.

  if (userWallet) {
    const cb = userWallet.cashbackPlatformNames;
    const mp = userWallet.milesProgramNames;
    if (cb instanceof Set) {
      // Filter on the NX-augmented list so the synthetic 10% offer is
      // still visible when the user has NX in their wallet.
      cashbackToUse = cashbackOffersWithNx.filter((o) => cb.has(o.platform));
    }
    if (mp instanceof Set) {
      pointsToUse = pointOffers.filter((o) => mp.has(o.airline));
    }
  }

  // Platform-specific cashback floors. NX Rewards guarantees a minimum
  // 10% rebate on every retailer, regardless of the listed base rate —
  // so any NX offer must be lifted to at least 10% before ranking.
  const CASHBACK_FLOOR_PCT = {
    'nx rewards': 10,
    'nxrewards': 10,
    'nx': 10,
  };
  const cashbackFloor = (platform) => {
    if (!platform) return 0;
    return CASHBACK_FLOOR_PCT[String(platform).trim().toLowerCase()] || 0;
  };

  // Helper: build the cashback layer object
  const cashbackLayer = (o) => {
    const raw = safeNumber(o.rate, 0);
    const floor = cashbackFloor(o.platform);
    // Pass through the multi-tier breakdown so the UI can disclose
    // it on the route card. TopCashback stores e.g. {Online: 30%,
    // Brand Hub: 1%} — the "30%" headline is misleading without the
    // sub-rates.
    const rateBreakdown = Array.isArray(o.rate_breakdown) ? o.rate_breakdown : null;
    const isUpTo =
      o.conditions === 'Up to' ||
      (rateBreakdown && rateBreakdown.length > 1);
    // The rate column holds the TOP of the breakdown (Boots on Quidco:
    // 10% for GHD only, 6% new customers, 3% everyone else). Owner's
    // call (18/10/2026): rank and total by the lowest tier, the one
    // anyone gets, and show the range. A plain "Up to X%" with no
    // breakdown has no known lower tier, so it keeps its one rate.
    const tierRates = (rateBreakdown || [])
      .map((t) => Number(t?.rate))
      .filter((r) => Number.isFinite(r) && r > 0);
    const low = tierRates.length > 1 ? Math.min(...tierRates) : raw;
    const ratePct = Math.max(Math.min(low, raw), floor);
    const top = Math.max(raw, floor);
    const ratePctMax = top > ratePct ? top : null;
    return {
      kind: 'cashback',
      platform: o.platform || 'Cashback',
      ratePct,
      ratePctMax,
      // Expose the floor so the UI can label "min 10% (NX Rewards)" if useful
      flooredAt: floor && raw < floor ? floor : null,
      gbpReturn: numAmount * (ratePct / 100),
      gbpReturnMax: ratePctMax != null ? numAmount * (ratePctMax / 100) : null,
      affiliateLink: o.affiliate_link || getAffiliateLink(o.platform),
      lastVerifiedAt: o.last_verified_at,
      offerId: o.id,
      conditions: o.conditions || null,
      isUpTo,
      rateBreakdown,
    };
  };

  // Helper: build the points layer object
  const pointsLayer = (o) => {
    // The `airline` column in DB is lowercase ('avios'); milesPrograms
    // names are usually title-case ('Avios'). Match case-insensitively
    // so the conversion rate isn't silently lost to a string casing
    // mismatch.
    const program = milesPrograms.find(
      (p) => String(p.name || '').toLowerCase() === String(o.airline || '').toLowerCase()
    );
    const earnRate = safeNumber(o.earn_rate, 0);
    const points = numAmount * earnRate;
    const conversionRate = program ? safeNumber(program.conversion_rate, 0) : 0;
    const unit = pointUnitLabel(o.airline);
    return {
      kind: 'points',
      platform: o.airline || 'Points',
      earnRate,
      points,
      pointUnit: unit,
      conversionRate,
      gbpReturn: points * conversionRate,
      boosterAvailable: o.booster_available,
      // Per-offer URL (e.g. avios.com/en-GB/collect-avios/shopping/<slug>/)
      // falls back to the platform-level affiliate from affiliateLinks.js.
      affiliateLink: o.affiliate_link || getAffiliateLink(o.airline),
      lastVerifiedAt: o.last_verified_at,
      offerId: o.id,
    };
  };

  // Helper: build the gift_card layer
  const giftCardLayer = (g) => {
    const discountPct = safeNumber(g.discount_pct, 0);
    return {
      kind: 'gift_card',
      platform: g.platform || 'Gift card',
      discountPct,
      gbpReturn: numAmount * (discountPct / 100),
      affiliateLink: g.affiliate_link || getAffiliateLink(g.platform),
      lastVerifiedAt: g.last_verified_at,
      offerId: g.id,
    };
  };

  // ─── Flat: cashback only ─────────────────────────────────────────────
  cashbackToUse.forEach((o) => {
    const layer = cashbackLayer(o);
    // A breakdown shows as a range ("3–10% cashback"). "Up to X%" stays
    // only for an offer with no breakdown, where the lower tiers are
    // unknown.
    const ratePrefix = layer.isUpTo && layer.ratePctMax == null ? 'Up to ' : '';
    out.push({
      id: `cashback-${o.id}`,
      type: 'cashback',
      title: layer.platform,
      subtitle: `${ratePrefix}${cashbackPctText(layer)} cashback`,
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: gbpText(layer.gbpReturn, layer.gbpReturnMax),
      providerName: layer.platform,
      affiliateLink: layer.affiliateLink,
      lastVerifiedAt: layer.lastVerifiedAt,
      // Surface breakdown at the top level too so route-card components
      // don't need to drill into layers[0].
      rateBreakdown: layer.rateBreakdown,
      isUpTo: layer.isUpTo,
      conditions: layer.conditions,
      layers: [layer],
      raw: o,
    });
  });

  // ─── Flat: points only ───────────────────────────────────────────────
  pointsToUse.forEach((o) => {
    const layer = pointsLayer(o);
    // Title-case the airline for display ('avios' → 'Avios'). DB stores
    // lowercase for the join key but the UI looks nicer capitalised.
    const display = layer.platform.charAt(0).toUpperCase() + layer.platform.slice(1);
    out.push({
      id: `points-${o.id}`,
      type: 'points',
      title: display,
      subtitle: `${layer.earnRate} ${layer.earnRate === 1 ? 'point' : 'points'} per £1`,
      // gbpReturn drives the internal ranking, but we DON'T show the £
      // equivalent in the UI — points are worth more than the minimum
      // conversion rate suggests on premium redemptions, and pricing
      // them at 1p each makes Avios look artificially weak next to
      // cashback. Display the raw point total instead.
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: `${Math.round(layer.points).toLocaleString()} ${layer.pointUnit}`,
      providerName: display,
      affiliateLink: layer.affiliateLink,
      lastVerifiedAt: layer.lastVerifiedAt,
      points: layer.points,
      pointUnit: layer.pointUnit,
      boosterAvailable: layer.boosterAvailable,
      layers: [layer],
      raw: o,
    });
  });

  // ─── Flat: gift card only ────────────────────────────────────────────
  giftCardOffers.forEach((g) => {
    const layer = giftCardLayer(g);
    out.push({
      id: `giftcard-${g.id}`,
      type: 'gift_card',
      title: layer.platform,
      subtitle: `${layer.discountPct}% off gift card`,
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: `£${layer.gbpReturn.toFixed(2)}`,
      providerName: layer.platform,
      affiliateLink: layer.affiliateLink,
      lastVerifiedAt: layer.lastVerifiedAt,
      layers: [layer],
      raw: g,
    });
  });

  // ─── Stacks (premium-only) ───────────────────────────────────────────
  if (!includeStacks) {
    out.sort((a, b) => b.gbpReturn - a.gbpReturn);
    return out;
  }

  // ─── Stack: gift_card × cashback ─────────────────────────────────────
  giftCardOffers.forEach((g) => {
    const gc = giftCardLayer(g);
    cashbackToUse.forEach((c) => {
      const cb = cashbackLayer(c);
      const total = gc.gbpReturn + cb.gbpReturn;
      const totalMax = cb.gbpReturnMax != null ? gc.gbpReturn + cb.gbpReturnMax : null;
      out.push({
        id: `stack-gc${g.id}-cb${c.id}`,
        type: 'stack',
        title: `${gc.platform} + ${cb.platform}`,
        subtitle: `${gc.discountPct}% off + ${cashbackPctText(cb)} cashback`,
        gbpReturn: total,
        gbpReturnDisplay: gbpText(total, totalMax),
        providerName: `${gc.platform} + ${cb.platform}`,
        layers: [gc, cb],
        raw: { giftCard: g, cashback: c },
      });
    });
  });

  // ─── Stack: gift_card × points ───────────────────────────────────────
  giftCardOffers.forEach((g) => {
    const gc = giftCardLayer(g);
    pointsToUse.forEach((p) => {
      const pt = pointsLayer(p);
      const total = gc.gbpReturn + pt.gbpReturn;
      out.push({
        id: `stack-gc${g.id}-pt${p.id}`,
        type: 'stack',
        title: `${gc.platform} + ${pt.platform}`,
        subtitle: `${gc.discountPct}% off + ${pt.earnRate} pts/£`,
        // Show gift-card £ saving AND points separately — both are real
        // value the user collects on the same purchase.
        gbpReturn: total,
        gbpReturnDisplay: `£${gc.gbpReturn.toFixed(2)} + ${Math.round(pt.points).toLocaleString()} ${pt.pointUnit}`,
        providerName: `${gc.platform} + ${pt.platform}`,
        layers: [gc, pt],
        raw: { giftCard: g, points: p },
      });
    });
  });

  out.sort((a, b) => b.gbpReturn - a.gbpReturn);
  return out;
}

/**
 * Build the step-by-step instructions for executing a strategy. Pure UI helper.
 *
 * Handles:
 *   - cashback     : portal → retailer → buy → wait for tracking
 *   - points       : partner portal → retailer → buy → wait for credit
 *   - gift_card    : buy gift card at discount → use at retailer
 *   - stack        : compose the layers in execution order so the user
 *                    captures every saving (buy gift card, then activate
 *                    cashback / open points portal, then click through and
 *                    pay with the gift card)
 */
export function buildStrategySteps(strategy, store) {
  if (!strategy) return [];

  const storeName = store?.name || 'the store';
  // Resolve the click-through URL for a given layer (affiliate row
  // takes priority over the platform-level config in affiliateLinks.js).
  // Falls back to the internal store page when no platform URL exists.
  const urlFor = (layer) =>
    resolveOpenUrl({
      rowUrl: layer?.affiliateLink || null,
      platform: layer?.platform,
      storeDomain: store?.domain,
      fallback: store?.slug ? `/store/${store.slug}` : null,
    });

  if (strategy.type === 'cashback') {
    const layer = strategy.layers?.[0];
    const url = urlFor(layer);
    return [
      {
        title: `Open ${strategy.providerName}`,
        detail: `Sign in to ${strategy.providerName} so cashback is tracked to your account.`,
        actionUrl: url,
        actionLabel: `Open ${strategy.providerName}`,
      },
      {
        title: `Search for ${storeName}`,
        detail: `Find ${storeName} on the cashback page and click through to the retailer.`,
      },
      {
        title: 'Complete the purchase',
        detail: 'Add items to your cart and check out without leaving the tracked session. Avoid coupon-injecting browser extensions.',
      },
      {
        title: 'Wait for cashback to track',
        detail: 'Cashback usually appears within 7 days as "pending" and confirms after the retailer’s return window.',
        warning: 'Some retailers exclude gift card purchases from cashback eligibility.',
      },
    ];
  }

  if (strategy.type === 'points') {
    const layer = strategy.layers?.[0];
    const url = urlFor(layer);
    return [
      {
        title: `Open the ${strategy.providerName} partner portal`,
        detail: `Sign in to your ${strategy.providerName} account so the points are credited correctly.`,
        actionUrl: url,
        actionLabel: `Open ${strategy.providerName}`,
      },
      {
        title: `Click through to ${storeName}`,
        detail: `Find ${storeName} on the partner page and click through.`,
      },
      {
        title: 'Complete the purchase',
        detail: 'Add items to your cart and check out. Keep the order confirmation.',
      },
      {
        title: 'Watch for the points credit',
        detail: 'Points typically post within 4–8 weeks. Keep your order confirmation in case you need to chase a missing claim.',
      },
    ];
  }

  if (strategy.type === 'gift_card') {
    const layer = strategy.layers?.[0];
    const url = urlFor(layer);
    return [
      {
        title: `Open ${layer?.platform || 'the gift card app'}`,
        detail: `Buy a ${storeName} gift card at ${layer?.discountPct || 0}% off the face value.`,
        actionUrl: url,
        actionLabel: `Open ${layer?.platform || 'gift card app'}`,
      },
      {
        title: `Pay with the gift card at ${storeName}`,
        detail: 'The discount is locked in upfront — no waiting for tracking.',
      },
    ];
  }

  if (strategy.type === 'stack') {
    const layers = strategy.layers || [];
    const gc = layers.find((l) => l.kind === 'gift_card');
    const cb = layers.find((l) => l.kind === 'cashback');
    const pt = layers.find((l) => l.kind === 'points');
    const steps = [];

    if (gc) {
      steps.push({
        title: `Buy a ${storeName} gift card via ${gc.platform}`,
        detail: `${gc.discountPct}% off — saves £${gc.gbpReturn.toFixed(2)} on this purchase.`,
        actionUrl: urlFor(gc),
        actionLabel: `Open ${gc.platform}`,
      });
    }
    if (cb) {
      steps.push({
        title: `Open ${cb.platform} and click through to ${storeName}`,
        detail: 'Sign in first so cashback tracks to your account.',
        actionUrl: urlFor(cb),
        actionLabel: `Open ${cb.platform}`,
      });
    } else if (pt) {
      steps.push({
        title: `Open the ${pt.platform} partner portal and click through to ${storeName}`,
        detail: 'Sign in to your program account so the points credit correctly.',
        actionUrl: urlFor(pt),
        actionLabel: `Open ${pt.platform}`,
      });
    }
    steps.push({
      title: 'Pay using the gift card',
      detail: 'Add items, check out, redeem the gift card at the retailer.',
    });
    if (cb) {
      steps.push({
        title: 'Wait for cashback to track',
        detail: `${cashbackPctText(cb)} cashback (${gbpText(cb.gbpReturn, cb.gbpReturnMax)}) usually shows as "pending" within 7 days.`,
        warning: 'Some retailers exclude gift-card-funded purchases — check the conditions on the cashback page.',
      });
    }
    if (pt) {
      steps.push({
        title: 'Watch for the points credit',
        detail: `${Math.round(pt.points).toLocaleString()} ${pt.pointUnit} typically post within 4–8 weeks.`,
      });
    }
    return steps;
  }

  return [];
}
