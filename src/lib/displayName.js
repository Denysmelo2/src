// displayName — what the site calls the user (owner's tests 21/11/2026,
// C2). The Dashboard said "Hi dede" and the header "dede m" from the
// signup name, even after the user set a preferred name on /profile.
// Order: the preferred name (/profile, user_profiles.preferences), then
// the first name from signup (user_metadata.name or full_name), then the
// e-mail before the "@".
//
// Pure, no imports from '@/': tests/displayName.test.js runs it under Node.

const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');

/**
 * { short, full }: `short` for "Hi …" (preferred name as written, else
 * the first name, else the e-mail's local part); `full` for the header
 * and the avatar initials (preferred name, else the full signup name,
 * else the same local part). Fallback "there" / "User".
 */
export function displayNames({ preferredName, user } = {}) {
  const pref = clean(preferredName);
  const meta = clean(user?.user_metadata?.name || user?.user_metadata?.full_name);
  const local = clean(String(user?.email || '').split('@')[0]);
  return {
    short: pref || meta.split(' ')[0] || local || 'there',
    full: pref || meta || local || 'User',
  };
}
