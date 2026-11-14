// authRedirects — where the auth e-mails send people back to
// (handover 08/11/2026 "tarde", task B).
//
// Until 08/11 a committed .env.local set VITE_SITE_URL to
// http://localhost:5173, and Vite read it in the Vercel build too. The
// password-reset link then carried redirect_to=http://localhost:5173/...,
// Supabase refused it and sent the person to the home page, already
// signed in, with no way to choose a new password. The same variable
// builds the confirmation e-mail link.
//
// Two guards:
//   * siteOrigin(): the address for redirect_to. VITE_SITE_URL when it is
//     set and sensible; in a production build an address on localhost (or
//     127.0.0.1) is ignored and the page's own origin is used instead.
//   * recoveryTarget(): after a reset link signs someone in
//     (PASSWORD_RECOVERY), the page they must be on: /reset-password, even
//     when Supabase dropped them somewhere else. lib/supabase.js listens
//     for that event as soon as the client exists.
//
// Pure functions, no imports from '@/': tests/authRedirects.test.js runs
// them under plain Node.

export const RESET_PASSWORD_PATH = '/reset-password';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

/** True when `url` is an http(s) address on this machine. */
export function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * The origin to put in redirect_to / emailRedirectTo, without a trailing
 * slash. `envUrl` is VITE_SITE_URL, `isDev` is import.meta.env.DEV and
 * `pageOrigin` is window.location.origin.
 */
export function pickSiteOrigin(envUrl, { isDev, pageOrigin }) {
  const raw = String(envUrl || '').trim().replace(/\/+$/, '');
  if (!raw) return pageOrigin;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return pageOrigin;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return pageOrigin;
  if (!isDev && isLocalUrl(raw)) return pageOrigin;
  return parsed.origin;
}

/** pickSiteOrigin with this build's values. Browser only. */
export function siteOrigin() {
  return pickSiteOrigin(import.meta.env.VITE_SITE_URL, {
    isDev: Boolean(import.meta.env.DEV),
    pageOrigin: window.location.origin,
  });
}

/**
 * Where to send the browser for an auth event, or null to stay.
 * Only a password-recovery sign-in moves anyone, and only when they are
 * not already on the reset page.
 */
export function recoveryTarget(event, pathname) {
  if (event !== 'PASSWORD_RECOVERY') return null;
  if (String(pathname || '').replace(/\/+$/, '') === RESET_PASSWORD_PATH) return null;
  return RESET_PASSWORD_PATH;
}
