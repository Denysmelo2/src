// lib/pwnedPassword: k-anonymity check against Have I Been Pwned.
// The API is mocked; only the 5-character prefix may leave the browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPwnedPassword } from '../src/lib/pwnedPassword.js';

// SHA-1("password123") = CBFDAC6008F9CAB4083784CBD1874F76618D2A97
const PREFIX = 'CBFDA';
const SUFFIX = 'C6008F9CAB4083784CBD1874F76618D2A97';

function mockFetch(body, { status = 200, seen = [] } = {}) {
  return async (url, init) => {
    seen.push({ url, init });
    return { ok: status === 200, status, text: async () => body };
  };
}

test('a breached password is found; only the 5-char prefix is sent, with padding', async () => {
  const seen = [];
  const body = `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${SUFFIX}:251682\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0`;
  assert.equal(await isPwnedPassword('password123', { fetchImpl: mockFetch(body, { seen }) }), true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, `https://api.pwnedpasswords.com/range/${PREFIX}`);
  assert.ok(!seen[0].url.includes('password123'));
  assert.equal(seen[0].init.headers['Add-Padding'], 'true');
});

test('a password not in the list passes', async () => {
  const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:3';
  assert.equal(await isPwnedPassword('password123', { fetchImpl: mockFetch(body) }), false);
});

test('a padding row (count 0) is not a breach', async () => {
  assert.equal(await isPwnedPassword('password123', { fetchImpl: mockFetch(`${SUFFIX}:0`) }), false);
});

test('API down, error status or timeout: unknown (null), so the form lets it through', async () => {
  assert.equal(await isPwnedPassword('password123', { fetchImpl: mockFetch('', { status: 503 }) }), null);
  assert.equal(
    await isPwnedPassword('password123', { fetchImpl: async () => { throw new Error('offline'); } }),
    null
  );
  // AbortSignal.timeout's timer does not keep Node alive; this one does.
  const slow = (url, init) =>
    new Promise((_, reject) => {
      const hold = setTimeout(() => {}, 5000);
      init.signal.addEventListener('abort', () => {
        clearTimeout(hold);
        reject(init.signal.reason);
      });
    });
  assert.equal(await isPwnedPassword('password123', { fetchImpl: slow, timeoutMs: 50 }), null);
});
