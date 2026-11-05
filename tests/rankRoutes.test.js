// lib/rankRoutes: order of the /compare route boxes (handover 04/11/2026
// "estratégias", task 5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankRoutes, splitCurated, mergeCopies } from '../src/lib/rankRoutes.js';

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

// Uber at £100, 05/11: with the card out, the curated "Uber gift card +
// card" is Cheddar 4.5% = £4.50, the same as the automatic Cheddar route.
const uberCurated = {
  id: 'curated-uber', source: 'curated', gbpReturn: 4.5,
  curated: { slug: 'uber-easy-combo', live: { pct: 4.5, flatGbp: 0, cardPct: 1, liveParts: [{ kind: 'gift_card', platform: 'cheddar', value: 4.5 }] } },
};
const autoCheddar = { id: 'giftcard-1', source: 'auto', gbpReturn: 4.5, strategy: { type: 'gift_card', layers: [{ platform: 'cheddar' }] } };
const autoJam = { id: 'giftcard-2', source: 'auto', gbpReturn: 2.75, strategy: { type: 'gift_card', layers: [{ platform: 'jamdoughnut' }] } };

test('Uber: the curated copy of the Cheddar route leaves the ranking and becomes its guide', () => {
  const { curated, auto } = mergeCopies([uberCurated], [autoCheddar, autoJam]);
  assert.deepEqual(curated, []);
  assert.equal(auto[0].guide.slug, 'uber-easy-combo');
  assert.equal(auto[1].guide, undefined);
  const ranked = rankRoutes([...curated, ...auto]);
  assert.deepEqual(ranked.map((x) => [x.id, x.gbpReturn]), [['giftcard-1', 4.5], ['giftcard-2', 2.75]]);
  assert.equal(autoCheddar.guide, undefined); // inputs untouched
});

test('not a copy: a fixed £, another platform, or another amount keeps the curated route', () => {
  const withFlat = { ...uberCurated, curated: { ...uberCurated.curated, live: { ...uberCurated.curated.live, flatGbp: 1 } } };
  assert.equal(mergeCopies([withFlat], [autoCheddar]).curated.length, 1);
  const otherPlatform = { ...uberCurated, curated: { ...uberCurated.curated, live: { ...uberCurated.curated.live, liveParts: [{ kind: 'gift_card', platform: 'everup', value: 4.5 }] } } };
  assert.equal(mergeCopies([otherPlatform], [autoCheddar]).curated.length, 1);
  const twoSteps = { ...uberCurated, gbpReturn: 7.5, curated: { ...uberCurated.curated, live: { ...uberCurated.curated.live, pct: 7.5 } } };
  assert.equal(mergeCopies([twoSteps], [autoCheddar]).curated.length, 1);
});
