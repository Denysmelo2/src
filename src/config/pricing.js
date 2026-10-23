// SnapGain subscription prices: the one place they are written.
//
// Owner's decision (23/10/2026): £7.99 a month, £60 a year. Stripe holds
// the same prices (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY in the Edge
// Functions); this file is only what the site says. Change both together.

export const PRICE_MONTHLY = 7.99;
export const PRICE_YEARLY = 60;

/** £7.99, £60, £95.88: pence only when there are any. */
export function gbp(amount) {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `£${rounded}` : `£${rounded.toFixed(2)}`;
}

export const MONTHLY = gbp(PRICE_MONTHLY); // £7.99
export const YEARLY = gbp(PRICE_YEARLY); // £60
/** Twelve monthly payments, and how much the annual plan saves on them. */
export const TWELVE_MONTHLY = gbp(PRICE_MONTHLY * 12); // £95.88
export const YEARLY_SAVING = gbp(PRICE_MONTHLY * 12 - PRICE_YEARLY); // £35.88

/** Proportional refund in the 14-day cancellation period (Refund Policy):
 *  price × days left ÷ days in the period, to the penny. */
export function proportionalRefund(price, daysLeft, daysInPeriod) {
  return gbp(Math.round(((price * daysLeft) / daysInPeriod) * 100) / 100);
}
