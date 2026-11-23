// cashbackTerms — what a cashback platform excludes, shown on its route
// (Rakuten handover 23/11/2026, items 5 and 8).
//
// Rakuten's shop pages say "Cashback is not available on gift cards or
// adjustments" and "… when using vouchers or discount codes that are not
// from Rakuten UK", so a Rakuten route never stacks with a gift card
// (lib/strategies.js) and its card says why. The shop's own "Terms &
// Exclusions" text (cashback_offers.terms, src 0050) goes under "See
// terms".
//
// Pure, no imports from '@/': tests/cashbackTerms.test.js runs it under Node.

/** True for Rakuten, however the platform name is spelt. */
export function isRakutenPlatform(platform) {
  const key = String(platform || '').trim().toLowerCase();
  return key === 'rakuten' || key === 'rakuten uk';
}

const EXCLUSIONS = [
  { test: isRakutenPlatform, line: 'No cashback on gift cards or non-Rakuten codes.' },
];

/** The one-line exclusion for a cashback platform, or null. */
export function exclusionLine(platform) {
  return EXCLUSIONS.find((e) => e.test(platform))?.line || null;
}

/** The shop's terms as short lines for "See terms" (blank lines and
 *  repeats removed, at most `max` lines), or []. */
export function termsLines(text, max = 12) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || '').split(/\n+/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}
