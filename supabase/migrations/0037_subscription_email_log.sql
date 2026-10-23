-- 0037: one row per subscription email sent, so each goes out once.
--
-- Owner's request (23/10/2026, after the first real payment): becoming
-- Premium sent nothing, and neither did cancelling. stripe-webhook now
-- sends a "welcome to Premium" email the first time a profile turns
-- active, and a cancellation confirmation once per subscription. Stripe
-- resends events (and sends several for one change), so the webhook
-- claims a row here before sending: the unique key makes the second
-- claim a no-op.
--
--   kind 'premium_welcome' → ref 'first' (once per person, ever)
--   kind 'cancellation'    → ref = Stripe subscription id
--
-- Service role only: RLS on, no policies, nothing granted to the API
-- roles. Rows go with the account (on delete cascade).

create table if not exists public.subscription_email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('premium_welcome', 'cancellation')),
  ref text not null,
  sent_at timestamptz not null default now(),
  resend_id text,
  unique (user_id, kind, ref)
);

alter table public.subscription_email_log enable row level security;
revoke all on public.subscription_email_log from anon, authenticated;

comment on table public.subscription_email_log is
  'Subscription emails sent by stripe-webhook (welcome to Premium, cancellation). One row per email; the unique key keeps each to one send.';
