// What the site calls the user (owner's tests 21/11/2026, C2).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayNames } from '../src/lib/displayName.js';

const user = { email: 'dede.m@example.com', user_metadata: { name: 'dede m' } };

test('the preferred name wins everywhere', () => {
  assert.deepEqual(displayNames({ preferredName: ' Dédé ', user }), { short: 'Dédé', full: 'Dédé' });
});

test('then the first name from signup, then the e-mail', () => {
  assert.deepEqual(displayNames({ preferredName: '', user }), { short: 'dede', full: 'dede m' });
  assert.deepEqual(displayNames({ user: { email: 'sam@example.com' } }), { short: 'sam', full: 'sam' });
  assert.deepEqual(displayNames({}), { short: 'there', full: 'User' });
});
