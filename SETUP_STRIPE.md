# SnapGain — Stripe subscription setup

How payments work today on https://snapgain.uk, and what has to be
configured for them to keep working. No secret values live in this file
or in the repo: they are Supabase Edge Function secrets.

The browser never touches a Stripe key. Checkout and Customer Portal
sessions are created server-side by Edge Functions, and the browser is
redirected to Stripe's hosted pages.

---

## 1. Plans

One Stripe product, two GBP recurring prices (live mode):

| Plan    | Price        | Interval | Price ID                          |
| ------- | ------------ | -------- | --------------------------------- |
| Monthly | **£7.99**    | month    | `price_1UTnaD9xccsM1Iimph4JSnTC`  |
| Annual  | **£60.00**   | year     | `price_1UTnay9xccsM1Iim820lZyFo`  |

Since 23/10/2026 (owner's decision). The old £14.99 and £120 prices
(`price_1TWkUQ…`, `price_1TWkWA…`) are archived. The site's copy of the
prices is `src/config/pricing.js`; change both together.

There is **no Stripe trial**. Every new account gets SnapGain's own
7-day free trial with no card: the `handle_new_user` trigger sets
`user_profiles.trial_end`. Stripe is only involved once the user pays.

---

## 2. Edge Function secrets

Supabase project `ffowgyjdbgkphsflxybk` → **Edge Functions → Secrets**:

| Secret name             | What it is                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Live secret key (Stripe → Developers → API keys)                |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint in step 3                |
| `STRIPE_PRICE_MONTHLY`  | The monthly price ID above                                      |
| `STRIPE_PRICE_YEARLY`   | The annual price ID above                                       |
| `SITE_URL`              | `https://snapgain.uk` (portal return URL; any non-https value is ignored and `https://snapgain.uk` is used) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to Edge Functions automatically.

---

## 3. Webhook endpoint

Stripe → **Developers → Webhooks**, live mode:

- **URL**: `https://ffowgyjdbgkphsflxybk.supabase.co/functions/v1/stripe-webhook`
- **Events**: `checkout.session.completed`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted` (the handler also accepts and logs
  `invoice.payment_succeeded` / `invoice.payment_failed`; anything else
  gets a 200 and is ignored).

The endpoint's API version (currently `2025-12-15.clover`) can differ
from the SDK's pinned version (`2024-12-18.acacia`). The handler copes:
it re-fetches the subscription through the SDK and reads the period end
from either the top level or `items.data[0]`, so it never fails on the
payload shape.

---

## 4. Customer Portal

Stripe → **Settings → Billing → Customer portal** (live mode) must be
saved at least once, otherwise `create-portal-session` cannot open it.
Enable:

- update payment method,
- cancel subscription,
- switch plan between the two prices above (this is how a subscriber
  changes plan; checkout refuses a second subscription),
- invoice history.

---

## 5. Edge Functions

All three live in `supabase/functions/`. Deploy them with these JWT
settings:

| Function                  | verify_jwt | Role |
| ------------------------- | ---------- | ---- |
| `create-checkout-session` | **true**   | Signed-in user → Stripe Checkout URL |
| `stripe-webhook`          | **false**  | Authenticated by the Stripe-Signature header instead |
| `create-portal-session`   | **true**   | Signed-in user → Stripe Customer Portal URL |

### create-checkout-session

- Body: `{ plan: 'monthly' | 'yearly', accepted_terms: true, terms_version }`.
- `400 terms_required` if `accepted_terms` is not `true`. The pricing
  page has a required checkbox: the customer asks for the service to
  start now and accepts that cancelling within 14 days gives a refund
  minus the part already used (Consumer Contracts Regulations 2013).
- `409 already_subscribed` if the customer already has a live Stripe
  subscription (`active`, `trialing`, `past_due`, `unpaid`). Stripe is
  checked directly, so a stale `user_profiles` row can't block or allow
  the wrong thing. The frontend sends subscribers to the portal instead.
- Creates the Stripe customer on first use (stored in
  `user_profiles.stripe_customer_id`, with `supabase_user_id` metadata).
- Session and subscription metadata: `supabase_user_id`, `plan`,
  `terms_accepted_at` (ISO time), `terms_version`.
- The Checkout submit button carries a note: renews automatically until
  cancelled, cancel anytime in Settings → Manage subscription, 14-day
  cancellation with proportional refund.

### stripe-webhook

- `checkout.session.completed`: resolves the user (metadata, else email),
  re-fetches the subscription and upserts `stripe_customer_id`,
  `stripe_subscription_id`, `plan`, `subscription_status`,
  `current_period_end` on `user_profiles`.
- `customer.subscription.created|updated|deleted`: re-fetches the
  subscription and updates the row matched by `stripe_subscription_id`,
  else `stripe_customer_id`, else `metadata.supabase_user_id`. A
  non-live subscription never overwrites a row that tracks a different
  subscription. `plan` follows the price interval, so a portal plan
  switch is reflected. `deleted` writes `canceled`.
- Returns 500 only on real errors (database, Stripe API), so Stripe
  retries; 400 on a bad signature.

### create-portal-session

- Returns the portal URL for the user's `stripe_customer_id`, with
  `return_url` = `SITE_URL/settings`.
- `400 no_customer` with a readable message if the user never paid.

---

## 6. Testing

Use Stripe test mode (separate test keys, prices and webhook endpoint)
or a real card with an immediate refund.

1. Sign in as a non-admin user, open `/pricing`.
2. Press **Start subscription** without ticking the box: nothing happens
   except a prompt pointing at the checkbox.
3. Tick the box, press **Start subscription** → Stripe Checkout, with the
   renewal/cancellation note above the pay button. Test card
   `4242 4242 4242 4242`, any future expiry, any CVC.
4. After payment `/subscription/success` flips to Premium once the
   webhook has written the row:
   ```sql
   select user_id, plan, subscription_status, current_period_end,
          stripe_customer_id, stripe_subscription_id
   from public.user_profiles where email = '<test email>';
   ```
5. On `/pricing`, the other plan's button now says **Switch to this
   plan** and opens the portal. Switch plan there and check `plan`
   changes in the row.
6. Cancel in the portal (Settings → Manage subscription). With "cancel at
   period end" the status stays `active` until the period ends; cancel
   immediately and it becomes `canceled`.
7. Stripe → Webhooks → the endpoint → recent deliveries should all be
   200.

---

## 7. Related code

- `src/components/SubscribeButton.jsx` — consent check, calls
  `create-checkout-session`, sends `already_subscribed` users to the portal.
- `src/components/ManageBillingButton.jsx` — calls `create-portal-session`.
- `src/pages/PricingPage.jsx` — plan cards and the consent checkbox.
- `src/hooks/useSubscription.js` — reads `user_profiles`, derives
  `isPremium` (active subscription or SnapGain trial). Realtime keeps it
  in sync with webhook writes.
- `src/pages/AuthCallbackPage.jsx` — after signup with a pending plan it
  returns the user to `/pricing`, where they tick the box and subscribe.
