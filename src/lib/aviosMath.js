/**
 * Avios value math — implements the "Golden Rule" from Bárbara's
 * ebook: when deciding between a cashback platform vs the Avios
 * eStore for a given purchase, check whether the cashback you'd earn
 * could buy MORE Avios via the Avios Booster than you'd accrue
 * directly through the eStore. If yes, take the cashback route.
 *
 * Reference values from the ebook:
 *   - 1,000 Avios ≈ £9.20 in average redemption value
 *   - 1 Avios ≈ £0.0092
 *   - Avios Booster lets you buy Avios at promotional rates that
 *     sometimes beat the £0.0092 par price by 20–50%
 *
 * The default comparison uses the par price (conservative). When a
 * Booster promo is live, pass `boosterBonusPct` (e.g. 30 for "+30%
 * bonus Avios") and the cashback route is valued at the promo rate.
 */

// 1 Avios ≈ £0.0092 — average redemption value across European short-haul
export const GBP_PER_AVIOS = 0.0092;

/** Booster promo % → multiplier on the Avios a given £ buys. */
function boosterMultiplier(boosterBonusPct) {
  const b = Number(boosterBonusPct);
  return Number.isFinite(b) && b > 0 ? 1 + b / 100 : 1;
}

/**
 * £X cashback → equivalent Avios if used to buy Avios via Booster.
 *
 * @param {number} gbp — cashback in £
 * @param {number} [boosterBonusPct] — live Booster promo, e.g. 30 for +30%
 */
export function gbpToAviosBooster(gbp, boosterBonusPct = 0) {
  const n = Number(gbp);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / GBP_PER_AVIOS) * boosterMultiplier(boosterBonusPct));
}

/** Avios value in £ at the par redemption price. */
export function aviosToGbp(avios) {
  const n = Number(avios);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * GBP_PER_AVIOS;
}

/**
 * The cashback % that exactly matches a given eStore rate — the
 * threshold from the ebook's Golden Rule. Independent of how much
 * you spend, so it doubles as a rule of thumb: "anything above
 * 3.68% beats 4 Avios/£".
 *
 * @param {number} aviosPerPound — the eStore/merchant rate
 * @param {number} [boosterBonusPct] — live Booster promo, e.g. 30 for +30%
 * @returns {number} cashback % needed to tie (0 when the rate is invalid)
 */
export function breakEvenCashbackPct(aviosPerPound, boosterBonusPct = 0) {
  const rate = Number(aviosPerPound);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return (rate * GBP_PER_AVIOS * 100) / boosterMultiplier(boosterBonusPct);
}

/**
 * Compare a cashback option against a direct Avios eStore option for
 * the same purchase. Returns the recommendation + the delta.
 *
 * @param {object} args
 * @param {number} args.cashbackGbp — £ cashback you'd earn via the cashback route
 * @param {number} args.directAvios — Avios you'd earn via the Avios eStore route (or 0/null if not available)
 * @param {number} [args.boosterBonusPct] — live Booster promo applied to the cashback route
 * @returns {{
 *   cashbackAvios: number,
 *   directAvios: number,
 *   winner: 'cashback' | 'avios' | 'tie' | 'cashback-only' | 'avios-only' | 'none',
 *   deltaAvios: number,  // positive = cashback wins by this many Avios
 *   note: string,
 * }}
 */
export function compareCashbackVsAvios({ cashbackGbp = 0, directAvios = 0, boosterBonusPct = 0 }) {
  const cb = Number(cashbackGbp) || 0;
  const av = Number(directAvios) || 0;
  const cashbackAvios = gbpToAviosBooster(cb, boosterBonusPct);

  if (cb <= 0 && av <= 0) {
    return {
      cashbackAvios: 0,
      directAvios: 0,
      winner: 'none',
      deltaAvios: 0,
      note: 'Neither route earns anything on this purchase.',
    };
  }
  if (cb > 0 && av === 0) {
    return {
      cashbackAvios,
      directAvios: 0,
      winner: 'cashback-only',
      deltaAvios: cashbackAvios,
      note: `≈ ${cashbackAvios.toLocaleString('en-GB')} Avios if you buy via Avios Booster.`,
    };
  }
  if (av > 0 && cb === 0) {
    return {
      cashbackAvios: 0,
      directAvios: av,
      winner: 'avios-only',
      deltaAvios: -av,
      note: `${av.toLocaleString('en-GB')} Avios via the eStore.`,
    };
  }
  if (cashbackAvios === av) {
    return {
      cashbackAvios,
      directAvios: av,
      winner: 'tie',
      deltaAvios: 0,
      note: 'Cashback and Avios routes are equal — pick the one you trust to track.',
    };
  }
  if (cashbackAvios > av) {
    return {
      cashbackAvios,
      directAvios: av,
      winner: 'cashback',
      deltaAvios: cashbackAvios - av,
      note: `Cashback wins: ${cashbackAvios.toLocaleString('en-GB')} Avios via Booster vs ${av.toLocaleString('en-GB')} Avios via eStore (+${(cashbackAvios - av).toLocaleString('en-GB')} Avios).`,
    };
  }
  return {
    cashbackAvios,
    directAvios: av,
    winner: 'avios',
    deltaAvios: cashbackAvios - av,
    note: `Avios eStore wins: ${av.toLocaleString('en-GB')} Avios direct vs ${cashbackAvios.toLocaleString('en-GB')} via cashback Booster.`,
  };
}

/**
 * What an Avios is actually WORTH on a given booking, in pence.
 *
 * This is the redemption side of the ledger, and the one number that
 * settles "is this a good use of my Avios?". It covers both shapes of
 * the question with the same arithmetic:
 *
 *   Full Avios redemption — cashPrice is the cash fare you avoid,
 *     cashPaid is the taxes/fees/carrier charges you still pay.
 *   Avios + cash (Part Pay with Avios) — cashPrice is the full cash
 *     fare, cashPaid is the reduced cash you pay alongside the Avios.
 *
 * In both cases: the cash you no longer hand over, divided by the
 * Avios it took to avoid it.
 *
 * @returns {number} pence per Avios (0 when the inputs can't produce one)
 */
export function pencePerAvios({ cashPrice = 0, aviosUsed = 0, cashPaid = 0 }) {
  const price = Number(cashPrice);
  const used = Number(aviosUsed);
  const paid = Number(cashPaid);
  if (!Number.isFinite(price) || !Number.isFinite(used) || used <= 0) return 0;
  const cashAvoided = price - (Number.isFinite(paid) && paid > 0 ? paid : 0);
  if (cashAvoided <= 0) return 0;
  return (cashAvoided / used) * 100;
}

/**
 * Should you spend Avios on this, or just pay cash?
 *
 * Compares what the Avios release (pence each) against what they cost
 * you to acquire (your blended cost per 1,000 — the figure the miles
 * ledger tracks). Defaults to the ebook's £9.20/1,000 benchmark when
 * you haven't worked out your own.
 *
 * @param {object} args
 * @param {number} args.cashPrice — the full cash fare (£)
 * @param {number} args.aviosUsed — Avios the redemption costs
 * @param {number} [args.cashPaid] — cash still payable: taxes/fees, or the
 *   cash half of an Avios + cash booking (£)
 * @param {number} [args.costPerThousand] — YOUR cost per 1,000 Avios (£)
 * @returns {{
 *   pencePerAvios: number,
 *   yourCostPence: number,
 *   aviosRouteCost: number,   // £ the Avios route really costs you
 *   savingGbp: number,        // £ saved vs paying cash (negative = worse)
 *   verdict: 'worth-it' | 'not-worth-it' | 'tie' | 'incomplete',
 * }}
 */
export function redemptionOutcome({
  cashPrice = 0,
  aviosUsed = 0,
  cashPaid = 0,
  costPerThousand = GBP_PER_AVIOS * 1000,
}) {
  const price = Number(cashPrice) || 0;
  const used = Number(aviosUsed) || 0;
  const paid = Number(cashPaid) || 0;
  const cpt = Number(costPerThousand);
  const perThousand = Number.isFinite(cpt) && cpt >= 0 ? cpt : GBP_PER_AVIOS * 1000;

  if (price <= 0 || used <= 0) {
    return {
      pencePerAvios: 0,
      yourCostPence: perThousand / 10,
      aviosRouteCost: 0,
      savingGbp: 0,
      verdict: 'incomplete',
    };
  }

  const value = pencePerAvios({ cashPrice: price, aviosUsed: used, cashPaid: paid });
  const yourCostPence = perThousand / 10; // £ per 1,000 → pence per Avios
  const aviosRouteCost = (used / 1000) * perThousand + paid;
  const savingGbp = price - aviosRouteCost;

  let verdict;
  if (value === 0) verdict = 'not-worth-it'; // fees swallow the whole fare
  else if (value > yourCostPence) verdict = 'worth-it';
  else if (value < yourCostPence) verdict = 'not-worth-it';
  else verdict = 'tie';

  return { pencePerAvios: value, yourCostPence, aviosRouteCost, savingGbp, verdict };
}
