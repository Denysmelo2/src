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

import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_MONTHLY') ?? '';
const PRICE_YEARLY = Deno.env.get('STRIPE_PRICE_YEARLY') ?? '';
const SITE_URL = 'https://snapgain.uk';

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
    const plan = body.plan === 'yearly' ? 'yearly' : 'monthly';
    const priceId = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;
    if (!priceId) {
      return json({ error: `STRIPE_PRICE_${plan.toUpperCase()} is not set` }, 500);
    }

    // Look up / create the Stripe Customer linked to this Supabase user.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            stripe_customer_id: customerId,
          },
          { onConflict: 'user_id' }
        );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { supabase_user_id: user.id, plan },
      subscription_data: { metadata: { supabase_user_id: user.id, plan } },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('[create-checkout-session] error:', err);
    return json({ error: (err as Error)?.message || 'Internal error' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
