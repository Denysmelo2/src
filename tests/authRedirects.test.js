// lib/authRedirects (handover 08/11/2026 "tarde", task B): the auth
// e-mail links must never point at localhost in production, and a
// password-recovery sign-in must end on /reset-password.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSiteOrigin, recoveryTarget, isLocalUrl } from '../src/lib/authRedirects.js';

const SITE = 'https://snapgain.uk';

test('production: the localhost value of the old .env.local is ignored', () => {
  assert.equal(pickSiteOrigin('http://localhost:5173', { isDev: false, pageOrigin: SITE }), SITE);
  assert.equal(pickSiteOrigin('http://localhost:5173 ', { isDev: false, pageOrigin: SITE }), SITE);
  assert.equal(pickSiteOrigin('http://127.0.0.1:5173/', { isDev: false, pageOrigin: SITE }), SITE);
});

test('development: localhost is fine', () => {
  assert.equal(
    pickSiteOrigin('http://localhost:5173', { isDev: true, pageOrigin: 'http://localhost:5173' }),
    'http://localhost:5173'
  );
});

test('a real site address is used, without a trailing slash or path', () => {
  assert.equal(pickSiteOrigin('https://snapgain.uk', { isDev: false, pageOrigin: 'https://x.vercel.app' }), SITE);
  assert.equal(pickSiteOrigin('https://snapgain.uk/', { isDev: false, pageOrigin: 'https://x.vercel.app' }), SITE);
  assert.equal(pickSiteOrigin('https://snapgain.uk/app', { isDev: false, pageOrigin: 'https://x.vercel.app' }), SITE);
});

test('missing or broken values fall back to the page origin', () => {
  for (const v of [undefined, '', '   ', 'snapgain', 'ftp://snapgain.uk', 'javascript:alert(1)']) {
    assert.equal(pickSiteOrigin(v, { isDev: false, pageOrigin: SITE }), SITE, String(v));
  }
});

test('isLocalUrl', () => {
  assert.equal(isLocalUrl('http://localhost:5173'), true);
  assert.equal(isLocalUrl('http://0.0.0.0:3000'), true);
  assert.equal(isLocalUrl('https://snapgain.uk'), false);
  assert.equal(isLocalUrl('https://localhost.snapgain.uk'), false);
  assert.equal(isLocalUrl('nonsense'), false);
});

test('a recovery sign-in anywhere goes to /reset-password', () => {
  assert.equal(recoveryTarget('PASSWORD_RECOVERY', '/'), '/reset-password');
  assert.equal(recoveryTarget('PASSWORD_RECOVERY', '/auth/callback'), '/reset-password');
});

test('already on the reset page, or any other event: stay', () => {
  assert.equal(recoveryTarget('PASSWORD_RECOVERY', '/reset-password'), null);
  assert.equal(recoveryTarget('PASSWORD_RECOVERY', '/reset-password/'), null);
  for (const e of ['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'USER_UPDATED']) {
    assert.equal(recoveryTarget(e, '/'), null, e);
  }
});
