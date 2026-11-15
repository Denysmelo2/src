// JamDoughnut Pump Up on the site (handover 15/11/2026, task 4).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pumpUpInfo, pumpUpLine, untilText, baseConditions } from '../src/lib/pumpUp.js';
import { computeCuratedLive, cardLine } from '../src/lib/curatedReturn.js';

const NOW = new Date('2026-11-15T15:00:00Z');
const FAB = {
  platform: 'jamdoughnut',
  discount_pct: 33,
  valid_to: '2026-11-15T23:59:00Z',
  conditions: 'Online · Pump Up until 15/11 23:59: 33% paying by bank transfer (32% by card, 30% standard)',
};

test('Fabyouless: badge info and the short line', () => {
  const pu = pumpUpInfo(FAB, NOW);
  assert.equal(pu.pct, 33);
  assert.equal(pu.method, 'bank transfer');
  assert.equal(pu.byCard, false);
  assert.equal(pumpUpLine(pu, NOW), '33% paying by bank transfer · until 23:59 today');
});

test('the Cowork text from 15/11 ("33.0%") reads the same', () => {
  const pu = pumpUpInfo({ ...FAB, discount_pct: '33.0', conditions: 'Online · Pump Up until 15/11 23:59: 33.0% paying by bank transfer (32.0% by card, 30.0% standard)' }, NOW);
  assert.equal(pumpUpLine(pu, NOW), '33% paying by bank transfer · until 23:59 today');
});

test('no Pump Up: null; ended: null; no valid_to: null', () => {
  assert.equal(pumpUpInfo({ discount_pct: 6, conditions: 'Online, Instore', valid_to: null }, NOW), null);
  assert.equal(pumpUpInfo(FAB, new Date('2026-11-16T00:00:00Z')), null);
  assert.equal(pumpUpInfo({ ...FAB, valid_to: null }, NOW), null);
});

test('conditions without the Pump Up text', () => {
  assert.equal(baseConditions(FAB.conditions), 'Online');
  assert.equal(baseConditions('Pump Up until 15/11 23:59: 12% paying by card (10% standard)'), '');
  assert.equal(baseConditions('Online, Instore'), 'Online, Instore');
});

test('until: today, tomorrow, a later date; UK time', () => {
  assert.equal(untilText(new Date('2026-11-16T09:00:00Z'), NOW), 'until 09:00 tomorrow');
  assert.equal(untilText(new Date('2026-11-18T23:59:00Z'), NOW), 'until 18/11 23:59');
  // Summer: 22:59 UTC is 23:59 BST.
  assert.equal(untilText(new Date('2027-07-01T22:59:00Z'), new Date('2027-07-01T10:00:00Z')), 'until 23:59 today');
});

test('paying by card is said so', () => {
  const pu = pumpUpInfo({ ...FAB, discount_pct: 12, conditions: 'Online · Pump Up until 15/11 23:59: 12% paying by card (11% by bank transfer, 10% standard)' }, NOW);
  assert.equal(pu.byCard, true);
  assert.equal(pumpUpLine(pu, NOW), '12% paying by card · until 23:59 today');
});

// A curated route: buy a Fabyouless gift card on JamDoughnut, pay with a 1% card.
const STORE = { id: 's-fab', slug: 'fabyouless', name: 'Fabyouless' };
const STRATEGY = {
  target_store_id: 's-fab',
  steps: [
    { step: 1, title: 'Buy the gift card', platform_slug: 'jamdoughnut', earn_pct: 30 },
    { step: 2, title: 'Pay with a 1% card', platform_slug: 'credit_card', earn_pct: 1 },
  ],
};
const ctxWith = (offer) => ({
  contextStoreId: 's-fab',
  storesById: new Map([[STORE.id, STORE]]),
  storesBySlug: new Map([[STORE.slug, STORE]]),
  giftCards: new Map([['s-fab', [{ last_verified_at: '2026-11-15T08:00:00Z', ...offer }]]]),
  cashback: new Map(),
  now: NOW,
});

test('curated route at a bank-transfer Pump Up: highest rate, no 1% card line', () => {
  const live = computeCuratedLive(STRATEGY, ctxWith(FAB));
  assert.equal(live.pct, 33);
  assert.equal(live.cardPct, 0);
  assert.equal(cardLine(live.cardPct, 100), null);
  assert.equal(live.pumpUp.method, 'bank transfer');
  assert.equal(live.label, 'Fabyouless gift card 33% (JamDoughnut, paying by bank transfer until 23:59 today)');
});

test('curated route at a card Pump Up keeps the 1% card', () => {
  const live = computeCuratedLive(
    STRATEGY,
    ctxWith({ ...FAB, discount_pct: 32, conditions: 'Online · Pump Up until 15/11 23:59: 32% paying by card (30% standard)' })
  );
  assert.equal(live.cardPct, 1);
  assert.equal(live.label, 'Fabyouless gift card 32% (JamDoughnut, paying by card until 23:59 today)');
});

test('curated route with no Pump Up: unchanged', () => {
  const live = computeCuratedLive(STRATEGY, ctxWith({ platform: 'jamdoughnut', discount_pct: 30, conditions: 'Online', valid_to: null }));
  assert.equal(live.pct, 30);
  assert.equal(live.cardPct, 1);
  assert.equal(live.pumpUp, null);
  assert.equal(live.label, 'Fabyouless gift card 30% (JamDoughnut)');
});
