// stripe-webhook — Trial-first flow.
//
// User signed up first (free, 7-day trial). When they upgrade and
// pay, this webhook simply updates their existing user_profiles row
// with the Stripe data + subscription status.
//
// No user creation needed (signup happened pre-checkout) but we keep
// a fallback inviteUserByEmail in case someone reaches checkout via
// a direct Stripe link without going through signup.
//
// verify_jwt is FALSE; we authenticate via Stripe-Signature instead.

import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const SITE_URL = 'https://snapgain.uk';

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function findUserByEmail(
  supabase: ReturnType<typeof supabaseAdmin>,
  email: string
) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.warn('[stripe-webhook] listUsers error:', error);
    return null;
  }
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error('[stripe-webhook] signature failed:', err);
    return new Response(`Webhook signature error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const supabase = supabaseAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Primary path: supabase_user_id was set in checkout metadata
        // by create-checkout-session (signed-in flow).
        let userId = session.metadata?.supabase_user_id || null;

        // Fallback: derive user from email (direct Stripe link case).
        if (!userId) {
          const email =
            session.customer_details?.email || session.customer_email || '';
          if (email) {
            const existing = await findUserByEmail(supabase, email);
            if (existing) {
              userId = existing.id;
            } else {
              // Last-ditch: invite (sends magic-link).
              const { data: invited } =
                await supabase.auth.admin.inviteUserByEmail(email, {
                  redirectTo: `${SITE_URL}/auth/callback`,
                });
              userId = invited?.user?.id || null;
            }
          }
        }

        if (!userId) {
          console.error('[stripe-webhook] could not resolve userId');
          break;
        }

        const plan = session.metadata?.plan ?? 'monthly';
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) {
          console.warn('[stripe-webhook] missing subscription id');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase.from('user_profiles').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan,
            subscription_status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          },
          { onConflict: 'user_id' }
        );
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const payload = {
          subscription_status:
            event.type === 'customer.subscription.deleted'
              ? 'canceled'
              : subscription.status,
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        };
        await supabase
          .from('user_profiles')
          .update(payload)
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log('[stripe-webhook]', event.type, event.data.object.id);
        break;

      default:
        console.log('[stripe-webhook] unhandled:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error)?.message ?? 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
