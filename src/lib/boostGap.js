// boostGap — "Best option" and "£X less than the best option" on the
// Hot deals boost cards, like /compare (owner, 22/11/2026: no "#1, #2").
//
// A Hot deals section is one platform, one card per store, best rate
// first. The cards show rates, so the gap is worked out on £100, the
// same amount as the store page's routes: % cashback or % off a gift
// card is £ per £100; Avios per £1 × 100 × £0.0092 (lib/cardEarn.js).
//
// Pure, no imports from '@/': tests/boostGap.test.js runs it under Node.

import { GBP_PER_AVIOS } from './cardEarn.js';

export const GAP_AMOUNT = 100;
const TIE_GBP = 0.005;

/** £ a rate is worth on `amount`. kind: 'cashback' | 'gift_card' | 'points'. */
export function gbpOn(kind, rate, amount = GAP_AMOUNT) {
  const r = Number(rate) || 0;
  if (kind === 'points') return r * amount * GBP_PER_AVIOS;
  return (r / 100) * amount;
}

/** Map id -> "£X less than the best option, on £100" for every card but
 *  the first (offers already in order, best first). */
export function boostGaps(offers, amount = GAP_AMOUNT) {
  const out = new Map();
  const list = (offers || []).filter(Boolean);
  if (list.length < 2) return out;
  const best = gbpOn(list[0].kind, list[0].rateValue, amount);
  for (const o of list.slice(1)) {
    const d = best - gbpOn(o.kind, o.rateValue, amount);
    out.set(o.id, d >= TIE_GBP ? `£${d.toFixed(2)} less than the best option, on £${amount}` : 'Same as the best option');
  }
  return out;
}
