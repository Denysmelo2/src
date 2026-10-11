import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * useSubscription — reads the current user's row from public.user_profiles
 * and exposes derived subscription state. Subscribes to Realtime so that
 * webhook-driven updates (active → canceled, etc.) propagate without a
 * page refresh.
 *
 * Derived flags:
 *   isActive  — Stripe says the subscription is `active` or `trialing`
 *   inTrial   — no active sub, but the locally-managed 7-day trial_end is in the future
 *   isPremium — isActive || inTrial. Use this to gate features.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  // Which user the current `profile` was fetched for: a user id, `null`
  // for "no user", or `undefined` before the first fetch settles.
  //
  // `loading` is DERIVED from this rather than kept as its own flag, to
  // close a race. AuthContext resolves the session asynchronously, so the
  // first render has user = null; the old code fetched for that null
  // user, set loading=false, and when the real user arrived a render
  // later it still said "not loading" with profile = null. ProtectedRoute
  // read that as "signed in, no plan, not admin" and redirected to
  // /pricing. It was invisible until 2026-10-09 only because admins had a
  // second, insecure route in via user_metadata.role (removed in
  // migration 0007's frontend change) that did not need the profile.
  //
  // Deriving it means the moment the user changes, loading is true in
  // that same render, with no gap. A realtime-triggered refresh for the
  // same user does not flip it, so the splash screen does not flash on
  // every webhook.
  const [loadedFor, setLoadedFor] = useState(undefined);
  const loading = loadedFor === undefined || loadedFor !== (user?.id ?? null);

  // The user this hook is rendering for RIGHT NOW. A fetch started for a
  // previous user (sign-out then sign-in as someone else while it is in
  // flight) must not write its answer over the current one: that would
  // show the wrong person's plan and leave `loading` stuck, because
  // loadedFor would name a user who is no longer here.
  const currentUid = useRef(user?.id ?? null);
  currentUid.current = user?.id ?? null;

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoadedFor(null);
      return;
    }
    const uid = user.id;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'id, role, plan, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end, trial_end, onboarding_done'
        )
        .eq('user_id', user.id)
        .maybeSingle();
      if (currentUid.current !== uid) return; // superseded, see currentUid
      if (error) {
        console.warn('[useSubscription] profile fetch error:', error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
      setLoadedFor(uid);
    } catch (err) {
      if (currentUid.current !== uid) return;
      console.warn('[useSubscription] unexpected error:', err);
      setProfile(null);
      setLoadedFor(uid);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: webhook updates flow back here without refresh. Suffix
  // the channel name with a random token so re-mounts (StrictMode,
  // navigation back-and-forth) don't collide with an already-subscribed
  // channel — which would throw "cannot add postgres_changes after subscribe()".
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_profile:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const now = Date.now();
  const trialEndMs = profile?.trial_end ? new Date(profile.trial_end).getTime() : 0;
  const periodEndMs = profile?.current_period_end
    ? new Date(profile.current_period_end).getTime()
    : 0;

  const status = profile?.subscription_status || null;
  const isActive = status === 'active' || status === 'trialing';
  const inTrial = !isActive && trialEndMs > now;
  const isPremium = isActive || inTrial;
  // `profile.role` only. The old `|| user?.user_metadata?.role` fallback
  // read the bag that `supabase.auth.updateUser({ data })` writes, so a
  // user could set `role: 'admin'` on themselves in one call and land
  // here — and `isAdmin` bypasses the premium gates. See migration 0007;
  // granting admin is now a deliberate server-side update of
  // `user_profiles.role`.
  const isAdmin = profile?.role === 'admin';

  // Days remaining (rounded UP so the day of signup counts — matches
  // what users expect from "Trial: 7 days" right after sign-up).
  const trialDaysLeft = inTrial
    ? Math.max(0, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)))
    : 0;
  const periodDaysLeft = isActive && periodEndMs
    ? Math.max(0, Math.ceil((periodEndMs - now) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    profile,
    loading,
    refresh,
    isPremium,
    inTrial,
    isActive,
    isAdmin,
    plan: profile?.plan || null,
    status,
    trialEndsAt: profile?.trial_end || null,
    periodEndsAt: profile?.current_period_end || null,
    trialDaysLeft,
    periodDaysLeft,
  };
}
