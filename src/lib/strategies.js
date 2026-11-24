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

import { getAffiliateLink, getReferral, resolveOpenUrl } from '@/lib/affiliateLinks';
import { platformLabel as label } from '@/lib/platformNames';
import { bonusSubtitle, matchesContext as matchesBonusContext, pickBonuses } from '@/lib/bonusOffers';
import { pumpUpInfo, pumpUpLine } from '@/lib/pumpUp';
import { bestStudentOffer, studentMath, pctText as studentPct, STUDENT_WARNING } from '@/lib/studentDiscount';
import { isRakutenPlatform, exclusionLine } from '@/lib/cashbackTerms';

export { isRakutenPlatform };
// "Why it's the best option" (owner's tests 21/11/2026, B6).
export { explainBest, routeLine } from '@/lib/explainBest';

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

/** True for NX Rewards, however the platform name is spelt. */
export function isNxPlatform(platform) {
  const key = String(platform || '').trim().toLowerCase();
  return key === 'nx rewards' || key === 'nxrewards' || key === 'nx';
}

/** True for Quidco, however the platform name is spelt. */
export function isQuidcoPlatform(platform) {
  return String(platform || '').trim().toLowerCase() === 'quidco';
}

/** True for Picodi, however the platform name is spelt. */
export function isPicodiPlatform(platform) {
  return String(platform || '').trim().toLowerCase() === 'picodi';
}

/** True for the British Airways Avios eStore (point_offers.airline). */
export function isAviosEstore(platform) {
  const key = String(platform || '').trim().toLowerCase();
  return key === 'british airways avios' || key === 'avios' || key === 'ba avios';
}
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
 * @param {Array}  [args.bonusOffers]     rows from public.point_bonus_offers
 *                                         (fixed "N Avios per order")
 * @param {object} [args.bonusContext]    { customerType: 'new'|'existing',
 *                                         channel: 'web'|'app' }. Without it,
 *                                         every bonus that the amount reaches
 *                                         is listed with its conditions.
 * @param {Array}  [args.studentOffers]   rows from public.student_offers for
 *                                         this store, passed ONLY for a user with
 *                                         user_profiles.is_student (handover
 *                                         17/11/2026). Adds the student routes.
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
  bonusOffers = [],
  bonusContext = null,
  milesPrograms = [],
  userWallet = null,
  includeStacks = true,
  studentOffers = [],
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
      // The shop's name on the platform, when it is not the store's
      // ("Currys Partsmaster" on NX; src 0047, owner's tests A3).
      sourceName: o.source_name || null,
      // The shop's "Terms & Exclusions" on the platform (Rakuten; src 0050).
      terms: o.terms || null,
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
      // JamDoughnut Pump Up (handover 15/11/2026): the rate above is the
      // highest one, which may need a bank transfer; null when no boost.
      pumpUp: pumpUpInfo(g),
    };
  };
  const pumpUpSuffix = (gc) => (gc.pumpUp ? ` · ${pumpUpLine(gc.pumpUp)}` : '');

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
      title: label(layer.platform),
      subtitle: `${ratePrefix}${cashbackPctText(layer)} cashback`,
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: gbpText(layer.gbpReturn, layer.gbpReturnMax),
      providerName: label(layer.platform),
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
    const display = label(layer.platform);
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

  // ─── Flat: fixed bonus per order ("700 Avios") ───────────────────────
  // Only when the order reaches the minimum spend. With a context, only
  // the bonus for that customer and channel (the best if several match).
  // Without one (/compare): one route per programme and customer type,
  // the best channel, the others in the subtitle (lib/bonusOffers.js,
  // 14/11/2026: Sainsbury's showed the same new-customer bonus twice).
  const bonusPool =
    userWallet && userWallet.milesProgramNames instanceof Set
      ? bonusOffers.filter((b) => userWallet.milesProgramNames.has(b.airline))
      : bonusOffers;
  const reachable = bonusPool.filter(
    (b) => numAmount > 0 && numAmount >= safeNumber(b.min_spend, 0) && matchesBonusContext(b, bonusContext)
  );
  pickBonuses(reachable, { context: bonusContext || null }).forEach((picked) => {
    const b = picked.bonus;
    const program = milesPrograms.find(
      (p) => String(p.name || '').toLowerCase() === String(b.airline || '').toLowerCase()
    );
    const points = safeNumber(b.bonus_points, 0);
    const conversionRate = program ? safeNumber(program.conversion_rate, 0) : 0;
    const unit = pointUnitLabel(b.airline);
    const layer = {
      kind: 'points',
      platform: b.airline,
      earnRate: 0,
      points,
      pointUnit: unit,
      conversionRate,
      gbpReturn: points * conversionRate,
      affiliateLink: b.affiliate_link || getAffiliateLink(b.airline),
      lastVerifiedAt: b.last_verified_at,
      offerId: b.id,
      fixedBonus: true,
    };
    out.push({
      id: `bonus-${b.id}`,
      type: 'points',
      title: label(b.airline),
      subtitle: bonusSubtitle(picked, unit),
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: `${points.toLocaleString()} ${unit}`,
      providerName: label(b.airline),
      affiliateLink: layer.affiliateLink,
      lastVerifiedAt: layer.lastVerifiedAt,
      points,
      pointUnit: unit,
      newCustomersOnly: b.customer_type === 'new',
      layers: [layer],
      raw: b,
    });
  });

  // ─── Flat: gift card only ────────────────────────────────────────────
  giftCardOffers.forEach((g) => {
    const layer = giftCardLayer(g);
    out.push({
      id: `giftcard-${g.id}`,
      type: 'gift_card',
      title: label(layer.platform),
      subtitle: `${layer.discountPct}% off gift card${pumpUpSuffix(layer)}`,
      pumpUp: layer.pumpUp,
      gbpReturn: layer.gbpReturn,
      gbpReturnDisplay: `£${layer.gbpReturn.toFixed(2)}`,
      providerName: label(layer.platform),
      affiliateLink: layer.affiliateLink,
      lastVerifiedAt: layer.lastVerifiedAt,
      layers: [layer],
      raw: g,
    });
  });

  // ─── Student discount (students only) ────────────────────────────────
  // Handover 17/11/2026: the student code cuts the price; cashback, points
  // or a gift card then apply to what is paid. Owner's test (17/11): NX
  // tracked its 10% with a Student Beans code on Charlotte Tilbury. The
  // best of Student Beans and UNiDAYS today, named alone. Shown to every
  // student (not a subscriber-only stack): it is the student feature.
  const student = bestStudentOffer(studentOffers);
  if (student) {
    const sMath = studentMath(numAmount, student.pct);
    const studentLayer = {
      kind: 'student',
      platform: student.platform,
      label: student.label,
      discountPct: student.pct,
      channel: student.channel,
      gbpReturn: sMath.saving,
      lastVerifiedAt: student.lastVerifiedAt,
      offerId: student.offerId,
    };
    const codeText = `${studentPct(student.pct)} student code (${student.label})`;
    const studentRoute = (r) => ({ ...r, type: 'student', student: studentLayer });

    out.push(
      studentRoute({
        id: `student-${student.platform}`,
        title: `${student.label} student discount`,
        subtitle: `${studentPct(student.pct)} student discount on ${student.label}`,
        gbpReturn: sMath.saving,
        gbpReturnDisplay: `£${sMath.saving.toFixed(2)}`,
        providerName: student.label,
        paidAmount: sMath.paid,
        cardOnPaid: true,
        layers: [studentLayer],
        partner: null,
      })
    );

    cashbackToUse.forEach((c) => {
      const cb = cashbackLayer(c);
      const m = studentMath(numAmount, student.pct, cb.ratePct);
      const mMax = cb.ratePctMax != null ? studentMath(numAmount, student.pct, cb.ratePctMax) : null;
      const cbOnPaid = { ...cb, gbpReturn: m.other, gbpReturnMax: mMax ? mMax.other : null };
      out.push(
        studentRoute({
          id: `student-${student.platform}-cb${c.id}`,
          title: `${student.label} + ${label(cb.platform)}`,
          subtitle: `${codeText} + ${cashbackPctText(cb)} cashback on the £${m.paid.toFixed(2)} you pay`,
          gbpReturn: m.total,
          gbpReturnDisplay: gbpText(m.total, mMax ? mMax.total : null),
          providerName: `${student.label} + ${label(cb.platform)}`,
          paidAmount: m.paid,
          cardOnPaid: true,
          layers: [studentLayer, cbOnPaid],
          partner: cbOnPaid,
        })
      );
    });

    pointsToUse.forEach((p) => {
      const pt = pointsLayer(p);
      const m = studentMath(numAmount, student.pct);
      const share = numAmount > 0 ? m.paid / numAmount : 0;
      const ptOnPaid = { ...pt, points: pt.points * share, gbpReturn: pt.gbpReturn * share };
      out.push(
        studentRoute({
          id: `student-${student.platform}-pt${p.id}`,
          title: `${student.label} + ${label(pt.platform)}`,
          subtitle: `${codeText} + ${pt.earnRate} pts/£ on the £${m.paid.toFixed(2)} you pay`,
          gbpReturn: m.saving + ptOnPaid.gbpReturn,
          gbpReturnDisplay: `£${m.saving.toFixed(2)} + ${Math.round(ptOnPaid.points).toLocaleString()} ${pt.pointUnit}`,
          providerName: `${student.label} + ${label(pt.platform)}`,
          paidAmount: m.paid,
          cardOnPaid: true,
          layers: [studentLayer, ptOnPaid],
          partner: ptOnPaid,
        })
      );
    });

    // Gift card pays what is left after the code. Never NX with a gift
    // card (see the stacks below): this route has no cashback layer.
    giftCardOffers.forEach((g) => {
      const gc = giftCardLayer(g);
      const m = studentMath(numAmount, student.pct, gc.discountPct);
      const gcOnPaid = { ...gc, gbpReturn: m.other };
      out.push(
        studentRoute({
          id: `student-${student.platform}-gc${g.id}`,
          title: `${student.label} + ${label(gc.platform)}`,
          subtitle: `${codeText} + ${gc.discountPct}% off a £${m.paid.toFixed(2)} gift card`,
          gbpReturn: m.total,
          gbpReturnDisplay: `£${m.total.toFixed(2)}`,
          providerName: `${student.label} + ${label(gc.platform)}`,
          paidAmount: m.paid,
          cardOnPaid: false,
          pumpUp: gc.pumpUp,
          layers: [studentLayer, gcOnPaid],
          partner: gcOnPaid,
        })
      );
    });
  }

  // Student routes carry their steps (the store name is known here).
  for (const r of out) {
    if (r.type === 'student') r.steps = buildStrategySteps(r, store);
  }

  // ─── Stacks (premium-only) ───────────────────────────────────────────
  if (!includeStacks) {
    out.sort((a, b) => b.gbpReturn - a.gbpReturn);
    return out;
  }

  // ─── Stack: gift_card × cashback ─────────────────────────────────────
  // Never with NX Rewards. Its Special Terms (Deliveroo and Boots, checked
  // by Cowork in the member area on 18/10/2026): "Cashback is not due on
  // purchases of gift cards or paying for a purchase using gift cards or
  // e-gift cards/codes." So "Cheddar + NX Rewards" pays only the gift
  // card; NX stays a separate route to compare against.
  // Never with Quidco either: its standard exclusions (help centre,
  // checked 23/10/2026) say cashback is lost when you pay with a gift card
  // or shopping card, for every retailer, Deliveroo included.
  // Never with Picodi: owner's decision of 26/10/2026, until Picodi's own
  // rules on paying with a gift card are confirmed.
  // Never with Rakuten (handover 23/11/2026): its shop pages say "Cashback
  // is not available on gift cards", and its terms that gift-card
  // purchases may not qualify. Per-shop exceptions would be another task.
  const cashbackForGiftCardStacks = cashbackToUse.filter(
    (c) =>
      !isNxPlatform(c.platform) &&
      !isQuidcoPlatform(c.platform) &&
      !isPicodiPlatform(c.platform) &&
      !isRakutenPlatform(c.platform)
  );
  giftCardOffers.forEach((g) => {
    const gc = giftCardLayer(g);
    cashbackForGiftCardStacks.forEach((c) => {
      const cb = cashbackLayer(c);
      const total = gc.gbpReturn + cb.gbpReturn;
      const totalMax = cb.gbpReturnMax != null ? gc.gbpReturn + cb.gbpReturnMax : null;
      out.push({
        id: `stack-gc${g.id}-cb${c.id}`,
        type: 'stack',
        title: `${label(gc.platform)} + ${label(cb.platform)}`,
        subtitle: `${gc.discountPct}% off + ${cashbackPctText(cb)} cashback${pumpUpSuffix(gc)}`,
        pumpUp: gc.pumpUp,
        gbpReturn: total,
        gbpReturnDisplay: gbpText(total, totalMax),
        providerName: `${label(gc.platform)} + ${label(cb.platform)}`,
        layers: [gc, cb],
        raw: { giftCard: g, cashback: c },
      });
    });
  });

  // ─── Stack: gift_card × points ───────────────────────────────────────
  // Never with the Avios eStore. BA's shopping terms: "Purchase of or using
  // gift card to pay for whole or part of the transaction is not eligible
  // to earn Avios, unless stated otherwise in retailer's purchase
  // conditions" (checked 23/10/2026). Same rule as NX above: the eStore
  // stays a separate route to compare against.
  const pointsForGiftCardStacks = pointsToUse.filter((p) => !isAviosEstore(p.airline));
  giftCardOffers.forEach((g) => {
    const gc = giftCardLayer(g);
    pointsForGiftCardStacks.forEach((p) => {
      const pt = pointsLayer(p);
      const total = gc.gbpReturn + pt.gbpReturn;
      out.push({
        id: `stack-gc${g.id}-pt${p.id}`,
        type: 'stack',
        title: `${label(gc.platform)} + ${label(pt.platform)}`,
        subtitle: `${gc.discountPct}% off + ${pt.earnRate} pts/£${pumpUpSuffix(gc)}`,
        pumpUp: gc.pumpUp,
        // Show gift-card £ saving AND points separately — both are real
        // value the user collects on the same purchase.
        gbpReturn: total,
        gbpReturnDisplay: `£${gc.gbpReturn.toFixed(2)} + ${Math.round(pt.points).toLocaleString()} ${pt.pointUnit}`,
        providerName: `${label(gc.platform)} + ${label(pt.platform)}`,
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
/** The label of a route's kind, the same words as /compare ("Cashback",
 *  "Gift card", "Avios"), never the raw "GIFT_CARD" (owner's tests
 *  21/11/2026, B3). */
export function routeTypeLabel(strategy) {
  const t = strategy?.type;
  if (t === 'cashback') return 'Cashback';
  if (t === 'gift_card') return 'Gift card';
  if (t === 'points') return /avios/i.test(strategy?.layers?.[0]?.platform || strategy?.title || '') ? 'Avios' : 'Points';
  if (t === 'student') return 'Student';
  if (t === 'stack') {
    const kinds = (strategy.layers || []).map((l) => l.kind);
    return kinds.includes('points') ? 'Gift card + points' : 'Gift card + cashback';
  }
  return 'Route';
}

const sameName = (a, b) =>
  String(a || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '') ===
  String(b || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

/** "On NX Rewards, search for 'Currys Partsmaster'" when the platform
 *  lists the shop under another name (owner's tests 21/11/2026, A3),
 *  else "Search for Currys". */
export function searchStepTitle(layer, storeName, providerName) {
  const src = layer?.sourceName;
  if (src && !sameName(src, storeName)) return `On ${providerName || label(layer?.platform)}, search for '${src}'`;
  return `Search for ${storeName}`;
}

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
  // The platform's referral code under its "Open" button, when there is
  // one (handover "testes reais", 24/11/2026, task 2).
  const refFor = (layer) => {
    const r = getReferral(layer?.platform);
    return r.code ? r : undefined;
  };

  if (strategy.type === 'cashback') {
    const layer = strategy.layers?.[0];
    const url = urlFor(layer);
    return [
      {
        title: `Open ${strategy.providerName}`,
        detail: `Sign in to ${strategy.providerName} so cashback is tracked to your account.`,
        actionUrl: url,
        referral: refFor(layer),
        actionLabel: `Open ${strategy.providerName}`,
      },
      {
        title: searchStepTitle(layer, storeName, strategy.providerName),
        detail:
          layer?.sourceName && !sameName(layer.sourceName, storeName)
            ? `${strategy.providerName} lists ${storeName} as "${layer.sourceName}". Click through to the retailer from there.`
            : `Find ${storeName} on the cashback page and click through to the retailer.`,
      },
      {
        title: 'Complete the purchase',
        detail: 'Add items to your cart and check out without leaving the tracked session. Avoid coupon-injecting browser extensions.',
        // What the platform excludes ("No cashback on gift cards or
        // non-Rakuten codes") and the shop's own terms under "See terms"
        // (Rakuten handover 23/11/2026; lib/cashbackTerms.js).
        warning: exclusionLine(layer?.platform) || undefined,
        terms: layer?.terms || undefined,
      },
      {
        title: 'Wait for cashback to track',
        detail: 'Cashback usually appears within 7 days as "pending" and confirms after the retailer’s return window.',
        // No gift-card warning here: this route has no gift card (owner's
        // tests 21/11/2026, B3). The stack steps below keep theirs.
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
        referral: refFor(layer),
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
        title: `Open ${label(layer?.platform) || 'the gift card app'}`,
        detail: `Buy a ${storeName} gift card at ${layer?.discountPct || 0}% off the face value.`,
        actionUrl: url,
        referral: refFor(layer),
        actionLabel: `Open ${label(layer?.platform) || 'gift card app'}`,
      },
      {
        title: `Pay with the gift card at ${storeName}`,
        detail: 'The discount is locked in upfront — no waiting for tracking.',
      },
    ];
  }

  if (strategy.type === 'student') {
    const st = strategy.student || strategy.layers?.[0];
    const partner = strategy.partner;
    const paid = Number(strategy.paidAmount) || 0;
    const steps = [
      {
        // No link (owner, 17/11/2026): the code comes from the platform's
        // app once the student is verified.
        title: `Get your ${studentPct(st?.discountPct)} student code on ${st?.label}`,
        detail: `Student verification needed. Open the ${st?.label} app, verify, and copy the ${storeName} code.`,
      },
    ];
    if (partner?.kind === 'cashback') {
      const listed = partner.sourceName && !sameName(partner.sourceName, storeName) ? ` (listed as '${partner.sourceName}')` : '';
      steps.push({
        title: `Open ${storeName}${listed} through ${label(partner.platform)}`,
        detail: 'Sign in first so cashback tracks to your account.',
        actionUrl: urlFor(partner),
        referral: refFor(partner),
        actionLabel: `Open ${label(partner.platform)}`,
      });
    } else if (partner?.kind === 'points') {
      steps.push({
        title: `Open ${storeName} through the ${label(partner.platform)} portal`,
        detail: 'Sign in to your programme account so the points credit correctly.',
        actionUrl: urlFor(partner),
        referral: refFor(partner),
        actionLabel: `Open ${label(partner.platform)}`,
      });
    } else if (partner?.kind === 'gift_card') {
      steps.push({
        title: `Buy a £${paid.toFixed(2)} ${storeName} gift card via ${label(partner.platform)}`,
        detail: `${partner.discountPct}% off — saves £${(Number(partner.gbpReturn) || 0).toFixed(2)}.`,
        actionUrl: urlFor(partner),
        referral: refFor(partner),
        actionLabel: `Open ${label(partner.platform)}`,
      });
    }
    steps.push({
      title: partner?.kind === 'gift_card' ? 'Enter the code at checkout, then pay with the gift card' : 'Enter the code at checkout',
      detail: `You pay £${paid.toFixed(2)} instead of £${(paid + (Number(st?.gbpReturn) || 0)).toFixed(2)}.`,
      warning: STUDENT_WARNING,
    });
    return steps;
  }

  if (strategy.type === 'stack') {
    const layers = strategy.layers || [];
    const gc = layers.find((l) => l.kind === 'gift_card');
    const cb = layers.find((l) => l.kind === 'cashback');
    const pt = layers.find((l) => l.kind === 'points');
    const steps = [];

    if (gc) {
      steps.push({
        title: `Buy a ${storeName} gift card via ${label(gc.platform)}`,
        detail: `${gc.discountPct}% off — saves £${gc.gbpReturn.toFixed(2)} on this purchase.`,
        actionUrl: urlFor(gc),
        referral: refFor(gc),
        actionLabel: `Open ${label(gc.platform)}`,
      });
    }
    if (cb) {
      const listed = cb.sourceName && !sameName(cb.sourceName, storeName) ? ` (listed as '${cb.sourceName}')` : '';
      steps.push({
        title: `Open ${label(cb.platform)} and click through to ${storeName}${listed}`,
        detail: 'Sign in first so cashback tracks to your account.',
        actionUrl: urlFor(cb),
        referral: refFor(cb),
        actionLabel: `Open ${label(cb.platform)}`,
      });
    } else if (pt) {
      steps.push({
        title: `Open the ${label(pt.platform)} partner portal and click through to ${storeName}`,
        detail: 'Sign in to your program account so the points credit correctly.',
        actionUrl: urlFor(pt),
        referral: refFor(pt),
        actionLabel: `Open ${label(pt.platform)}`,
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
