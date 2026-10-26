-- 0041: when a cancelled subscription ends.
--
-- Handover 25/10/2026, task 2: a subscriber who cancelled in the Stripe
-- portal still saw "Renews <date>" on /pricing and Settings, because
-- user_profiles only had the status (still `active` until the period
-- ends) and the period end. The DMCC subscription rules want the end
-- date shown as an end date, with a way to reactivate.
--
-- `cancel_at` is the moment Stripe will end the subscription: null while
-- it renews, set when the user cancels at period end (or a cancel date is
-- set), back to null if they reactivate. stripe-webhook writes it on
-- every subscription event.
--
-- Order after merge: apply this migration, THEN deploy stripe-webhook.
-- The new webhook writes this column; deployed first, its updates would
-- fail and Stripe would retry them until the column exists.
--
-- Only the service role writes it: since 0007 the API roles hold UPDATE
-- and INSERT on named columns only, and a new column is not among them.
-- The check at the end fails the migration if that ever changes.

alter table public.user_profiles
  add column if not exists cancel_at timestamptz;

comment on column public.user_profiles.cancel_at is
  'When Stripe will end the subscription (cancelled at period end). Null while it renews. Written by stripe-webhook only.';

-- Backfill: a profile that is still active and already got the
-- cancellation email for its current subscription (0037) has cancelled
-- at period end. On 25/10/2026 that was one profile. If someone
-- reactivated after that email, the next Stripe event for them puts this
-- back to null.
update public.user_profiles p
   set cancel_at = p.current_period_end
  from public.subscription_email_log l
 where l.user_id = p.user_id
   and l.kind = 'cancellation'
   and l.ref = p.stripe_subscription_id
   and p.subscription_status in ('active', 'trialing')
   and p.current_period_end > now()
   and p.cancel_at is null;

do $$
begin
  if has_column_privilege('authenticated', 'public.user_profiles', 'cancel_at', 'UPDATE')
     or has_column_privilege('authenticated', 'public.user_profiles', 'cancel_at', 'INSERT')
     or has_column_privilege('anon', 'public.user_profiles', 'cancel_at', 'UPDATE') then
    raise exception 'API roles can write user_profiles.cancel_at';
  end if;
end $$;
