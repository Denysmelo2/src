// The user's card inside the total on /compare (owner's tests 21/11/2026, A2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestUserCard, cardSpend, cardGain, withCard, addToDisplay, cardInclLine, cardValuePerPound } from '../src/lib/cardEarn.js';

const platformCards = [
  { code: 'chase-uk', name: 'Chase UK Debit', card_earn_rate: 1, card_earn_unit: 'pct' },
  { code: 'amex-gold', name: 'Amex Gold', card_earn_rate: 1, card_earn_unit: 'points', card_point_value_gbp: 0.005 },
  { code: 'barclaycard-avios', name: 'Barclaycard Avios', card_earn_rate: 1, card_earn_unit: 'avios' },
  { code: 'monzo', name: 'Monzo', card_earn_rate: null, card_earn_unit: null },
];

test('the card is valued per £1: pct, Avios at £0.0092, points at their value', () => {
  assert.equal(cardValuePerPound(platformCards[0]), 0.01);
  assert.equal(cardValuePerPound(platformCards[1]), 0.005);
  assert.equal(cardValuePerPound(platformCards[2]), 0.0092);
  assert.equal(cardValuePerPound(platformCards[3]), 0);
  assert.equal(cardValuePerPound({ card_earn_rate: 1, card_earn_unit: 'points' }), 0); // no point value
});

test('the best saved card wins; cards with no rate are ignored', () => {
  const best = bestUserCard([{ card_provider: 'amex-gold' }, { card_provider: 'chase-uk' }, { card_provider: 'monzo' }], platformCards);
  assert.equal(best.name, 'Chase UK Debit');
  assert.equal(bestUserCard([{ card_provider: 'monzo' }, { card_provider: 'Some Bank' }], platformCards), null);
  assert.equal(bestUserCard([], platformCards), null);
});

const card1 = bestUserCard([{ card_provider: 'chase-uk' }], platformCards);
const nx = { source: 'auto', strategy: { type: 'cashback', layers: [{ kind: 'cashback', platform: 'NX Rewards', ratePct: 10 }] }, gbpReturn: 10, gbpReturnDisplay: '£10.00' };

test('owner: a 1% card, Currys £100, NX → £11.00 in the total', () => {
  const r = withCard(nx, 100, card1);
  assert.equal(r.gbpReturn, 11);
  assert.equal(r.gbpReturnDisplay, '£11.00');
  assert.equal(r.baseGbpReturn, 10);
  assert.equal(cardInclLine(r), 'incl. £1.00 from your Chase UK Debit');
});

test('no saved card: the route is unchanged', () => {
  assert.equal(withCard(nx, 100, null), nx);
});

test('the card earns on the money that leaves it', () => {
  // Gift card 5.1% off £100: the card pays £94.90.
  const gc = { source: 'auto', strategy: { type: 'gift_card', layers: [{ kind: 'gift_card', discountPct: 5.1 }] } };
  assert.equal(cardSpend(gc, 100), 94.9);
  assert.equal(cardGain(cardSpend(gc, 100), card1), 0.95);
  // Student 15% then cashback: the card pays the £85.
  const st = { source: 'auto', strategy: { type: 'student', paidAmount: 85, layers: [{ kind: 'student' }, { kind: 'cashback' }] } };
  assert.equal(cardSpend(st, 100), 85);
  // Student 15% then a 5% gift card: the card pays the gift card, £80.75.
  const stGc = { source: 'auto', strategy: { type: 'student', paidAmount: 85, layers: [{ kind: 'student' }, { kind: 'gift_card', discountPct: 5 }] } };
  assert.equal(cardSpend(stGc, 100), 80.75);
  // Pump Up paid by bank transfer: nothing by card.
  const pu = { source: 'auto', strategy: { type: 'gift_card', pumpUp: { byCard: false }, layers: [{ kind: 'gift_card', discountPct: 30 }] } };
  assert.equal(cardSpend(pu, 100), 0);
  // Curated: gift-card step, then cashback.
  const cur = { source: 'curated', curated: { live: { liveParts: [{ kind: 'gift_card', value: 4 }, { kind: 'cashback', value: 2 }] } } };
  assert.equal(cardSpend(cur, 100), 96);
});

test('displays: ranges, points and mixed', () => {
  assert.equal(addToDisplay('£3.00–£10.00', 1), '£4.00–£11.00');
  assert.equal(addToDisplay('600 Avios', 1), '600 Avios + £1.00');
  assert.equal(addToDisplay('£5.10 + 600 Avios', 0.95), '£6.05 + 600 Avios');
  assert.equal(addToDisplay('£5.00', 0), '£5.00');
});
