// 2026-05-20: UTM attribution for the "Voo de Volta" campaign and
// any future campaigns. Lifecycle:
//
//   1. Visitor lands on snapgain.uk/* with ?utm_source=tiktok&...
//   2. If (and only if) they have given "marketing attribution"
//      consent in the cookie banner, we snapshot the UTMs into
//      sessionStorage + localStorage (localStorage persists for 90
//      days so a slow funnel doesn't lose attribution).
//   3. When the user finally signs up, the SignUp form reads the
//      latest UTMs and attaches them to:
//        - Supabase auth user_metadata (auth.users.raw_user_meta_data)
//        - the row we insert into `signup_attributions` (for reporting)
//   4. analytics dashboards aggregate signup_attributions to know
//      which content piece drove how many trials.
//
// 2026-10-17 (legal package C): consent gating. PECR reg 6 needs
// consent before we store anything on the device that isn't strictly
// necessary, and campaign attribution (especially gclid / fbclid click
// IDs) is not. So, conservatively:
//   - Before consent NOTHING is written to storage. The params of the
//     landing URL are only held in memory for the current page view.
//   - If the visitor then accepts marketing attribution in the banner,
//     the in-memory snapshot is written (CONSENT_CHANGED_EVENT).
//   - getStoredUtms() returns null without consent, so nothing reaches
//     Supabase either.
//   - Withdrawing consent clears the stored snapshot (observability.js).
// The storage key is 'snapgain.utm' (the Cookie Policy names it).

import { hasConsent, CONSENT_CHANGED_EVENT } from '@/lib/observability';

const STORAGE_KEY = 'snapgain.utm';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const UTM_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',          // referral code shorthand
  'gclid',        // Google Ads click id (future paid)
  'fbclid',       // Meta click id (future paid)
];

/**
 * Reads UTM params from the current URL. Returns null if none present.
 */
export function readUtmsFromUrl(url = window.location.href) {
  try {
    const u = new URL(url);
    const out = {};
    let foundAny = false;
    for (const f of UTM_FIELDS) {
      const v = u.searchParams.get(f);
      if (v) {
        out[f] = v;
        foundAny = true;
      }
    }
    return foundAny ? out : null;
  } catch {
    return null;
  }
}

// In-memory snapshot of the landing URL's UTMs, kept until the visitor
// makes a consent choice. Never written to storage without consent.
let pendingSnapshot = null;
let listening = false;

function persist(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage blocked (Safari private mode etc.): silent fail.
  }
}

/**
 * Snapshot the current URL's UTMs. Call on every page load (cheap:
 * only acts when params are present). Writes to storage only when the
 * visitor has consented to marketing attribution; otherwise the
 * snapshot waits in memory in case they accept on this visit.
 */
export function captureUtms() {
  const fromUrl = readUtmsFromUrl();
  if (!fromUrl) return;
  const payload = {
    ...fromUrl,
    captured_at: new Date().toISOString(),
    landing_page: window.location.pathname,
    landing_search: window.location.search,
    referrer: document.referrer || null,
  };
  if (hasConsent('marketing')) {
    persist(payload);
    return;
  }
  pendingSnapshot = payload;
  if (!listening) {
    listening = true;
    window.addEventListener(CONSENT_CHANGED_EVENT, (e) => {
      if (e?.detail?.marketing && pendingSnapshot) {
        persist(pendingSnapshot);
      }
      pendingSnapshot = null;
    });
  }
}

/**
 * Returns the most recent UTM snapshot if it's still within TTL.
 * Used by SignUp form right before submit so we attach the
 * attribution to the new user record.
 */
export function getStoredUtms() {
  if (!hasConsent('marketing')) return null;
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const captured = new Date(parsed.captured_at).getTime();
    if (Number.isNaN(captured)) return null;
    if (Date.now() - captured > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear stored UTMs (call after we've written them to Supabase, so
 * subsequent funnels can capture new attribution without conflating).
 */
export function clearStoredUtms() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Convenience: build a snapgain.uk URL with UTM params already
 * attached. Used by internal links and (future) email templates.
 */
export function buildUtmUrl(path, params = {}) {
  const base = path.startsWith('http')
    ? path
    : `${window.location.origin}${path}`;
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}
