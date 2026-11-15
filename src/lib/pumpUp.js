// pumpUp — JamDoughnut "Pump Up" offers on the site (handover 15/11/2026,
// task 4).
//
// The robot (snapgain-scraper#57) stores the highest Pump Up rate on a
// gift-card offer, with valid_to = the end of the boost and conditions
// such as:
//   "Online · Pump Up until 15/11 23:59: 33% paying by bank transfer
//    (32% by card, 30% standard)"
// The site shows a "Pump Up" badge and a short line, "33% paying by bank
// transfer · until 23:59 today". Paying by bank transfer (or JamDoughnut
// points) means no 1% card on top.
//
// Pure functions, no imports from '@/': tests/pumpUp.test.js runs them
// under plain Node.

const PUMP_RE = /(?:^| · )Pump Up until [^:]*\d{2}:\d{2}: ([0-9]+(?:\.[0-9]+)?)% paying by (bank transfer|card|JamDoughnut points)/;

/** "Online · Pump Up until …" → "Online"; "Pump Up until …" → "". */
export function baseConditions(conditions) {
  return String(conditions || '').replace(/(^| · )Pump Up until .*$/, '').trim();
}

/**
 * The live Pump Up on an offer, or null.
 * offer = { discount_pct, conditions, valid_to }
 * Returns { pct, method, endsAt: Date, byCard }.
 * Null when there is no Pump Up text, or valid_to is missing or past
 * (the 15-minute job in migration 0043 will put the standard rate back).
 */
export function pumpUpInfo(offer, now = new Date()) {
  if (!offer?.valid_to) return null;
  const endsAt = new Date(offer.valid_to);
  if (Number.isNaN(endsAt.getTime()) || endsAt <= now) return null;
  const m = PUMP_RE.exec(String(offer.conditions || ''));
  if (!m) return null;
  return {
    pct: Number(offer.discount_pct ?? m[1]),
    method: m[2],
    endsAt,
    byCard: m[2] === 'card',
  };
}

const ukParts = (d) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, dm: `${get('day')}/${get('month')}`, hm: `${get('hour')}:${get('minute')}` };
};

/** "until 23:59 today" / "until 09:00 tomorrow" / "until 18/11 23:59" (UK time). */
export function untilText(endsAt, now = new Date()) {
  const end = ukParts(endsAt);
  const today = ukParts(now).date;
  const tomorrow = ukParts(new Date(now.getTime() + 24 * 3600 * 1000)).date;
  if (end.date === today) return `until ${end.hm} today`;
  if (end.date === tomorrow) return `until ${end.hm} tomorrow`;
  return `until ${end.dm} ${end.hm}`;
}

const pctText = (n) => `${Math.round(Number(n) * 100) / 100}%`;

/** "33% paying by bank transfer · until 23:59 today", or null. */
export function pumpUpLine(info, now = new Date()) {
  if (!info) return null;
  return `${pctText(info.pct)} paying by ${info.method} · ${untilText(info.endsAt, now)}`;
}
