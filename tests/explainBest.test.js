// "Why it's the best option" on /compare (owner's tests 21/11/2026, B6).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainBest, routeLine } from '../src/lib/explainBest.js';

const nx = {
  id: 'nx', source: 'auto', title: 'NX Rewards', gbpReturn: 10,
  strategy: { type: 'cashback', layers: [{ kind: 'cashback', platform: 'NX Rewards', ratePct: 10, gbpReturn: 10 }] },
};
const avios = {
  id: 'avios', source: 'auto', title: 'Avios eStore', gbpReturn: 5.52,
  strategy: { type: 'points', layers: [{ kind: 'points', earnRate: 6, points: 600, pointUnit: 'Avios', gbpReturn: 5.52 }] },
};
const everup = {
  id: 'everup', source: 'auto', title: 'EverUp', gbpReturn: 5.1,
  strategy: { type: 'gift_card', layers: [{ kind: 'gift_card', discountPct: 5.1, gbpReturn: 5.1 }] },
};

test('owner: Currys £100 gives £10.00, £5.52 and £4.48', () => {
  const e = explainBest([nx, avios, everup], 100);
  assert.deepEqual(e.lines, [
    'NX Rewards: 10% of £100 = £10.00',
    'Next best, Avios eStore: 6 Avios × £100 = 600 Avios ≈ £5.52',
    'You get £4.48 more with NX Rewards.',
  ]);
  assert.equal(e.behind.get('avios'), '£4.48 less than the best option');
  assert.equal(e.behind.get('everup'), '£4.90 less than the best option');
  assert.equal(e.behind.has('nx'), false);
});

test('a strategy shows each part, up to the total', () => {
  const stack = {
    id: 's', source: 'auto', title: 'EverUp + Rakuten', gbpReturn: 7.1,
    strategy: { type: 'stack', layers: [
      { kind: 'gift_card', discountPct: 5.1, gbpReturn: 5.1 },
      { kind: 'cashback', ratePct: 2, gbpReturn: 2 },
    ] },
  };
  assert.equal(routeLine(stack, 100), 'EverUp + Rakuten: 5.1% off the gift card = £5.10 + 2% of £100 = £2.00 = £7.10');
  const student = {
    id: 'st', source: 'auto', title: 'UNiDAYS + NX Rewards', gbpReturn: 23.5,
    strategy: { type: 'student', paidAmount: 85, layers: [
      { kind: 'student', discountPct: 15, gbpReturn: 15 },
      { kind: 'cashback', ratePct: 10, gbpReturn: 8.5 },
    ] },
  };
  assert.equal(routeLine(student, 100), 'UNiDAYS + NX Rewards: 15% student code = £15.00 + 10% cashback on £85.00 = £8.50 = £23.50');
});

test("the user's card is a part of the sum", () => {
  const withCard = { ...nx, gbpReturn: 11, baseGbpReturn: 10, cardGbp: 1, cardName: 'Chase UK Debit' };
  assert.equal(routeLine(withCard, 100), 'NX Rewards: 10% of £100 = £10.00 + £1.00 from your Chase UK Debit = £11.00');
});

test('a tie says so; one route has no comparison', () => {
  const nx2 = { ...nx, id: 'nx2', title: 'Quidco' };
  const e = explainBest([nx, nx2], 100);
  assert.equal(e.lines[2], 'Both pay £10.00; NX Rewards is the simpler one.');
  assert.equal(e.behind.get('nx2'), 'Same as the best option');
  assert.deepEqual(explainBest([nx], 100).lines, ['NX Rewards: 10% of £100 = £10.00']);
  assert.equal(explainBest([], 100), null);
});
