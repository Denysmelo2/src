// Breached-password check (handover 04/11/2026, task 2).
//
// Supabase's "Leaked password protection" needs the Pro plan, which the
// owner decided not to buy (04/11/2026). This does the same check in the
// browser, before sign-up and before setting a new password, with Have I
// Been Pwned's free Pwned Passwords range API (k-anonymity):
//
//   * the password is hashed here with SHA-1;
//   * only the first 5 hex characters of the hash are sent
//     (GET https://api.pwnedpasswords.com/range/<5 chars>), never the
//     password and never the full hash;
//   * the API answers with every hash suffix in that range, and the
//     match is done here. `Add-Padding: true` makes it add decoy rows
//     (count 0), so the response size gives nothing away either.
//
// No key, no cost. If the API is down or slow (3 s), the check returns
// null and the form lets the password through: sign-up must not break
// because of an outside service. The server still enforces 8+
// characters, and hCaptcha guards the endpoints.
//
// This protects people using the site. Someone calling the Supabase API
// directly skips it; for them there is hCaptcha and the server minimum.

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

export const PWNED_MESSAGE =
  'This password has appeared in a data breach. Please choose a different one.';

async function sha1Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * true  – the password is in a known breach;
 * false – it is not;
 * null  – could not tell (network error, timeout, bad answer).
 */
export async function isPwnedPassword(password, { timeoutMs = 3000, fetchImpl } = {}) {
  if (!password) return false;
  const doFetch = fetchImpl || globalThis.fetch;
  try {
    const hash = await sha1Hex(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await doFetch(RANGE_URL + prefix, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = await res.text();
    for (const line of body.split('\n')) {
      const [s, count] = line.trim().split(':');
      if (s && s.toUpperCase() === suffix) return Number(count) > 0;
    }
    return false;
  } catch {
    return null;
  }
}
