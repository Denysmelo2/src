import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import * as Sentry from '@sentry/react';

import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
    // Attach user id (no email/PII) to Sentry so crash reports include
    // which account hit them. Cleared on sign-out.
    if (session?.user?.id) {
      Sentry.setUser({ id: session.user.id });
    } else {
      Sentry.setUser(null);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(async (email, password, options) => {
    // 2026-05-20: attach UTM attribution to the signup. We read the
    // snapshot from lib/utmTracking (captured on first page load),
    // pass it into user_metadata so it's queryable later, AND write
    // a dedicated row to signup_attributions for clean reporting.
    let utms = null;
    try {
      const mod = await import('@/lib/utmTracking');
      utms = mod.getStoredUtms();
    } catch {
      // utmTracking module failed to load — non-fatal
    }

    const enrichedOptions = utms
      ? {
          ...options,
          data: {
            ...(options?.data || {}),
            utm_source: utms.utm_source,
            utm_medium: utms.utm_medium,
            utm_campaign: utms.utm_campaign,
            utm_content: utms.utm_content,
            ref: utms.ref,
          },
        }
      : options;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: enrichedOptions,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
      });
      return { error };
    }

    // Fire-and-forget attribution write. Doesn't block signup if it
    // fails — UTMs already in user_metadata as backup.
    if (utms && data?.user?.id) {
      supabase
        .from('signup_attributions')
        .insert({
          user_id: data.user.id,
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          utm_content: utms.utm_content,
          utm_term: utms.utm_term,
          ref: utms.ref,
          gclid: utms.gclid,
          fbclid: utms.fbclid,
          landing_page: utms.landing_page,
          landing_search: utms.landing_search,
          referrer: utms.referrer,
          captured_at: utms.captured_at,
        })
        .then(({ error: attrErr }) => {
          if (attrErr) {
            console.warn('[UTM attribution] insert failed:', attrErr.message);
          } else {
            // Clear so a future signup in the same session doesn't
            // re-attribute to a stale campaign.
            import('@/lib/utmTracking').then((m) => m.clearStoredUtms());
          }
        });
    }

    return { error: null };
  }, [toast]);

  // captchaToken: from useAuthCaptcha; undefined while captcha is off.
  const signIn = useCallback(async (email, password, captchaToken) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  /**
   * signInWithProvider — OAuth via Supabase. The provider must be enabled
   * in Supabase Dashboard → Authentication → Providers (Google only —
   * Apple removed 2026-06-01 pending $99/yr Developer membership).
   * The user is redirected away to the provider's consent screen and back
   * to /auth/callback (handled by Supabase). Set the redirectTo if you
   * want to send them somewhere specific after.
   */
  const signInWithProvider = useCallback(async (provider, options = {}) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/home`,
        ...options,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: `${provider} sign-in failed`,
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithProvider,
  }), [user, session, loading, signUp, signIn, signOut, signInWithProvider]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
