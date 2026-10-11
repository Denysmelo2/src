import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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
 * Props:
 *   plan: 'monthly' | 'yearly' (default 'monthly')
 */
export function SubscribeButton({ plan = 'monthly', children, ...buttonProps }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
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
        { body: { plan } }
      );
      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: 'Could not start checkout',
        description:
          err?.message ||
          'Stripe may not be configured yet. Set STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY, and STRIPE_WEBHOOK_SECRET in your Supabase Edge Function secrets.',
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
