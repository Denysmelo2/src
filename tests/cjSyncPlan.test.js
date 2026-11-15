// cj-sync offers (handover 14/11/2026, task C): on 14/11 each call
// inserted another offer with rate = null. No rate, no offer; one offer
// per store, updated in place.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planOffers, storeDomain, usableRate, CJ_PLATFORM } from '../supabase/functions/cj-sync/plan.ts';

const NOW = '2026-11-14T15:00:00.000Z';

test('no rate (what the products feed gives): nothing is written', () => {
  const plan = planOffers([{ storeId: 's1', link: 'https://www.anrdoezrs.net/click-1', rate: null }], new Map(), NOW);
  assert.deepEqual(plan.inserts, []);
  assert.deepEqual(plan.updates, []);
  assert.equal(plan.skippedNoRate, 1);
});

test('the 14/11 case run twice: still no row', () => {
  const coffee = { storeId: 'coffee-friend', link: 'https://www.jdoqocy.com/product', rate: null };
  const first = planOffers([coffee], new Map(), NOW);
  const second = planOffers([coffee], new Map(), NOW);
  assert.equal(first.inserts.length + second.inserts.length, 0);
});

test('with a rate: insert once, then update the same row', () => {
  const c = { storeId: 's1', link: 'https://shop.example/', rate: '5%' };
  const first = planOffers([c, c], new Map(), NOW);
  assert.equal(first.inserts.length, 1);
  assert.deepEqual(first.inserts[0], {
    store_id: 's1', platform: CJ_PLATFORM, rate: 5, affiliate_link: 'https://shop.example/', last_verified_at: NOW, is_active: true,
  });
  const second = planOffers([c], new Map([['s1', 'offer-9']]), NOW);
  assert.equal(second.inserts.length, 0);
  assert.deepEqual(second.updates, [{ id: 'offer-9', rate: 5, affiliate_link: 'https://shop.example/', last_verified_at: NOW, is_active: true }]);
});

test('no store: skipped and counted', () => {
  const plan = planOffers([{ storeId: undefined, link: 'x', rate: 4 }], new Map(), NOW);
  assert.equal(plan.skippedNoStore, 1);
  assert.equal(plan.inserts.length, 0);
});

test('usable rates', () => {
  assert.equal(usableRate(5), 5);
  assert.equal(usableRate('2.5'), 2.5);
  assert.equal(usableRate('7%'), 7);
  for (const bad of [null, undefined, '', 0, -1, 101, 'n/a', NaN]) assert.equal(usableRate(bad), null, String(bad));
});

test('a store domain never comes from a CJ click link', () => {
  assert.equal(storeDomain('https://www.anrdoezrs.net/links/123/type/dlg/https://coffeefriend.co.uk'), null);
  assert.equal(storeDomain('https://www.dpbolvw.net/click-1-2'), null);
  assert.equal(storeDomain('https://www.coffeefriend.co.uk/product/x'), 'coffeefriend.co.uk');
  assert.equal(storeDomain(''), null);
  assert.equal(storeDomain('not a url'), null);
});
