// The ebook in /library (handover 26/11/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ebookBySlug,
  chapterPath,
  parseChapterNumber,
  canOpenChapter,
  neighbours,
  splitTitle,
  withProgress,
  lastChapter,
} from '../src/lib/ebook.js';

const book = ebookBySlug('stop-losing-money');
const TOC = [
  { chapter_number: 2, title: 'PART I: THE PROBLEM EVERY IMMIGRANT IN THE UK FACES' },
  { chapter_number: 1, title: 'Introduction' },
  { chapter_number: 3, title: 'PART II: THE DISCOVERY THAT CHANGES EVERYTHING' },
  { chapter_number: 9, title: 'PART VIII: Valuable Resources' },
];

test('the book and its addresses', () => {
  assert.equal(book.productId, 'd88f9512-d0b9-4fb5-9773-72ff4dd86d3b');
  assert.equal(chapterPath(book, 1), '/library/stop-losing-money/1');
  assert.equal(ebookBySlug('nope'), null);
  assert.equal(parseChapterNumber('3'), 3);
  for (const bad of ['0', '-1', 'x', '1.5', '', undefined, '1000']) assert.equal(parseChapterNumber(bad), null, String(bad));
});

test('a non-subscriber opens chapter 1 only; a subscriber opens all', () => {
  assert.equal(canOpenChapter(book, 1, false), true);
  assert.equal(canOpenChapter(book, 2, false), false);
  assert.equal(canOpenChapter(book, 9, false), false);
  assert.equal(canOpenChapter(book, 2, true), true);
});

test('previous and next follow the chapter numbers', () => {
  assert.deepEqual(neighbours(TOC, 1), { prev: null, next: TOC[0] });
  assert.equal(neighbours(TOC, 3).next.chapter_number, 9);
  assert.equal(neighbours(TOC, 9).next, null);
  assert.deepEqual(neighbours(TOC, 5), { prev: null, next: null });
});

test('titles: the part apart, capitals in title case', () => {
  assert.deepEqual(splitTitle('Introduction'), { part: null, name: 'Introduction' });
  assert.deepEqual(splitTitle('PART III: CASHBACK'), { part: 'Part III', name: 'Cashback' });
  assert.deepEqual(splitTitle('PART I: THE PROBLEM EVERY IMMIGRANT IN THE UK FACES'), {
    part: 'Part I',
    name: 'The Problem Every Immigrant in the UK Faces',
  });
  assert.deepEqual(splitTitle('PART VIII: Valuable Resources'), { part: 'Part VIII', name: 'Valuable Resources' });
});

test('reading progress goes in the preferences, keeping the rest', () => {
  const prefs = { theme: 'dark', walletOnly: true };
  const p = withProgress(prefs, book, 4, new Date('2026-11-26T20:00:00Z'));
  assert.equal(p.theme, 'dark');
  assert.equal(p.walletOnly, true);
  assert.deepEqual(p.ebookProgress, { 'stop-losing-money': { chapter: 4, at: '2026-11-26T20:00:00.000Z' } });
  assert.equal(lastChapter(p, book), 4);
  assert.equal(lastChapter({}, book), null);
  assert.equal(lastChapter(null, book), null);
});

test('the book CSS stays inside the reader', () => {
  const css = fs.readFileSync(new URL('../src/styles/ebook.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  // Every selector of every rule (inside @media too) starts at .chapter-content
  // or at the site's .dark followed by .chapter-content.
  const selectors = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map((m) => m[1].trim())
    .filter((s) => s && !s.startsWith('@'))
    .flatMap((s) => s.split(',').map((x) => x.trim()));
  assert.ok(selectors.length > 100, `only ${selectors.length} selectors`);
  for (const s of selectors) {
    assert.match(s, /^(\.dark )?\.chapter-content\b/, s);
  }
  assert.doesNotMatch(css, /data-theme/);
});

test('the migration: chapter 1 for everyone, the rest for Pro, no writes', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/0053_ebook_chapters.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /using \(chapter_number = 1 or public\.can_read_pro\(\)\)/);
  assert.match(sql, /subscription_status in \('active', 'trialing'\)/);
  assert.match(sql, /p\.trial_end > now\(\)/);
  assert.match(sql, /p\.role = 'admin'/);
  assert.match(sql, /revoke all on table public\.ebook_chapters from anon, authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*ebook_chapters/i);
  assert.doesNotMatch(sql, /for (insert|update|delete|all)/i);
});
