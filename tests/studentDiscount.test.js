// Student discounts on the site (handover 17/11/2026, task 3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  studentMath, studentSearchView, bestStudentOffer, studentOffersForStore, studentBadgeText, studentLine,
} from '../src/lib/studentDiscount.js';

test("owner's example: £100, 15% student code, NX 10% on what is paid → £23.50", () => {
  assert.deepEqual(studentMath(100, 15, 10), { paid: 85, saving: 15, other: 8.5, total: 23.5 });
});

test('the same formula with other numbers (the robots read new ones every day)', () => {
  // 10% code + 7% cashback on £60: pay 54, save 6, cashback 3.78 → 9.78
  assert.deepEqual(studentMath(60, 10, 7), { paid: 54, saving: 6, other: 3.78, total: 9.78 });
  // gift card 6.5% on the rest: £100, 10% → pay 90, gift card saves 5.85
  assert.deepEqual(studentMath(100, 10, 6.5), { paid: 90, saving: 10, other: 5.85, total: 15.85 });
  // student code alone
  assert.deepEqual(studentMath(100, 15), { paid: 85, saving: 15, other: 0, total: 15 });
});

test('best of Student Beans and UNiDAYS today, named alone', () => {
  const rows = [
    { platform: 'unidays', discount_pct: '10', channel: 'online', last_verified_at: '2026-11-17' },
    { platform: 'studentbeans', discount_pct: '15', channel: 'online', last_verified_at: '2026-11-17' },
  ];
  const best = bestStudentOffer(rows);
  assert.equal(best.platform, 'studentbeans');
  assert.equal(best.pct, 15);
  assert.equal(studentBadgeText(best), 'Student −15%');
  assert.equal(studentLine(best), '15% student discount on Student Beans');
  assert.deepEqual(studentOffersForStore(rows).map((o) => o.label), ['Student Beans', 'UNiDAYS']);
  assert.equal(studentLine({ ...best, channel: 'instore' }), '15% student discount on Student Beans · in store only');
  assert.equal(bestStudentOffer([]), null);
});

const STORES = [{ id: 'asos' }, { id: 'nx-only' }, { id: 'student-only' }, { id: 'empty' }];
const LIVE = new Set(['asos', 'nx-only']);
const STUDENT = new Map([
  ['asos', { pct: 10 }],
  ['student-only', { pct: 20 }],
]);

test('not a student: a store whose only offer is a student discount is left out; nothing else changes', () => {
  const v = studentSearchView({ stores: STORES, live: LIVE, student: STUDENT, isStudent: false });
  assert.deepEqual(v.stores.map((s) => s.id), ['asos', 'nx-only', 'empty']);
  assert.equal(v.live, LIVE);
});

test('a student: student-only stores stay and count as having an offer', () => {
  const v = studentSearchView({ stores: STORES, live: LIVE, student: STUDENT, isStudent: true });
  assert.deepEqual(v.stores.map((s) => s.id), ['asos', 'nx-only', 'student-only', 'empty']);
  assert.deepEqual([...v.live].sort(), ['asos', 'nx-only', 'student-only']);
});

test('while loading, the lists are left as they are', () => {
  assert.deepEqual(studentSearchView({ stores: STORES, live: null, student: STUDENT, isStudent: false }).stores, STORES);
  assert.deepEqual(studentSearchView({ stores: STORES, live: LIVE, student: null, isStudent: true }).live, LIVE);
});
