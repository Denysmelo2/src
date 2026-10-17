import React, { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Pull `{ message, code }` out of a supabase.functions.invoke error. For a
 * non-2xx reply, `error.context` is the fetch Response carrying our JSON
 * body ({ error, code }); otherwise fall back to the error's own message.
 */
export async function readFunctionError(error) {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return { message: body.error, code: body.code || null };
  } catch {
    // body was not JSON; fall through
  }
  return { message: null, code: null };
}

/**
 * Open the Stripe Customer Portal (update card, change plan, cancel).
 * Throws an Error with a user-facing message when it can't.
 */
export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke(
    'create-portal-session',
    { body: {} }
  );
  if (error) {
    const { message } = await readFunctionError(error);
    throw new Error(message || "We couldn't open the billing portal. Please try again.");
  }
  if (!data?.url) throw new Error("We couldn't open the billing portal. Please try again.");
  window.location.href = data.url;
}

/**
 * ManageBillingButton — invokes the create-portal-session Edge Function
 * and redirects to the Stripe-hosted Customer Portal where the user
 * can update payment method, change plan, or cancel.
 */
export function ManageBillingButton({ children = 'Manage subscription', ...buttonProps }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await openBillingPortal();
    } catch (err) {
      toast({
        title: "Couldn't open billing portal",
        description: err?.message || 'Try again later.',
        variant: 'destructive',
      });
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={busy} {...buttonProps}>
      {busy ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4 mr-2" />
      )}
      {children}
    </Button>
  );
}

export default ManageBillingButton;
