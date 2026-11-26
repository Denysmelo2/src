// The ebook read inside the site, in /library (handover
// docs/HANDOVER_CLAUDE_CODE_2026-11-26-ebook.md, 26/11/2026; owner: "Sim,
// abrir para assinantes").
//
// Chapters live in public.ebook_chapters (migration 0053). Who reads what
// is decided in the database (RLS): chapter 1 for everyone, the rest only
// for Pro (can_read_pro(): active/trialing, local trial, admin). The
// functions here only decide what the page shows; they never unlock a
// chapter the database does not send.
//
// Pure: tests/ebook.test.js runs them without a browser.

/** The books in the library. Only one today. */
export const EBOOKS = [
  {
    slug: 'stop-losing-money',
    productId: 'd88f9512-d0b9-4fb5-9773-72ff4dd86d3b',
    locale: 'en',
    title: 'Stop Losing Money',
    subtitle:
      'The guide behind SnapGain: cashback, gift cards, air miles and the strategies that stack them, for everyone living in the UK.',
    freeChapters: [1],
  },
];

export const ebookBySlug = (slug) => EBOOKS.find((b) => b.slug === slug) || null;

export const bookPath = (book) => `/library/${book.slug}`;
export const chapterPath = (book, n) => `/library/${book.slug}/${n}`;

/** "3" -> 3; anything that is not a whole number from 1 up -> null. */
export function parseChapterNumber(raw) {
  const s = String(raw ?? '').trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 ? n : null;
}

/** Is the chapter open to someone who is not a subscriber? */
export const isFreeChapter = (book, n) => Boolean(book?.freeChapters?.includes(n));

/** May this reader open the chapter? isPro: useSubscription's isPremium || isAdmin. */
export const canOpenChapter = (book, n, isPro) => Boolean(isPro) || isFreeChapter(book, n);

/**
 * The previous and next chapters around n, from the table of contents
 * ([{ chapter_number, title }], any order). -> { prev, next } (each a toc
 * entry or null).
 */
export function neighbours(toc, n) {
  const list = [...(toc || [])].sort((a, b) => a.chapter_number - b.chapter_number);
  const i = list.findIndex((c) => c.chapter_number === n);
  if (i < 0) return { prev: null, next: null };
  return { prev: list[i - 1] || null, next: list[i + 1] || null };
}

/**
 * "PART III: CASHBACK" -> { part: 'Part III', name: 'Cashback' };
 * "Introduction" -> { part: null, name: 'Introduction' }.
 * Titles in capitals are put in title case for the contents list.
 */
export function splitTitle(title) {
  const t = String(title || '').trim();
  const m = t.match(/^(PART\s+[IVXLC]+)\s*[:.\-–]\s*(.+)$/i);
  const part = m ? `Part ${m[1].replace(/^PART\s+/i, '').toUpperCase()}` : null;
  let name = m ? m[2].trim() : t;
  if (name && name === name.toUpperCase()) {
    const small = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'uk']);
    name = name
      .toLowerCase()
      .split(/\s+/)
      .map((w, i) => {
        if (w === 'uk') return 'UK';
        if (i > 0 && small.has(w)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(' ');
  }
  return { part, name };
}

/** The preference key that remembers the last chapter opened (user_profiles.preferences, 0048). */
export const PROGRESS_KEY = 'ebookProgress';

/** Preferences with the last chapter of this book set to n. */
export function withProgress(prefs, book, n, now = new Date()) {
  const all = prefs && typeof prefs[PROGRESS_KEY] === 'object' && prefs[PROGRESS_KEY] ? prefs[PROGRESS_KEY] : {};
  return { ...prefs, [PROGRESS_KEY]: { ...all, [book.slug]: { chapter: n, at: now.toISOString() } } };
}

/** The last chapter opened of this book, or null. */
export function lastChapter(prefs, book) {
  const n = prefs?.[PROGRESS_KEY]?.[book.slug]?.chapter;
  return Number.isInteger(n) && n >= 1 ? n : null;
}
