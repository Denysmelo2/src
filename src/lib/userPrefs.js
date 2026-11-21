import { supabase } from '@/lib/customSupabaseClient';

/**
 * User preferences storage.
 *
 * Saved to the account in `user_profiles.preferences` (jsonb, migration
 * 0048), so what is set on the phone shows on the PC (owner's tests
 * 21/11/2026, C1). localStorage keeps a copy for the first paint and for
 * when the database cannot be reached.
 *   * load: the account wins over the browser. If the account is still
 *     empty ('{}', right after 0048) and this browser has settings, they
 *     are uploaded once;
 *   * save: an UPDATE of the user's own row (the profile row always
 *     exists, handle_new_user creates it), never a new row.
 * Before 0048 is applied the reads and writes fail and everything stays
 * in localStorage, as before.
 */

const LS_KEY = (userId) => `snapgain:prefs:${userId}`;

const DEFAULTS = {
  preferredName: '',
  pronouns: '',
  phone: '',
  location: '',
  language: 'en',
  homeCountry: 'BR',
  displayCurrency: 'GBP',
  // Inline catalogs (no DB table required)
  bankIds: [],
  // ─── Notifications ───────────────────────────────────────────────
  // Optional-email style toggles default OFF (opt-in, PECR reg 22).
  // These are local display prefs today and drive no email, but keep
  // the defaults safe in case they are wired to a sender later.
  notifEmail: true,
  notifPush: false,
  notifWeekly: false,
  notifDeals: false,
  marketingEmails: false,
  // ─── Security ────────────────────────────────────────────────────
  twoFactorEnabled: false,
  // ─── Display & accessibility ─────────────────────────────────────
  // theme: 'light' | 'dark' | 'auto' | 'cream' | 'yellow' | 'peach' | 'calm'
  theme: 'light',
  fontSize: 'md', // 'sm' | 'md' | 'lg'
  fontFamily: 'default', // 'default' | 'accessible' (Lexend)
  lineSpacing: 'normal', // 'normal' | 'wide'
  reduceMotion: false,
  highContrast: false,
  // ─── Comparison behaviour ────────────────────────────────────────
  // When true, ComparePage / StoreDetailPage / StrategyPage filter
  // the routes to only those payable via platforms the user has
  // added to their Wallet (cashback platforms + miles programs).
  // Gift-card platforms aren't gated — anyone can use JamDoughnut etc.
  // Falls back to "show all" gracefully if the wallet is empty so a
  // new user doesn't see an empty Compare page after enabling this.
  walletOnly: false,
};

/** UK banks catalog — small enough to inline. */
export const UK_BANKS = [
  { id: 'bank_chase', label: 'Chase' },
  { id: 'bank_santander', label: 'Santander' },
  { id: 'bank_barclays', label: 'Barclays' },
  { id: 'bank_hsbc', label: 'HSBC' },
  { id: 'bank_lloyds', label: 'Lloyds' },
  { id: 'bank_natwest', label: 'NatWest' },
  { id: 'bank_halifax', label: 'Halifax' },
  { id: 'bank_nationwide', label: 'Nationwide' },
  { id: 'bank_monzo', label: 'Monzo' },
  { id: 'bank_starling', label: 'Starling' },
  { id: 'bank_revolut', label: 'Revolut' },
  { id: 'bank_metro', label: 'Metro Bank' },
  { id: 'bank_first_direct', label: 'First Direct' },
  { id: 'bank_tsb', label: 'TSB' },
  { id: 'bank_co_op', label: 'Co-operative Bank' },
];

/** Languages currently supported by the UI. Add more here as the
 *  matching JSON files land in src/locales/. */
export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'pt-BR', label: 'Português (Brasil)' },
];

/** Home country → display currency hint pairs. */
export const COUNTRIES = [
  { id: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { id: 'BR', label: 'Brasil', currency: 'BRL' },
  { id: 'PT', label: 'Portugal', currency: 'EUR' },
  { id: 'ES', label: 'España', currency: 'EUR' },
  { id: 'PL', label: 'Poland', currency: 'PLN' },
  { id: 'RO', label: 'Romania', currency: 'RON' },
  { id: 'IN', label: 'India', currency: 'INR' },
  { id: 'PK', label: 'Pakistan', currency: 'PKR' },
  { id: 'BD', label: 'Bangladesh', currency: 'BDT' },
  { id: 'NG', label: 'Nigeria', currency: 'NGN' },
  { id: 'PH', label: 'Philippines', currency: 'PHP' },
  { id: 'ZA', label: 'South Africa', currency: 'ZAR' },
  { id: 'IE', label: 'Ireland', currency: 'EUR' },
  { id: 'IT', label: 'Italy', currency: 'EUR' },
  { id: 'FR', label: 'France', currency: 'EUR' },
  { id: 'DE', label: 'Germany', currency: 'EUR' },
  { id: 'US', label: 'United States', currency: 'USD' },
];

export const PRONOUN_PRESETS = [
  '',
  'she/her',
  'he/him',
  'they/them',
  'she/they',
  'he/they',
];

function differsFromDefaults(prefs) {
  return Object.keys(prefs || {}).some((k) => JSON.stringify(prefs[k]) !== JSON.stringify(DEFAULTS[k]));
}

function readLocal(userId) {
  if (!userId) return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(LS_KEY(userId));
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeLocal(userId, prefs) {
  if (!userId) return;
  try {
    localStorage.setItem(LS_KEY(userId), JSON.stringify(prefs));
  } catch (err) {
    console.warn('[userPrefs] localStorage write failed:', err);
  }
}

/** Load preferences (Supabase first, localStorage fallback). */
export async function loadUserPrefs(userId) {
  const local = readLocal(userId);
  if (!userId) return local;
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return local;
    const remote = data.preferences && typeof data.preferences === 'object' ? data.preferences : {};
    if (Object.keys(remote).length === 0) {
      // The account has nothing yet: upload this browser's settings once
      // (only when there is something besides the defaults).
      if (differsFromDefaults(local)) await saveUserPrefs(userId, local);
      return local;
    }
    const merged = { ...DEFAULTS, ...remote };
    writeLocal(userId, merged);
    return merged;
  } catch (err) {
    console.warn('[userPrefs] load fallback to local:', err);
    return local;
  }
}

/** Save preferences (writes both Supabase and localStorage). */
export async function saveUserPrefs(userId, prefs) {
  const merged = { ...DEFAULTS, ...prefs };
  writeLocal(userId, merged);
  if (!userId) return merged;
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ preferences: merged })
      .eq('user_id', userId);
    if (error) {
      console.warn(
        '[userPrefs] Supabase save failed (using localStorage only):',
        error.message
      );
    }
  } catch (err) {
    console.warn('[userPrefs] unexpected save error:', err);
  }
  return merged;
}
