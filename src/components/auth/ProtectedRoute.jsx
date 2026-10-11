import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { SplashScreen } from '@/components/SplashScreen';

const PROFILE_TIMEOUT_MS = 4000;

/**
 * ProtectedRoute — gates a route on the following checks (in order):
 *
 *   1. Authenticated session (otherwise → /auth/login).
 *   2. Onboarding completed (otherwise → /onboarding) unless the
 *      route opts out via requireOnboarding={false}.
 *   3a. requirePremium  — active subscription OR in-trial users pass.
 *       Non-premium logged-in users → /pricing.
 *   3b. requirePremiumStrict — only active subscriptions pass.
 *       Trial users are NOT enough. Used for routes/features that we
 *       reveal only post-purchase (Strategy Library full playbooks,
 *       Saved Strategies, Alerts, Wallet, etc.).
 *
 * Both premium checks default to TRUE — opt out per route as needed.
 *
 * If both requirePremium and requirePremiumStrict are set, strict wins.
 */
function ProtectedRoute({
  children,
  requireOnboarding = true,
  requirePremium = true,
  requirePremiumStrict = false,
}) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: subLoading } = useSubscription();
  const location = useLocation();
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (!subLoading) {
      setProfileTimedOut(false);
      return;
    }
    const t = setTimeout(() => setProfileTimedOut(true), PROFILE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [subLoading]);

  if (authLoading) return <SplashScreen />;

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const needsProfile = requireOnboarding || requirePremium || requirePremiumStrict;
  const stillWaitingForProfile = needsProfile && subLoading && !profileTimedOut;
  if (stillWaitingForProfile) {
    return <SplashScreen />;
  }

  if (
    requireOnboarding &&
    profile &&
    profile.onboarding_done === false &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Admins bypass ALL premium gates (founder + support access).
  //
  // `profile.role` is the ONLY source of truth. This used to fall back to
  // `user.user_metadata.role`, reasoning that the role-sync trigger might
  // not have propagated yet for a brand-new admin. But `user_metadata` is
  // the bag `supabase.auth.updateUser({ data })` writes, so the user
  // controls it: one client call setting `role: 'admin'` passed this
  // check. And the trigger that fallback was waiting on was itself the
  // escalation path — it copied the same user-written field into
  // `user_profiles.role` — so it was neutralised in migration 0007. The
  // reason for the fallback is gone; only the hole was left.
  //
  // Consequence worth knowing: an account that was admin ONLY via
  // user_metadata is no longer admin here. Granting admin is now a
  // deliberate server-side act:
  //   update public.user_profiles set role = 'admin' where user_id = '<uuid>';
  const isAdmin = profile?.role === 'admin';

  // Derive premium flags once
  const stripeActive =
    profile?.subscription_status === 'active' ||
    profile?.subscription_status === 'trialing';
  const trialEnd = profile?.trial_end ? new Date(profile.trial_end) : null;
  const inLocalTrial = trialEnd && trialEnd.getTime() > Date.now();

  // STRICT: only paying customers (trial does NOT count) — admins bypass
  if (
    requirePremiumStrict &&
    !stripeActive &&
    !isAdmin &&
    location.pathname !== '/pricing'
  ) {
    return <Navigate to="/pricing?subscribe=required" replace />;
  }

  // PREMIUM: paying customers OR trial users — admins bypass
  if (
    requirePremium &&
    !stripeActive &&
    !inLocalTrial &&
    !isAdmin &&
    location.pathname !== '/pricing'
  ) {
    return <Navigate to="/pricing?subscribe=required" replace />;
  }

  return children;
}

export default ProtectedRoute;
