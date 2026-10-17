// Observability bootstrap: Sentry (error tracking) + Google Analytics 4
// (product analytics), plus the visitor's cookie/storage consent.
// If an env var is missing the SDK simply doesn't initialise: no
// crashes, no broken builds.
//
// Env vars (set in Vercel → Settings → Environment Variables):
//   VITE_SENTRY_DSN          Sentry project DSN (https://...@sentry.io/...)
//   VITE_GA4_MEASUREMENT_ID  GA4 measurement ID (G-XXXXXXXXXX)
//   VITE_APP_ENV             'production' | 'staging' | 'development'
//
// Consent model (2026-10-17, legal package C):
//   - Strictly necessary storage (sign-in session, the consent record
//     itself, display preferences, pending-checkout intent) needs no
//     consent under PECR reg 6(4).
//   - `analytics`  → Google Analytics 4 AND Sentry Session Replay (on
//     error). GA4 is a third-party service, so it stays behind consent
//     even though the Data (Use and Access) Act 2025 relaxed the rule
//     for some first-party statistics cookies.
//   - `marketing`  → campaign attribution (utm_*, ref, gclid, fbclid),
//     see lib/utmTracking.js. Nothing is stored before consent.
//   - Sentry error reporting itself (no cookies, no replay, no PII) runs
//     on legitimate interests and is disclosed in the Privacy Policy.
//
// Withdrawing analytics consent stops GA4 for the rest of the visit,
// deletes the _ga / _ga_* cookies on this domain and stops replay.

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const APP_ENV = import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? 'development' : 'production');

const CONSENT_KEY = 'snapgain.cookieConsent';
const CONSENT_VERSION = 1;

/** Event name the footer "Cookie settings" link dispatches to reopen
 *  the consent banner (CookieConsentBanner listens for it). */
export const OPEN_COOKIE_SETTINGS_EVENT = 'snapgain:open-cookie-settings';
/** Fired after the consent record changes, so other modules can react. */
export const CONSENT_CHANGED_EVENT = 'snapgain:consent-changed';

const REPLAY_OPTIONS = { maskAllText: true, blockAllMedia: true };

export function initSentry() {
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[observability] Sentry DSN not set — skipping init.');
    }
    return;
  }
  const integrations = [Sentry.browserTracingIntegration()];
  // Session Replay records the page around an error. It only runs with
  // analytics consent; see applyConsent() for adding it later.
  if (hasConsent('analytics')) {
    integrations.push(Sentry.replayIntegration(REPLAY_OPTIONS));
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    // Capture 100% of unhandled errors but only 10% of perf transactions.
    tracesSampleRate: 0.1,
    // Don't track PII automatically. We explicitly attach user_id via
    // setUser() in SupabaseAuthContext when a session exists.
    sendDefaultPii: false,
    // Replay only on errors, never proactively, and only with consent.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations,
  });
}

// ─── Consent record ─────────────────────────────────────────────────

/** Read the stored consent record.
 *  Returns { analytics: bool, marketing: bool, ts } or null (never asked).
 *  Legacy values from the old two-button banner are mapped:
 *  'accepted' → everything on, 'rejected' → everything off. */
export function getConsentRecord() {
  let raw = null;
  try {
    raw = localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  if (raw === 'accepted') return { v: CONSENT_VERSION, analytics: true, marketing: true, ts: null };
  if (raw === 'rejected') return { v: CONSENT_VERSION, analytics: false, marketing: false, ts: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        v: parsed.v || CONSENT_VERSION,
        analytics: parsed.analytics === true,
        marketing: parsed.marketing === true,
        ts: parsed.ts || null,
      };
    }
  } catch {
    // corrupt value: treat as never asked
  }
  return null;
}

/** Back-compat helper: 'accepted' | 'rejected' | null. */
export function getConsent() {
  const rec = getConsentRecord();
  if (!rec) return null;
  return rec.analytics || rec.marketing ? 'accepted' : 'rejected';
}

/** True only when the visitor has opted in to that category. */
export function hasConsent(category) {
  const rec = getConsentRecord();
  return !!(rec && rec[category] === true);
}

/** Persist the visitor's choice and apply it immediately.
 *  Accepts { analytics, marketing } or the legacy strings
 *  'accepted' / 'rejected'. */
export function setConsent(value) {
  let next;
  if (value === 'accepted') next = { analytics: true, marketing: true };
  else if (value === 'rejected') next = { analytics: false, marketing: false };
  else next = { analytics: !!value?.analytics, marketing: !!value?.marketing };
  const record = { v: CONSENT_VERSION, ...next, ts: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    // localStorage blocked (private mode): apply for this visit only
  }
  applyConsent(record);
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: record }));
  } catch {
    // very old browsers: nothing listens anyway
  }
}

/** Ask the banner to reopen (used by the footer "Cookie settings"). */
export function openCookieSettings() {
  try {
    window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
  } catch {
    // ignore
  }
}

function applyConsent(record) {
  // Analytics: GA4 + Sentry Replay
  if (record.analytics) {
    initGA4();
    startReplay();
  } else {
    disableGA4();
    stopReplay();
  }
  // Marketing attribution: drop anything stored if consent is withdrawn.
  if (!record.marketing) {
    import('@/lib/utmTracking')
      .then((m) => m.clearStoredUtms())
      .catch(() => {});
  }
}

// ─── Sentry Replay (consent-gated) ──────────────────────────────────

function startReplay() {
  if (!SENTRY_DSN) return;
  try {
    const existing = Sentry.getReplay?.();
    if (existing) {
      existing.startBuffering?.();
      return;
    }
    Sentry.addIntegration?.(Sentry.replayIntegration(REPLAY_OPTIONS));
  } catch {
    // replay is best-effort
  }
}

function stopReplay() {
  try {
    const replay = Sentry.getReplay?.();
    if (replay) replay.stop?.();
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem('sentryReplaySession');
  } catch {
    // ignore
  }
}

// ─── Google Analytics 4 (consent-gated) ─────────────────────────────

/** Load GA4 gtag.js asynchronously. Only runs once consent is granted
 *  AND the measurement ID is configured. Safe to call multiple times. */
export function initGA4() {
  if (!GA4_ID) {
    if (import.meta.env.DEV) {
      console.log('[observability] GA4 ID not set — skipping init.');
    }
    return;
  }
  if (!hasConsent('analytics')) return;

  // Re-enable after an earlier withdrawal in the same visit.
  window[`ga-disable-${GA4_ID}`] = false;

  if (window.gtag) {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('config', GA4_ID, { anonymize_ip: true, cookie_flags: 'SameSite=None;Secure' });
    return;
  }

  // Bootstrap dataLayer + gtag stub before the async script lands.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  // Consent Mode: analytics only, never advertising storage.
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(script);
}

/** Stop GA4 for this visit and delete its cookies. */
export function disableGA4() {
  if (GA4_ID) {
    // Google's documented opt-out switch: gtag stops sending hits.
    window[`ga-disable-${GA4_ID}`] = true;
  }
  if (window.gtag) {
    try {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    } catch {
      // ignore
    }
  }
  deleteGaCookies();
}

/** Delete _ga, _ga_* (and legacy _gid / _gat*) cookies for this host
 *  and every parent domain they could have been written to (GA writes
 *  them on the top-level domain, e.g. .snapgain.uk). */
export function deleteGaCookies() {
  if (typeof document === 'undefined') return;
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => n === '_ga' || n.startsWith('_ga_') || n === '_gid' || n.startsWith('_gat'));
  if (names.length === 0) return;

  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i += 1) {
    const d = parts.slice(i).join('.');
    domains.push(d, `.${d}`);
  }
  const expired = 'Thu, 01 Jan 1970 00:00:00 GMT';
  for (const name of names) {
    for (const domain of domains) {
      const domainAttr = domain ? `; domain=${domain}` : '';
      document.cookie = `${name}=; expires=${expired}; path=/${domainAttr}`;
      document.cookie = `${name}=; expires=${expired}; path=/${domainAttr}; SameSite=None; Secure`;
    }
  }
}

/** Boot the whole observability stack at app start. */
export function initObservability() {
  initSentry();
  if (hasConsent('analytics')) initGA4();
  else deleteGaCookies(); // tidy up cookies left from an earlier choice
}

/** Fire a custom GA4 event if consent + ID present. No-op otherwise. */
export function trackEvent(name, params = {}) {
  if (!window.gtag || !hasConsent('analytics')) return;
  window.gtag('event', name, params);
}
