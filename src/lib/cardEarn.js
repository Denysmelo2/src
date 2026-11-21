// cardEarn — the user's own card inside a route's total (owner's tests,
// 21/11/2026, A2; handover docs/HANDOVER_CLAUDE_CODE_2026-11-21-testes-do-dono.md).
//
// Until now /compare showed one line, "+ ~£1.00 if you pay with a 1%
// card", fixed at 1% and out of the total (owner, 05/11/2026, option a).
// A user who saved a card now gets that card's earnings inside the total:
//   * the best card the user saved (user_cards.card_provider ->
//     platform.code), valued per £1 spent: 'pct' = rate / 100, 'avios' =
//     rate × £0.0092, 'points' = rate × card_point_value_gbp (src 0047);
//   * the card earns on the money that leaves the card: the full amount on
//     a cashback or points route; the price of the gift card on a gift-
//     card route; what is paid after the code on a student route;
//   * a JamDoughnut Pump Up paid by bank transfer (or points) leaves the
//     card out: nothing is paid by card;
//   * no saved card with a rate: nothing changes, the old line stays out
//     of the total.
//
// Pure functions, no imports from '@/': tests/cardEarn.test.js runs them
// under plain Node.

export const GBP_PER_AVIOS = 0.0092;

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** £ earned per £1 spent with a platform card row, or 0. */
export function cardValuePerPound(card) {
  const rate = num(card?.card_earn_rate);
  if (rate <= 0) return 0;
  switch (String(card?.card_earn_unit || '').toLowerCase()) {
    case 'pct':
      return rate / 100;
    case 'avios':
      return rate * GBP_PER_AVIOS;
    case 'points': {
      const v = num(card?.card_point_value_gbp);
      return v > 0 ? rate * v : 0;
    }
    default:
      return 0;
  }
}

/**
 * The best card the user saved, or null.
 * userCards: user_cards rows ({card_provider}); platformCards: platform
 * rows of type 'card' ({code, name, card_earn_rate, card_earn_unit,
 * card_point_value_gbp}). A tie keeps the card saved first.
 */
export function bestUserCard(userCards, platformCards) {
  const byCode = new Map((platformCards || []).map((p) => [String(p.code || '').toLowerCase(), p]));
  let best = null;
  for (const uc of userCards || []) {
    const p = byCode.get(String(uc?.card_provider || '').toLowerCase());
    const perPound = cardValuePerPound(p);
    if (perPound > 0 && (!best || perPound > best.perPound)) {
      best = {
        code: p.code,
        name: p.name || p.code,
        rate: num(p.card_earn_rate),
        unit: String(p.card_earn_unit).toLowerCase(),
        perPound,
      };
    }
  }
  return best;
}

/** "1%", "1.5 Avios/£", "1 pt/£". */
export function cardRateText(card) {
  if (!card) return '';
  const r = Math.round(card.rate * 100) / 100;
  if (card.unit === 'pct') return `${r}%`;
  if (card.unit === 'avios') return `${r} Avios/£`;
  return `${r} pt/£`;
}

const giftPctOf = (layers) =>
  (layers || []).filter((l) => l?.kind === 'gift_card').reduce((s, l) => s + num(l.discountPct), 0);
const paidByBank = (pumpUp) => !!pumpUp && pumpUp.byCard === false;

/**
 * The £ that leaves the card on a /compare route item, or 0.
 * item: { source: 'auto', strategy } or { source: 'curated', curated: { live } }.
 */
export function cardSpend(item, amount) {
  const a = num(amount);
  if (a <= 0 || !item) return 0;
  if (item.source === 'curated') {
    const live = item.curated?.live;
    if (paidByBank(live?.pumpUp)) return 0;
    const gift = (live?.liveParts || [])
      .filter((p) => p.kind === 'gift_card')
      .reduce((s, p) => s + num(p.value), 0);
    return round2(a * (1 - Math.min(gift, 100) / 100));
  }
  const s = item.strategy;
  if (!s) return 0;
  if (paidByBank(s.pumpUp)) return 0;
  if (s.type === 'student') {
    const paid = num(s.paidAmount);
    const gift = giftPctOf((s.layers || []).filter((l) => l?.kind === 'gift_card'));
    return round2(paid * (1 - Math.min(gift, 100) / 100));
  }
  const gift = giftPctOf(s.layers);
  return round2(a * (1 - Math.min(gift, 100) / 100));
}

/** What the card earns on a spend of `spend`, in £. */
export function cardGain(spend, card) {
  if (!card || !(num(spend) > 0)) return 0;
  return round2(num(spend) * card.perPound);
}

/** Add `extra` £ to every "£x" in a display ("£3.00–£10.00", "£5.00 + 600
 *  Avios"); a display with no £ ("600 Avios") gets " + £x". */
export function addToDisplay(display, extra) {
  const e = num(extra);
  if (e <= 0) return display;
  const s = String(display || '');
  if (/£\d/.test(s)) return s.replace(/£(\d+(?:\.\d+)?)/g, (_, v) => `£${(num(v) + e).toFixed(2)}`);
  return s ? `${s} + £${e.toFixed(2)}` : `£${e.toFixed(2)}`;
}

/**
 * A /compare route item with the user's card in its total:
 * { ...item, gbpReturn: base + card, gbpReturnDisplay, baseGbpReturn,
 *   cardGbp, cardName }. Without a card, the item unchanged.
 */
export function withCard(item, amount, card) {
  if (!item || !card) return item;
  const gbp = cardGain(cardSpend(item, amount), card);
  if (gbp <= 0) return { ...item, baseGbpReturn: num(item.gbpReturn), cardGbp: 0, cardName: card.name };
  return {
    ...item,
    baseGbpReturn: num(item.gbpReturn),
    gbpReturn: round2(num(item.gbpReturn) + gbp),
    gbpReturnDisplay: addToDisplay(item.gbpReturnDisplay, gbp),
    cardGbp: gbp,
    cardName: card.name,
  };
}

/** "incl. £1.00 from your Amex Gold", or null. */
export function cardInclLine(item) {
  return item?.cardGbp > 0 ? `incl. £${item.cardGbp.toFixed(2)} from your ${item.cardName}` : null;
}
