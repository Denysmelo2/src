// Edge Functions nx-network-sync and cj-sync: who may call them, and
// what a dry run is (handover 14/11/2026, task C). On 14/11 the site's
// publishable key ran both and each wrote to the database.
// Node 22.18+ runs the .ts helper directly (type stripping).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isAuthorized, wantsDryRun } from '../supabase/functions/nx-network-sync/request.ts';

const KEYS = { internalKey: 'internal-secret-123', serviceRoleKey: 'service-role-xyz' };
const h = (obj) => new Headers(obj);

test('the internal key or the service role key gets in', () => {
  assert.equal(isAuthorized(h({ 'x-internal-key': 'internal-secret-123' }), KEYS), true);
  assert.equal(isAuthorized(h({ authorization: 'Bearer service-role-xyz' }), KEYS), true);
  assert.equal(isAuthorized(h({ authorization: 'bearer  service-role-xyz ' }), KEYS), true);
});

test('the publishable key, a user JWT, or nothing: 401', () => {
  const publishable = 'sb_publishable_example';
  assert.equal(isAuthorized(h({ apikey: publishable, authorization: `Bearer ${publishable}` }), KEYS), false);
  assert.equal(isAuthorized(h({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.user.jwt' }), KEYS), false);
  assert.equal(isAuthorized(h({}), KEYS), false);
  assert.equal(isAuthorized(h({ 'x-internal-key': 'internal-secret-12' }), KEYS), false);
  assert.equal(isAuthorized(h({ 'x-internal-key': 'service-role-xyz' }), KEYS), false);
});

test('an unset key never matches an empty header', () => {
  assert.equal(isAuthorized(h({ 'x-internal-key': '' }), { internalKey: '', serviceRoleKey: '' }), false);
  assert.equal(isAuthorized(h({ authorization: 'Bearer ' }), { internalKey: null, serviceRoleKey: null }), false);
  assert.equal(isAuthorized(h({ 'x-internal-key': 'x' }), { internalKey: undefined, serviceRoleKey: 'k' }), false);
});

test('dry run: every documented form', () => {
  const url = 'https://x.supabase.co/functions/v1/nx-network-sync';
  assert.equal(wantsDryRun(url, { dryRun: true }), true);
  assert.equal(wantsDryRun(url, { dry_run: true }), true); // ignored before 14/11
  assert.equal(wantsDryRun(url, { dry_run: '1' }), true);
  assert.equal(wantsDryRun(`${url}?dry_run=1`, {}), true);
  assert.equal(wantsDryRun(`${url}?dryRun=true`, null), true);
});

test('a real run only when nothing asks for a dry run', () => {
  const url = 'https://x.supabase.co/functions/v1/nx-network-sync';
  assert.equal(wantsDryRun(url, {}), false);
  assert.equal(wantsDryRun(url, null), false);
  assert.equal(wantsDryRun(url, { dryRun: false, dry_run: 0 }), false);
  assert.equal(wantsDryRun(`${url}?dry_run=0`, {}), false);
});

test('cj-sync carries the same request.ts', () => {
  const a = fs.readFileSync(new URL('../supabase/functions/nx-network-sync/request.ts', import.meta.url), 'utf8');
  const b = fs.readFileSync(new URL('../supabase/functions/cj-sync/request.ts', import.meta.url), 'utf8');
  assert.equal(a, b);
});

test('both functions check the caller before doing anything', () => {
  for (const fn of ['nx-network-sync', 'cj-sync']) {
    const src = fs.readFileSync(new URL(`../supabase/functions/${fn}/index.ts`, import.meta.url), 'utf8');
    const auth = src.indexOf('if (!isAuthorized(req.headers');
    assert.ok(auth > 0, `${fn}: no isAuthorized check`);
    assert.ok(auth < src.indexOf('createClient(\n'), `${fn}: database client created before the check`);
  }
});
