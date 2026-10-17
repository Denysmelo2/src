import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { openBillingPortal, readFunctionError } from '@/components/ManageBillingButton';

// Version of the Terms / Refund Policy the consent checkbox refers to.
// Bump when those texts change; it is stored on the Stripe subscription.
export const TERMS_VERSION = '2026-10-17';

/**
 * SubscribeButton — calls the `create-checkout-session` Edge Function and
 * redirects the browser to the Stripe-hosted checkout.
 *
 * Trial-first flow (Alt A — 2026-05-17):
 *   - Visitor signs up (free, 7-day trial starts)
 *   - During trial they have access to Comparison Engine, Calculator,
 *     and the Discounted Gift Cards Strategy card
 *   - Other 8 strategies, Wallet, Alerts, Saved Strategies stay locked
 *   - Clicking Subscribe triggers Stripe Checkout (auth required)
 *   - On post-trial expiry, ProtectedRoute bounces them to /pricing
 *
 * Consent (UK Consumer Contracts Regulations 2013): the customer must
 * tick the "start now / proportional refund" box first. Without it the
 * button does nothing but call `onConsentMissing`, and the server rejects
 * a request without `accepted_terms` anyway.
 *
 * Props:
 *   plan: 'monthly' | 'yearly' (default 'monthly')
 *   accepted: boolean — the consent box is ticked
 *   onConsentMissing: () => void — e.g. scroll to / highlight the box
 */
export function SubscribeButton({
  plan = 'monthly',
  accepted = false,
  onConsentMissing,
  children,
  ...buttonProps
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    if (!accepted) {
      toast({
        title: 'Please confirm first',
        description:
          'Tick the box below the plans to confirm you want your subscription to start now.',
      });
      onConsentMissing?.();
      return;
    }
    // Not signed in? Send them to signup (free trial starts), keep the
    // intent so they come back here after auth and can pay.
    if (!user) {
      try {
        localStorage.setItem(
          'pendingCheckout',
          JSON.stringify({ plan, timestamp: Date.now() })
        );
      } catch {
        // localStorage unavailable in some private modes; non-blocking
      }
      navigate('/auth/signup', { state: { from: location } });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        { body: { plan, accepted_terms: true, terms_version: TERMS_VERSION } }
      );
      if (error) {
        const { message, code } = await readFunctionError(error);
        if (code === 'already_subscribed') {
          // Plan changes go through the portal, never a second subscription.
          toast({
            title: 'You already have a subscription',
            description: 'Opening your billing portal so you can change plan…',
          });
          await openBillingPortal();
          return;
        }
        throw new Error(message || '');
      }
      if (!data?.url) throw new Error('');
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: 'Could not start checkout',
        description:
          err?.message ||
          'Something went wrong on our side. Please try again in a few minutes or contact support.',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={busy} {...buttonProps}>
      {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children || (plan === 'yearly' ? 'Subscribe yearly' : 'Subscribe monthly')}
    </Button>
  );
}

export default SubscribeButton;
