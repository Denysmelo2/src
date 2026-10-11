-- 0007 — stop a user granting themselves premium (and UI admin)
--
-- Found 2026-10-09 while wiring the manual rate-entry screen. APPLIED
-- the same day, in the three steps below; see "How this was applied"
-- at the foot, because it did not go in as one transaction and the
-- reason matters.
--
-- THE HOLE, in two parts.
--
-- Part 1 — columns. `user_profiles_owner_update` reads
--   USING (auth.uid() = user_id) / WITH CHECK (auth.uid() = user_id)
-- and that is the whole policy. RLS restricts the ROW; it says nothing
-- about which COLUMNS of that row you may write. And the grants were
-- wide open: `anon` and `authenticated` each held INSERT and UPDATE on
-- EVERY column — `role`, `subscription_status`, `plan`, `trial_end`,
-- `current_period_end`, `stripe_customer_id`, `stripe_subscription_id`.
-- So any logged-in user could run
--
--   supabase.from('user_profiles')
--     .update({ subscription_status: 'active', role: 'admin' })
--     .eq('user_id', <their own id>)
--
-- and hand themselves a paid subscription. `useSubscription` and
-- `ProtectedRoute` read exactly those columns, so every premium gate in
-- the app opened. Nobody has paid yet, so this cost nothing — but it
-- was live.
--
-- Part 2 — the role sync. `sync_role_on_auth_insert` and
-- `sync_role_on_auth_update` on auth.users called
-- `public.sync_user_role_to_profile()`, which copied
-- `auth.users.raw_user_meta_data->>'role'` into `user_profiles.role`.
-- `raw_user_meta_data` is exactly what
-- `supabase.auth.updateUser({ data: { role: 'admin' } })` writes — the
-- user controls it by design. So the second route was a single client
-- call, and the column grants in Part 1 would NOT have stopped it: the
-- function is SECURITY DEFINER, so it runs as its owner, not as the
-- caller. Those triggers existed only to propagate a privileged role
-- out of a field the user can write.
--
-- WHAT THIS DOES NOT FIX, said plainly rather than left to be
-- discovered: `is_admin()` still reads `raw_user_meta_data->>'role'`.
-- A user can still make `is_admin()` return true for themselves, which
-- still grants INSERT/UPDATE/DELETE on `cashback_offers` and
-- `hot_deals`, and SELECT on every row of `user_profiles` (the
-- `profiles_select_self` policy ORs `is_admin()`, so that is every
-- user's email, phone and Stripe ids). Closing that means moving the
-- admin flag somewhere the user cannot write, which can lock the
-- operator out of his own admin pages if done carelessly. It is a
-- separate, deliberate migration — not this one. Until it lands,
-- nothing NEW is keyed on `is_admin()`: the rate-entry path checks
-- `user_profiles.role`, which this migration makes trustworthy.
--
-- UPDATE, same day: that migration is 0009, and it has landed. The
-- lockout risk cleared once every admin account carried
-- `user_profiles.role = 'admin'`, which is exactly what THIS migration
-- made meaningful. Read 0007 and 0009 together; neither is complete
-- alone.
--
-- Columns the client legitimately writes on its own row, from reading
-- every writer in src/ (useAlerts, userPrefs, LoginPage,
-- OnboardingPage; useSubscription only reads):
--   onboarding_done      LoginPage.jsx, OnboardingPage.jsx
--   last_alerts_seen_at  hooks/useAlerts.js
--   updated_at           LoginPage.jsx
--   user_id              needed by upsert (INSERT ... ON CONFLICT)
-- `userPrefs.js` upserts a `preferences` column that does not exist on
-- this table; that write already failed and already falls back to
-- localStorage, so it is unaffected — the error message changes, the
-- outcome does not.
--
-- `email`, `phone` and `role` stay server-side: `handle_new_user()` is
-- SECURITY DEFINER and sets them at signup, which grants on
-- `authenticated` do not constrain. `service_role` is left completely
-- alone, because `stripe-webhook` writes `subscription_status`,
-- `stripe_*`, `plan` and `current_period_end` through it.
--
-- From here, granting someone admin is a deliberate server-side act:
--   update public.user_profiles set role = 'admin' where user_id = '<uuid>';
--
-- Rollback (restores the hole — emergency only):
--   grant insert, update on public.user_profiles to anon, authenticated;
--   -- and restore the old function body, which is quoted in full
--   -- inside the current one's comment.

begin;

set local lock_timeout = '8s';

-- ── Part 1: column-level privileges ─────────────────────────────────
-- Table-level INSERT/UPDATE is all-or-nothing, so drop it and grant
-- back only the columns the client needs.
revoke insert, update on public.user_profiles from anon, authenticated;

grant insert (user_id, onboarding_done, last_alerts_seen_at, updated_at)
  on public.user_profiles to authenticated;

grant update (onboarding_done, last_alerts_seen_at, updated_at)
  on public.user_profiles to authenticated;

-- `anon` gets neither. The RLS policies already blocked it (auth.uid()
-- is null, so no row matched), but it held the grants anyway, and a
-- privilege nothing needs should not exist.

-- ── Part 2: neutralise the role sync ────────────────────────────────
-- NOT a DROP TRIGGER. The triggers live on auth.users, owned by
-- supabase_auth_admin; this project's migration role cannot perform DDL
-- there (the attempt does not error, it stalls). The FUNCTION is in
-- `public` and is ours, so emptying it closes the path just as well:
-- the triggers still fire on every auth.users write and now do nothing.
-- The old body is quoted inside the comment so this stays reversible.
create or replace function public.sync_user_role_to_profile()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  -- NEUTRALISED 2026-10-09 — see this migration's header.
  --
  -- This function used to run:
  --   v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  --   UPDATE public.user_profiles SET role = v_role WHERE user_id = NEW.id;
  --
  -- `raw_user_meta_data` is exactly what
  -- `supabase.auth.updateUser({ data: { role: 'admin' } })` writes — the
  -- user controls it by design. So this copy was a one-call, self-service
  -- route from ordinary user to `user_profiles.role = 'admin'`, the column
  -- ProtectedRoute and useSubscription trust. Being SECURITY DEFINER it
  -- also sailed past the column grants above, running as its owner rather
  -- than as the caller.
  --
  -- Roles are now set deliberately, server-side, and only there:
  --   update public.user_profiles set role = 'admin' where user_id = '<uuid>';
  RETURN NEW;
END;
$function$;

-- ── Verify, and fail rather than half-apply ─────────────────────────
do $$
declare
  n int;
  body text;
begin
  select count(*) into n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'user_profiles'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE')
    and column_name in ('role', 'subscription_status', 'plan',
                        'trial_end', 'current_period_end',
                        'stripe_customer_id', 'stripe_subscription_id',
                        'email', 'phone');
  if n <> 0 then
    raise exception 'still % privileged column grants for the web roles', n;
  end if;

  select count(*) into n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'user_profiles'
    and grantee = 'authenticated' and privilege_type = 'UPDATE'
    and column_name in ('onboarding_done', 'last_alerts_seen_at', 'updated_at');
  if n <> 3 then
    raise exception 'expected 3 updatable self-service columns, found %', n;
  end if;

  select count(*) into n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'user_profiles'
    and grantee = 'authenticated' and privilege_type = 'INSERT'
    and column_name in ('user_id', 'onboarding_done',
                        'last_alerts_seen_at', 'updated_at');
  if n <> 4 then
    raise exception 'expected 4 insertable self-service columns, found %', n;
  end if;

  -- service_role must be untouched, or Stripe stops being able to
  -- record a subscription.
  select count(*) into n
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'user_profiles'
    and grantee = 'service_role' and privilege_type = 'UPDATE';
  if n < 15 then
    raise exception 'service_role lost UPDATE columns (found %)', n;
  end if;

  -- The sync function must carry no executable statement that writes
  -- user_profiles. Comment lines are stripped first — the quoted old
  -- body in the comment must not be able to satisfy this test.
  select string_agg(line, E'\n') into body
  from regexp_split_to_table(
         pg_get_functiondef('public.sync_user_role_to_profile()'::regprocedure),
         E'\n') as line
  where line !~ '^\s*--';
  if body ilike '%user_profiles%' then
    raise exception 'sync_user_role_to_profile still writes user_profiles';
  end if;
end $$;

commit;

-- ── How this was applied ────────────────────────────────────────────
-- The first attempt sent Part 1 and a `drop trigger ... on auth.users`
-- as one transaction. It hit the client's 60s ceiling and rolled back
-- whole — verified afterwards: grants unchanged, triggers still there.
-- A `drop trigger` on auth.users alone then stalled too, with
-- pg_stat_activity empty and no ungranted lock in pg_locks, i.e. not
-- lock contention: the migration role simply cannot DDL a table owned
-- by supabase_auth_admin. So it went in as:
--   1. the grants (succeeded, verified against column_privileges)
--   2. the function replace (succeeded, verified on the comment-stripped
--      body: `BEGIN RETURN NEW; END;`)
-- Re-running this file as written is safe and idempotent.
