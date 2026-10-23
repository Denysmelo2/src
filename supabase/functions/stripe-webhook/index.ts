// stripe-webhook — Trial-first flow.
//
// User signed up first (free, 7-day SnapGain trial, no card). When they
// pay, this webhook writes the Stripe data + subscription status onto
// their existing user_profiles row, and keeps it in sync afterwards
// (renewals, plan changes, past_due, cancellations).
//
// No user creation needed (signup happened pre-checkout) but we keep
// a fallback inviteUserByEmail in case someone reaches checkout via
// a direct Stripe link without going through signup.
//
// verify_jwt is FALSE; we authenticate via Stripe-Signature instead.
//
// API versions: the webhook endpoint sends payloads in its own version
// (2025-12-15.clover at the time of writing), where a subscription has
// no top-level current_period_end — it lives on items.data[0]. The SDK
// below is pinned to 2024-12-18.acacia, so a re-fetched subscription
// has it top-level. periodEnd() accepts both shapes and returns null
// rather than throwing, so a shape change can never 500 the handler.

import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { sendOnce, welcomeEmail, cancellationEmail } from './emails.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const SITE_URL = 'https://snapgain.uk';

// Statuses where the Stripe subscription still exists and bills.
const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];

type Admin = ReturnType<typeof supabaseAdmin>;

function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function findUserByEmail(supabase: Admin, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) {
    console.warn('[stripe-webhook] listUsers error:', error);
    return null;
  }
  return data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

// ISO period end, from the top-level field (API <= 2025-02) or the first
// item (API >= 2025-03 "basil"/"clover"). null when neither is a number.
function periodEnd(sub: Stripe.Subscription): string | null {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  const ts = typeof s.current_period_end === 'number'
    ? s.current_period_end
    : s.items?.data?.[0]?.current_period_end;
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 'monthly' | 'yearly' from the price interval; null if unknown (the
// user_profiles.plan CHECK only allows those two values or NULL).
function planOf(sub: Stripe.Subscription): 'monthly' | 'yearly' | null {
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'yearly';
  if (interval === 'month') return 'monthly';
  const meta = sub.metadata?.plan;
  return meta === 'yearly' || meta === 'monthly' ? meta : null;
}

function idOf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v.id;
}

// Latest state from the API (in the SDK's pinned version). Falls back to
// the event's copy if Stripe no longer has it; any other error throws so
// Stripe retries the event.
async function fresh(sub: Stripe.Subscription): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.retrieve(sub.id);
  } catch (err) {
    // deno-lint-ignore no-explicit-any
    if ((err as any)?.code === 'resource_missing') return sub;
    throw err;
  }
}

function profileFields(sub: Stripe.Subscription, statusOverride?: string) {
  const fields: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_customer_id: idOf(sub.customer),
    subscription_status: statusOverride ?? sub.status,
  };
  const end = periodEnd(sub);
  if (end) fields.current_period_end = end;
  const plan = planOf(sub);
  if (plan) fields.plan = plan;
  return fields;
}

// Writes a subscription onto the matching user_profiles row. Match order:
// stripe_subscription_id, then stripe_customer_id, then the
// supabase_user_id we put in subscription metadata at checkout. Returns
// the user written to, or null when nothing was written.
async function syncSubscription(
  supabase: Admin,
  sub: Stripe.Subscription,
  statusOverride?: string
): Promise<string | null> {
  const fields = profileFields(sub, statusOverride);
  const status = fields.subscription_status as string;

  const bySub = await supabase
    .from('user_profiles')
    .update(fields)
    .eq('stripe_subscription_id', sub.id)
    .select('user_id');
  if (bySub.error) throw bySub.error;
  if (bySub.data?.length) return bySub.data[0].user_id;

  // No row carries this subscription id yet (created event racing the
  // checkout event, or a row written before the id was stored).
  const customerId = idOf(sub.customer);
  let row: { user_id: string; stripe_subscription_id: string | null } | null = null;
  if (customerId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .limit(1);
    if (error) throw error;
    row = data?.[0] ?? null;
  }
  const metaUserId = sub.metadata?.supabase_user_id;
  if (!row && metaUserId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, stripe_subscription_id')
      .eq('user_id', metaUserId)
      .maybeSingle();
    if (error) throw error;
    row = data;
  }
  if (!row) {
    console.warn('[stripe-webhook] no profile for subscription', sub.id);
    return null;
  }

  // The row already tracks a different subscription: only a live one may
  // replace it, so a stale/duplicate subscription being canceled cannot
  // flip a paying user to "canceled".
  if (
    row.stripe_subscription_id &&
    row.stripe_subscription_id !== sub.id &&
    !LIVE_STATUSES.includes(status)
  ) {
    console.log(
      '[stripe-webhook] ignoring', status, sub.id,
      '— profile tracks', row.stripe_subscription_id
    );
    return null;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(fields)
    .eq('user_id', row.user_id);
  if (error) throw error;
  return row.user_id;
}

// The subscription emails (emails.ts): welcome the first time a profile
// is active, and confirm a cancellation once per subscription. They never
// throw, so an email can't make Stripe resend the event.
async function notify(
  supabase: Admin,
  userId: string,
  sub: Stripe.Subscription,
  ended = false
) {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  if (ended || s.cancel_at_period_end || s.cancel_at) {
    await sendOnce(supabase, userId, 'cancellation', sub.id, () => cancellationEmail(sub, ended));
  } else if (sub.status === 'active') {
    await sendOnce(supabase, userId, 'premium_welcome', 'first', () => welcomeEmail(sub));
  }
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
        if (session.mode !== 'subscription') break;

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

        const subscriptionId = idOf(session.subscription);
        if (!subscriptionId) {
          console.warn('[stripe-webhook] missing subscription id');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const fields = profileFields(subscription);
        if (!fields.stripe_customer_id) fields.stripe_customer_id = idOf(session.customer);
        if (!fields.plan) {
          const metaPlan = session.metadata?.plan;
          fields.plan = metaPlan === 'yearly' ? 'yearly' : 'monthly';
        }

        // update, not upsert: the profile always exists (handle_new_user
        // creates it with the account), and an upsert is an INSERT first,
        // which fails NOT NULL on user_profiles.id and .email before ON
        // CONFLICT is reached ("23502", 23/10/2026: Stripe got a 500 and
        // kept resending the event).
        const { data: updated, error } = await supabase
          .from('user_profiles')
          .update(fields)
          .eq('user_id', userId)
          .select('user_id');
        if (error) throw error;
        if (!updated?.length) {
          // No profile to write to. The customer.subscription.* events
          // match by customer id or metadata and will retry the write;
          // a 500 here would only make Stripe resend this event.
          console.warn('[stripe-webhook] no profile for user', userId, 'on', event.id);
        } else {
          await notify(supabase, userId, subscription);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = await fresh(event.data.object as Stripe.Subscription);
        const ended = event.type === 'customer.subscription.deleted';
        const userId = await syncSubscription(
          supabase,
          subscription,
          ended ? 'canceled' : undefined
        );
        if (userId) await notify(supabase, userId, subscription, ended);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        // Status changes (renewal, past_due) also arrive as
        // customer.subscription.updated, which does the write.
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
    console.error('[stripe-webhook] handler error:', event.type, event.id, err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
