// studentDiscount — student discounts (Student Beans, UNiDAYS) on the site.
// Handover 17/11/2026 (descontos de estudante), task 3.
//
// The robots (snapgain-scraper#60) write one row per store and platform to
// public.student_offers (src 0045) with today's general student discount.
// Only a user with user_profiles.is_student sees any of it. Same rules as
// every other offer: active, verified in the last 30 days
// (hiddenBeforeIso), never a typed number. No link and no code: the
// student gets the code in the platform's app after verifying.
//
// Pure functions, no imports from '@/': tests/studentDiscount.test.js runs
// them under plain Node.

export const STUDENT_PLATFORM_LABEL = { studentbeans: 'Student Beans', unidays: 'UNiDAYS' };

export const STUDENT_WARNING =
  "Some stores don't pay cashback when a discount code is used — check the store's terms on the cashback site.";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;
export const pctText = (n) => `${round2(Number(n))}%`;

export function studentPlatformLabel(p) {
  return STUDENT_PLATFORM_LABEL[String(p || '').toLowerCase()] || String(p || '');
}

/**
 * Today's offers for one store, best first: [{platform, label, pct, channel, title}].
 * Rows must already be active and fresh (the query does that).
 */
export function studentOffersForStore(rows) {
  return (rows || [])
    .map((r) => ({
      platform: String(r.platform || '').toLowerCase(),
      label: studentPlatformLabel(r.platform),
      pct: num(r.discount_pct),
      channel: r.channel || 'online',
      title: r.title || null,
      lastVerifiedAt: r.last_verified_at || null,
      offerId: r.id || null,
    }))
    .filter((o) => o.pct != null)
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label));
}

/** The best of the two platforms today, or null. */
export function bestStudentOffer(rows) {
  return studentOffersForStore(rows)[0] || null;
}

/** "Student −15%" */
export function studentBadgeText(best) {
  return best ? `Student −${pctText(best.pct)}` : null;
}

/** "15% student discount on Student Beans" (+ " · in store only"). */
export function studentLine(o) {
  if (!o) return null;
  const where = o.channel === 'instore' ? ' · in store only' : o.channel === 'both' ? ' · online and in store' : '';
  return `${pctText(o.pct)} student discount on ${o.label}${where}`;
}

/**
 * Search lists. `live`: Set of store ids with a live non-student offer
 * (useLiveStoreIds), or null while loading. `student`: Map storeId → best
 * student offer, or null while loading.
 *   * not a student: stores whose only live offer is a student discount
 *     are left out (the student robots create stores; a non-student would
 *     see them as empty), and nothing else changes;
 *   * a student: stores with a student discount count as "with offers".
 * Returns { stores, live }.
 */
export function studentSearchView({ stores, live, student, isStudent }) {
  const list = Array.isArray(stores) ? stores : [];
  if (!(student instanceof Map) || student.size === 0) return { stores: list, live };
  if (!isStudent) {
    if (!(live instanceof Set)) return { stores: list, live };
    return { stores: list.filter((s) => live.has(s.id) || !student.has(s.id)), live };
  }
  if (!(live instanceof Set)) return { stores: list, live };
  return { stores: list, live: new Set([...live, ...student.keys()]) };
}

/**
 * The £ of a student route on a purchase of `amount`.
 *   d = student discount, c = cashback/points rate (as a fraction of the
 *   amount paid), g = gift-card discount:
 *   pay A × (1 − d);  saving = A × d;  cashback on what is paid = A × (1 − d) × c.
 * Owner's example: £100, 15% off and NX 10% → £15 + £8.50 = £23.50.
 */
export function studentMath(amount, discountPct, otherPct = 0) {
  const A = Number(amount) || 0;
  const d = (Number(discountPct) || 0) / 100;
  const paid = round2(A * (1 - d));
  const saving = round2(A * d);
  const other = round2(paid * ((Number(otherPct) || 0) / 100));
  return { paid, saving, other, total: round2(saving + other) };
}
