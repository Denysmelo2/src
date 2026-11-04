// lib/curatedReturn: a curated strategy's return from today's rates
// (handover 04/11/2026 "estratégias", task 4). Rates below are the real
// ones on 04/11/2026.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCuratedLive, curatedGbp, curatedHeadline, liveStepKind } from '../src/lib/curatedReturn.js';

const AMAZON = { id: 'amazon', slug: 'amazon', name: 'Amazon' };
const CURRYS = { id: 'currys', slug: 'currys', name: 'Currys' };
const TREATWELL = { id: 'treatwell', slug: 'treatwell', name: 'Treatwell' };
const SAINSBURYS = { id: 'sainsburys', slug: 'sainsburys', name: "Sainsbury's" };

function ctx({ contextStoreId = null, giftCards = {}, cashback = {} } = {}) {
  const stores = [AMAZON, CURRYS, TREATWELL, SAINSBURYS];
  return {
    contextStoreId,
    storesBySlug: new Map(stores.map((s) => [s.slug, s])),
    storesById: new Map(stores.map((s) => [s.id, s])),
    giftCards: new Map(Object.entries(giftCards)),
    cashback: new Map(Object.entries(cashback)),
  };
}

const CARD = { step: 2, title: 'Pay with a card', earn_pct: 1, platform: 'Credit card', platform_slug: 'credit_card' };

const amazonOptimiser = {
  slug: 'amazon-optimiser',
  target_store_id: 'amazon',
  steps: [
    { step: 1, title: 'Open Amazon via Rakuten', platform: 'Rakuten', platform_slug: 'rakuten', earn_flat_gbp: 1 },
    CARD,
    { step: 3, title: 'Complete the order', platform: 'Amazon', platform_slug: 'amazon' },
  ],
};

const amazonViaCurrys = {
  slug: 'amazon-currys-everywish',
  target_store_id: 'amazon',
  steps: [
    { step: 1, title: 'Buy a Currys gift card', earn_pct: 6.5, platform: 'Cheddar', platform_slug: 'cheddar', store_slug: 'currys' },
    CARD,
    { step: 3, title: 'Buy an EVERYWISH card', platform: 'Currys', platform_slug: 'currys' },
  ],
};

const CURRYS_GC = [
  { platform: 'cheddar', discount_pct: 6.5, last_verified_at: '2026-11-04T08:20:00Z' },
  { platform: 'everup', discount_pct: 5.9, last_verified_at: '2026-11-03T08:20:00Z' },
  { platform: 'jamdoughnut', discount_pct: 3, last_verified_at: '2026-11-04T08:02:00Z' },
];

test('Amazon with Rakuten: £1 per order + 1% card = £2 on £100, not the old 5%', () => {
  const live = computeCuratedLive(amazonOptimiser, ctx({ contextStoreId: 'amazon' }));
  assert.equal(live.pct, 1);
  assert.equal(live.flatGbp, 1);
  assert.equal(live.isLive, false);
  assert.equal(live.verifiedAt, null);
  assert.equal(curatedGbp(live, 100), 2);
  assert.equal(curatedHeadline(live), '1% + £1');
  assert.equal(live.label, '£1 per order (Rakuten) + 1% card');
});

test('Amazon via a Currys gift card reads the best Currys rate today', () => {
  const live = computeCuratedLive(amazonViaCurrys, ctx({ contextStoreId: 'amazon', giftCards: { currys: CURRYS_GC } }));
  assert.deepEqual(live.missing, []);
  assert.equal(live.pct, 7.5);
  assert.equal(curatedGbp(live, 100), 7.5);
  assert.equal(live.label, 'Currys gift card 6.5% (Cheddar) + 1% card');
  assert.equal(live.verifiedAt, '2026-11-04T08:20:00Z');
});

test('the rate follows the table, not the number typed in the step', () => {
  const gc = [{ platform: 'everup', discount_pct: 5.9, last_verified_at: '2026-11-04T08:00:00Z' }];
  const live = computeCuratedLive(amazonViaCurrys, ctx({ giftCards: { currys: gc } }));
  assert.equal(live.pct, 6.9);
  assert.match(live.label, /Currys gift card 5.9% \(EverUp\)/);
});

test('no rate today for a live step: the strategy is marked missing (hidden)', () => {
  const live = computeCuratedLive(amazonViaCurrys, ctx({ contextStoreId: 'amazon' }));
  assert.deepEqual(live.missing, ['Buy a Currys gift card']);
  assert.equal(live.verifiedAt, null);
});

test('a live step without store_slug reads the store being looked at, else the target', () => {
  const treatwell = {
    slug: 'treatwell-easy-stack',
    target_store_id: 'treatwell',
    steps: [{ step: 1, title: 'Buy a Treatwell gift card', earn_pct: 8, platform: 'EverUp', platform_slug: 'everup' }, CARD],
  };
  const gc = {
    treatwell: [
      { platform: 'everup', discount_pct: 7.45, last_verified_at: '2026-11-02T08:00:00Z' },
      { platform: 'jamdoughnut', discount_pct: 7, last_verified_at: '2026-11-04T08:00:00Z' },
    ],
  };
  const live = computeCuratedLive(treatwell, ctx({ giftCards: gc }));
  assert.equal(live.pct, 8.45);
  assert.equal(live.verifiedAt, '2026-11-02T08:00:00Z');
});

test('a cashback step reads that platform only (NX at Sainsbury\'s)', () => {
  const s = {
    slug: 'sainsburys',
    target_store_id: 'sainsburys',
    steps: [{ step: 1, title: 'NX Rewards', earn_pct: 10, platform: 'NX Rewards', platform_slug: 'nx_rewards' }],
  };
  const cb = {
    sainsburys: [
      { platform: 'airtime', rate: 4, last_verified_at: '2026-11-04T09:00:00Z' },
      { platform: 'NX Rewards', rate: 10, last_verified_at: '2026-11-04T09:01:00Z' },
    ],
  };
  const live = computeCuratedLive(s, ctx({ cashback: cb }));
  assert.equal(live.pct, 10);
  assert.equal(live.label, 'NX Rewards 10%');
  assert.deepEqual(computeCuratedLive(s, ctx()).missing, ['NX Rewards']);
});

test('which steps are live', () => {
  assert.equal(liveStepKind({ earn_pct: 6, platform_slug: 'everup' }), 'gift_card');
  assert.equal(liveStepKind({ earn_pct: 10, platform_slug: 'nx_rewards' }), 'cashback');
  assert.equal(liveStepKind({ earn_pct: 1, platform_slug: 'credit_card' }), null);
  assert.equal(liveStepKind({ platform_slug: 'everup' }), null); // no earn_pct: not an earning step
  assert.equal(liveStepKind({ earn_pct: 6, platform_slug: 'everup', rate_source: 'fixed' }), null);
  assert.equal(liveStepKind({ earn_pct: 3, platform_slug: 'other', rate_source: 'gift_card' }), 'gift_card');
});

test('a strategy with no earning step has no number', () => {
  const live = computeCuratedLive({ steps: [{ step: 1, title: 'Install the app' }] }, ctx());
  assert.equal(live.pct, null);
  assert.equal(curatedGbp(live, 100), null);
  assert.equal(curatedHeadline(live), null);
});
