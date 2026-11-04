// lib/rankRoutes: order of the /compare route boxes (handover 04/11/2026
// "estratégias", task 5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankRoutes, splitCurated } from '../src/lib/rankRoutes.js';

const r = (id, source, gbpReturn) => ({ id, source, gbpReturn });

test("a tie in £ goes to the automatic route (Sainsbury's: NX 10% before the curated card)", () => {
  const out = rankRoutes([r('curated-nx-or-avios', 'curated', 10), r('auto-nx', 'auto', 10), r('auto-avios', 'auto', 7.36)]);
  assert.deepEqual(out.map((x) => x.id), ['auto-nx', 'curated-nx-or-avios', 'auto-avios']);
});

test('half a penny apart still counts as a tie; more than that does not', () => {
  assert.deepEqual(rankRoutes([r('c', 'curated', 10.004), r('a', 'auto', 10)]).map((x) => x.id), ['a', 'c']);
  assert.deepEqual(rankRoutes([r('c', 'curated', 10.01), r('a', 'auto', 10)]).map((x) => x.id), ['c', 'a']);
});

test('a curated route that pays more stays first (Amazon via Currys)', () => {
  const out = rankRoutes([r('auto-gc', 'auto', 3), r('curated-currys', 'curated', 7.5), r('curated-rakuten', 'curated', 2)]);
  assert.deepEqual(out.map((x) => x.id), ['curated-currys', 'auto-gc', 'curated-rakuten']);
});

test('equal routes of the same kind keep their order; input is not changed', () => {
  const input = [r('a1', 'auto', 5), r('a2', 'auto', 5)];
  assert.deepEqual(rankRoutes(input).map((x) => x.id), ['a1', 'a2']);
  assert.equal(input[0].id, 'a1');
});

test('live_compare cards are kept out of the ranking', () => {
  const { ranked, compare } = splitCurated([
    { id: 1, slug: 'amazon-optimiser', live_compare: false },
    { id: 2, slug: 'sainsburys-max-stack', live_compare: true },
  ]);
  assert.deepEqual(ranked.map((x) => x.slug), ['amazon-optimiser']);
  assert.deepEqual(compare.map((x) => x.slug), ['sainsburys-max-stack']);
});
