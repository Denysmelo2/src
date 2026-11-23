// Rakuten (handover 23/11/2026): exclusions and "See terms".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRakutenPlatform, exclusionLine, termsLines } from '../src/lib/cashbackTerms.js';

test('Rakuten, however spelt, and its exclusion line', () => {
  assert.equal(isRakutenPlatform('rakuten'), true);
  assert.equal(isRakutenPlatform(' Rakuten '), true);
  assert.equal(isRakutenPlatform('quidco'), false);
  assert.equal(exclusionLine('rakuten'), 'No cashback on gift cards or non-Rakuten codes.');
  assert.equal(exclusionLine('NX Rewards'), null);
});

test('the shop terms as short lines', () => {
  const t = 'Cashback is not available on gift cards or adjustments.\n\n  Users with promotional rates:  Maximum Cashback awarded per order will be £40.\ncashback is not available on gift cards or adjustments.';
  assert.deepEqual(termsLines(t), [
    'Cashback is not available on gift cards or adjustments.',
    'Users with promotional rates: Maximum Cashback awarded per order will be £40.',
  ]);
  assert.deepEqual(termsLines(null), []);
  assert.equal(termsLines(Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')).length, 12);
});
