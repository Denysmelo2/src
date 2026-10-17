// create-checkout-session — Auth-required (signed-in users only).
//
// Trial-first flow:
//   1. Visitor signs up with email + phone (free, 7-day trial starts)
//   2. They explore the app, hit the unlocked One4all+NX strategy
//   3. To unlock the other 8 strategies + advanced features, they
//      click Subscribe and this function fires.
//
// verify_jwt is TRUE because by the time someone hits this they
// already have a Supabase account.
//
// Guards:
//   - accepted_terms must be true (UK Consumer Contracts Regulations
//     2013: the customer asks for the service to start now and accepts a
//     proportional refund if they cancel within 14 days). The time and
//     terms version are stored on the session and subscription metadata.
//   - A customer who already has a live subscription gets 409
//     already_subscribed; plan changes go through the billing portal
//     (create-portal-session), never a second subscription.

import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY') ?? '';
const PRICE_YEARLY = Deno.env.get('STRIPE_PRICE_YEARLY') ?? '';
const SITE_URL = 'https://snapgain.uk';
const CURRENT_TERMS_VERSION = '2026-10-17';

// Statuses where a Stripe subscription still exists and bills.
const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

const SUBMIT_MESSAGE =
  'Your SnapGain subscription starts now and renews automatically at the ' +
  'price shown until you cancel. Cancel anytime in Settings → Manage ' +
  'subscription. If you cancel within 14 days you get a refund minus the ' +
  'part of the service you have already used.';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: 'Invalid authentication' }, 401);
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === 'yearly' ? 'yearly' : 'monthly';

    if (body?.accepted_terms !== true) {
      return json(
        {
          error:
            'Please confirm that you want your subscription to start now and accept the Terms of Service.',
          code: 'terms_required',
        },
        400
      );
    }
    const termsVersion =
      typeof body.terms_version === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.terms_version)
        ? body.terms_version
        : CURRENT_TERMS_VERSION;
    const termsAcceptedAt = new Date().toISOString();

    const priceId = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;
    if (!priceId) {
      console.error(`[create-checkout-session] price for ${plan} is not configured`);
      return json({ error: 'Checkout is not available right now. Please try again later.' }, 500);
    }

    // Look up / create the Stripe Customer linked to this Supabase user.
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    let customerId = profile?.stripe_customer_id;

    // One subscription per customer. Stripe is the source of truth here:
    // user_profiles can lag (or be stale) if a webhook failed, and a
    // profile that still says "active" for a canceled subscription must
    // not lock the user out of subscribing again.
    if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 20,
      });
      if (subs.data.some((s) => LIVE_STATUSES.includes(s.status))) {
        return json(
          {
            error:
              'You already have a SnapGain subscription. To change plan, use Settings → Manage subscription.',
            code: 'already_subscribed',
          },
          409
        );
      }
    } else if (
      profile?.stripe_subscription_id &&
      LIVE_STATUSES.includes(profile?.subscription_status ?? '')
    ) {
      // Subscription on file but no customer id: can't verify, so refuse.
      return json(
        {
          error:
            'You already have a SnapGain subscription. To change plan, use Settings → Manage subscription.',
          code: 'already_subscribed',
        },
        409
      );
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            stripe_customer_id: customerId,
          },
          { onConflict: 'user_id' }
        );
      if (upsertError) throw upsertError;
    }

    const metadata = {
      supabase_user_id: user.id,
      plan,
      terms_accepted_at: termsAcceptedAt,
      terms_version: termsVersion,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata,
      subscription_data: { metadata },
      custom_text: { submit: { message: SUBMIT_MESSAGE } },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session] error:', err);
    return json({ error: 'Could not start checkout. Please try again later.' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
