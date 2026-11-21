// lib/storeSearch (handover 14/11/2026, task E): stores with a live
// offer come first in the search; empty stores stay, marked, after them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankStores, dedupeByName, hasNoOffers, matchTier } from '../src/lib/storeSearch.js';

const s = (id, name) => ({ id, name });
const JL = s('jl', 'John Lewis');
const JLP = s('jlp', 'John Lewis & Partners');
const BK1 = s('bk1', 'Booking.com');
const BK2 = s('bk2', 'Booking.com');
const NEXT = s('next', 'Next');
const NEXTDAY = s('nd', 'Next Day Flyers');

test('match tiers', () => {
  assert.equal(matchTier('John Lewis', 'john lewis'), 0);
  assert.equal(matchTier('John Lewis & Partners', 'john'), 1);
  assert.equal(matchTier('All Saints', 'saint'), 2);
  assert.equal(matchTier('Tesco', 'zara'), -1);
  assert.equal(matchTier('Tesco', '  '), -1);
});

test('"John Lewis": the store with offers comes before the empty exact match', () => {
  const live = new Set(['jlp']);
  assert.deepEqual(rankStores([JL, JLP], 'John Lewis', live).map((x) => x.id), ['jlp', 'jl']);
  assert.equal(hasNoOffers(JL, live), true);
  assert.equal(hasNoOffers(JLP, live), false);
});

test('while offers load, the name order holds (exact, then starts with)', () => {
  assert.deepEqual(rankStores([JLP, JL], 'John Lewis', null).map((x) => x.id), ['jl', 'jlp']);
  assert.equal(hasNoOffers(JL, null), false);
});

test('"Booking": of two Booking.com rows, the one with an offer is kept by the dedupe', () => {
  const live = new Set(['bk2']);
  const ranked = rankStores([BK1, BK2], 'Booking', live);
  assert.deepEqual(dedupeByName(ranked).map((x) => x.id), ['bk2']);
});

test('nothing is hidden: empty stores stay after the live ones', () => {
  const live = new Set(['nd']);
  assert.deepEqual(rankStores([NEXT, NEXTDAY], 'next', live).map((x) => x.id), ['nd', 'next']);
});

test('matchOnly false keeps rows the database already matched', () => {
  const rows = [s('a', 'Sainsburys Bank'), s('b', "Sainsbury's")];
  assert.deepEqual(rankStores(rows, "sainsbury's", new Set(['a']), { matchOnly: false }).map((x) => x.id), ['a', 'b']);
});

test('dedupe keys: the same as the autocomplete used before', () => {
  const rows = [s('1', "Sainsbury's Grocery"), s('2', 'Sainsburys Grocery'), s('3', 'The Body Shop'), s('4', 'Body Shop'), s('5', 'Adidas')];
  assert.deepEqual(dedupeByName(rows).map((x) => x.id), ['1', '3', '5']);
});

import { storeCountText } from '../src/lib/storeSearch.js';

test('store count: rounded down to the hundred (owner, 21/11/2026, A4)', () => {
  assert.equal(storeCountText(8621), '8,600+');
  assert.equal(storeCountText(7144), '7,100+');
  assert.equal(storeCountText(99), null);
  assert.equal(storeCountText(undefined), null);
});
