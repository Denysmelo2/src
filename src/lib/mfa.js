// mfa — two-factor sign-in with an authenticator app (TOTP), through
// Supabase Auth MFA (owner's tests 21/11/2026, D1). The old switch on
// /settings only wrote `twoFactorEnabled` to localStorage and protected
// nothing.
//
//   * turn on:  enroll -> QR code (or the secret typed by hand) -> the
//               6-digit code from the app -> verified;
//   * sign in:  a user with a verified factor is at AAL1 after the
//               password (or Google); ProtectedRoute shows MfaGate,
//               which asks for the code (challenge + verify -> AAL2);
//   * turn off: only after a fresh code (unenroll needs AAL2).

import { supabase } from '@/lib/customSupabaseClient';

/** The user's verified authenticator factor, or null. */
export async function verifiedTotp() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp || []).find((f) => f.status === 'verified') || null;
}

/** Start turning it on: { factorId, qrCode (an SVG image URL), secret }. */
export async function startTotpEnroll() {
  // A half-finished enrolment left behind blocks a new one with the same
  // name: remove unverified factors first.
  const { data: list } = await supabase.auth.mfa.listFactors();
  for (const f of list?.all || []) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Check a 6-digit code against a factor (turning on, or signing in). */
export async function verifyCode(factorId, code) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: String(code || '').trim() });
  if (error) throw error;
}

/** Turn it off: the code first, then remove the factor. */
export async function disableTotp(factorId, code) {
  await verifyCode(factorId, code);
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

/** True when this session still owes the code (AAL1, a factor exists). */
export async function needsSecondFactor() {
  // Never blocks a page on a failure here: no answer means no code asked.
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return false;
    return data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2';
  } catch {
    return false;
  }
}

/** A 6-digit code as typed ("123 456" -> "123456"), or null. */
export function cleanCode(v) {
  const s = String(v || '').replace(/\s+/g, '');
  return /^\d{6}$/.test(s) ? s : null;
}
