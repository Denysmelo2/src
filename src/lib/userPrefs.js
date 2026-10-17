import { supabase } from '@/lib/customSupabaseClient';

/**
 * User preferences storage.
 *
 * Tries Supabase `user_profiles.preferences` (jsonb) first. If that
 * column doesn't exist (or RLS blocks the write), falls back to
 * localStorage scoped by user id. This way the Profile page works
 * out of the box without DB migrations — when you add the column
 * later, existing localStorage prefs migrate up on first save.
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
    if (error || !data?.preferences) return local;
    return { ...DEFAULTS, ...local, ...data.preferences };
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
      .upsert(
        { user_id: userId, preferences: merged },
        { onConflict: 'user_id' }
      );
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
