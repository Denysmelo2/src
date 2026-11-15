// lib/bonusOffers (handover 14/11/2026, task D): /compare showed
// Sainsbury's new-customer Avios bonus twice, once per channel.
// Real rows of 14/11/2026.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickBonuses, bonusSubtitle, matchesContext } from '../src/lib/bonusOffers.js';

const BA = 'British Airways Avios';
const APP_NEW = { id: 'app', airline: BA, bonus_points: 2400, customer_type: 'new', channel: 'app', min_spend: 50 };
const WEB_NEW = { id: 'web', airline: BA, bonus_points: 2160, customer_type: 'new', channel: 'web', min_spend: 50 };
const EXISTING = { id: 'ex', airline: BA, bonus_points: 288, customer_type: 'existing', channel: 'any', min_spend: 50 };
const ALL = [WEB_NEW, APP_NEW, EXISTING];

test('no context: one route per customer type, the best channel', () => {
  const picked = pickBonuses(ALL);
  assert.deepEqual(picked.map((p) => p.bonus.id).sort(), ['app', 'ex']);
  const newRoute = picked.find((p) => p.bonus.id === 'app');
  assert.deepEqual(newRoute.otherChannels, [{ channel: 'web', points: 2160 }]);
  assert.equal(newRoute.existingPoints, 288);
  assert.equal(picked.find((p) => p.bonus.id === 'ex').existingPoints, null);
});

test('the new-customer subtitle says so, with the other channel and the existing-customer figure', () => {
  const newRoute = pickBonuses(ALL).find((p) => p.bonus.id === 'app');
  assert.equal(
    bonusSubtitle(newRoute, 'Avios'),
    '2,400 Avios per order (new customers only · app · min £50) · website: 2,160 · existing customers: 288'
  );
  const ex = pickBonuses(ALL).find((p) => p.bonus.id === 'ex');
  assert.equal(bonusSubtitle(ex, 'Avios'), '288 Avios per order (existing customers · min £50)');
});

test('with a context (store page): only the matching bonus, best per programme', () => {
  const ctx = { customerType: 'new', channel: 'web' };
  const reachable = ALL.filter((b) => matchesContext(b, ctx));
  const picked = pickBonuses(reachable, { context: ctx });
  assert.equal(picked.length, 1);
  assert.equal(picked[0].bonus.id, 'web');
  assert.deepEqual(picked[0].otherChannels, []);
  const existingCtx = { customerType: 'existing', channel: 'app' };
  assert.deepEqual(
    pickBonuses(ALL.filter((b) => matchesContext(b, existingCtx)), { context: existingCtx }).map((p) => p.bonus.id),
    ['ex']
  );
});

test('a single bonus for everyone is shown as before', () => {
  const only = [{ id: 'x', airline: BA, bonus_points: 800, customer_type: 'any', channel: 'any', min_spend: 0 }];
  const picked = pickBonuses(only);
  assert.equal(picked.length, 1);
  assert.equal(bonusSubtitle(picked[0], 'Avios'), '800 Avios per order');
});

test('two programmes stay separate', () => {
  const other = { ...APP_NEW, id: 'vs', airline: 'Virgin Points', bonus_points: 1000 };
  assert.equal(pickBonuses([...ALL, other]).length, 3);
});

test('nothing reachable: no route', () => {
  assert.deepEqual(pickBonuses([]), []);
  assert.deepEqual(pickBonuses(undefined), []);
});
