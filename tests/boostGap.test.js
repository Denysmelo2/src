// Hot deals: "Best option" and "£X less than the best option" (22/11/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gbpOn, boostGaps } from '../src/lib/boostGap.js';

test('a rate in £ on £100', () => {
  assert.equal(gbpOn('cashback', 10), 10);
  assert.equal(gbpOn('gift_card', 5.5), 5.5);
  assert.ok(Math.abs(gbpOn('points', 6) - 5.52) < 1e-9); // 6 Avios/£ × £100 × £0.0092
});

test('every card after the first says how far it is behind', () => {
  const gaps = boostGaps([
    { id: 'a', kind: 'cashback', rateValue: 12 },
    { id: 'b', kind: 'cashback', rateValue: 7.5 },
    { id: 'c', kind: 'cashback', rateValue: 12 },
  ]);
  assert.equal(gaps.has('a'), false);
  assert.equal(gaps.get('b'), '£4.50 less than the best option, on £100');
  assert.equal(gaps.get('c'), 'Same as the best option');
  const avios = boostGaps([
    { id: 'x', kind: 'points', rateValue: 10 },
    { id: 'y', kind: 'points', rateValue: 6 },
  ]);
  assert.equal(avios.get('y'), '£3.68 less than the best option, on £100');
  assert.equal(boostGaps([{ id: 'solo', kind: 'cashback', rateValue: 3 }]).size, 0);
});
