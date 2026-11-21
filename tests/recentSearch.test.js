// Recent searches from /compare (owner's tests 21/11/2026, C5).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recentQuery, parseRecent, recentHref } from '../src/lib/recentSearch.js';

test('a comparison is written with its amount and read back', () => {
  assert.equal(recentQuery('Currys', 100), 'Currys · £100');
  assert.equal(recentQuery('Boots', 49.5), 'Boots · £49.50');
  assert.equal(recentQuery('Boots', ''), 'Boots');
  assert.deepEqual(parseRecent('Currys · £100'), { name: 'Currys', amount: '100' });
  assert.deepEqual(parseRecent('marks and spencer'), { name: 'marks and spencer', amount: null });
  assert.equal(recentHref('Currys · £100'), '/search?q=Currys&amount=100');
  assert.equal(recentHref('boots'), '/search?q=boots');
});
