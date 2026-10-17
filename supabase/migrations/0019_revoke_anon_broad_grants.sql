-- 0019 — the logged-out role keeps only what the logged-out site uses
--
-- Checked against the live database on 17/10/2026. `anon` (every visitor
-- holding the publishable key) held INSERT, UPDATE, DELETE, TRUNCATE,
-- REFERENCES and TRIGGER on every table and view in `public`, and SELECT
-- on all of them, including every column of user_profiles (email, phone,
-- Stripe ids). The Supabase defaults grant that; RLS is what has been
-- stopping it. This removes the grants as a second line of defence, so
-- one wrong policy can no longer turn into a leak or a write.
--
-- WHAT ANON KEEPS, and why:
--   SELECT on the public catalogue that logged-out pages read (from
--   reading every supabase.from() in src/, plus the doces app):
--     booster_events, cashback_offers, cashback_rates, curated_strategies,
--     gift_card_offers, hot_deals, miles_programs, offers, platform,
--     platforms_explained, point_offers, promotions, rate_history,
--     reward_options, stores, doces_barbara_availability_blocks
--   INSERT on email_signups: its `email_signups_anon_insert` policy is a
--     deliberate public sign-up form. (Nothing in src/ writes it today.)
--   INSERT/DELETE on doces_barbara_availability_blocks: left as is here
--     on purpose. The doces app writes it with the publishable key today;
--     0021 is the change that takes this away, and is held separately so
--     it can wait for that app to be ready.
--
-- WHAT ANON LOSES:
--   * INSERT, UPDATE, DELETE on every other table and view in public.
--   * TRUNCATE, REFERENCES, TRIGGER on everything (PostgREST never
--     issues them; TRUNCATE in particular is not subject to RLS).
--   * SELECT on user and internal data:
--     boost_digest_log, email_signups, platforms_meta_changes,
--     recent_searches, saved_strategies, signup_attributions,
--     strategy_results, subscriptions, user_accounts, user_cards,
--     user_cashback_platforms, user_favourites, user_miles_programs,
--     user_notification_prefs, user_preferences, user_profiles,
--     user_sessions, user_simulation_summary, user_simulations,
--     user_subscriptions, users
--     Every read of these in src/ is behind `if (!user)`, so a logged-out
--     visitor never asks for them. RLS already returned zero rows to anon
--     for each one; the visible difference is only that a stray query now
--     gets "permission denied" instead of an empty list.
--
-- `authenticated` loses TRUNCATE, REFERENCES and TRIGGER only. Its
-- SELECT/INSERT/UPDATE/DELETE are what the signed-in app uses and are
-- left to RLS. `service_role` is not touched.
--
-- Future tables: the default privileges for tables `postgres` creates in
-- public are changed the same way, so the next new table does not hand
-- anon write access again. A new table that genuinely needs anon writes
-- must now grant them explicitly, next to its policy.
--
-- Rollback (restores the wide grants — emergency only):
--   grant all on all tables in schema public to anon;
--   alter default privileges for role postgres in schema public
--     grant all on tables to anon;

begin;

set local lock_timeout = '8s';

do $$
declare
  r record;
  keep_select text[] := array[
    'booster_events', 'cashback_offers', 'cashback_rates', 'curated_strategies',
    'gift_card_offers', 'hot_deals', 'miles_programs', 'offers', 'platform',
    'platforms_explained', 'point_offers', 'promotions', 'rate_history',
    'reward_options', 'stores', 'doces_barbara_availability_blocks'
  ];
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
  loop
    -- Never-needed privileges, both web roles.
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', r.relname);

    -- Writes: anon keeps only the two deliberate public forms.
    if r.relname = 'email_signups' then
      execute format('revoke update, delete on public.%I from anon', r.relname);
    elsif r.relname = 'doces_barbara_availability_blocks' then
      execute format('revoke update on public.%I from anon', r.relname);
    else
      execute format('revoke insert, update, delete on public.%I from anon', r.relname);
    end if;

    -- Reads: anon keeps the catalogue only. Revoking table-level SELECT
    -- also revokes the per-column SELECT grants on user_profiles.
    if not (r.relname = any (keep_select)) then
      execute format('revoke select on public.%I from anon', r.relname);
    end if;
  end loop;
end $$;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- ── Verify, and fail rather than half-apply ─────────────────────────
do $$
declare
  n int;
  bad text;
begin
  -- No anon writes beyond the two forms.
  select string_agg(c.relname || ':' || p.priv, ', ') into bad
  from pg_class c
  join pg_namespace s on s.oid = c.relnamespace
  cross join unnest(array['insert', 'update', 'delete', 'truncate']) as p(priv)
  where s.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
    and has_table_privilege('anon', c.oid, p.priv)
    and not (c.relname = 'email_signups' and p.priv = 'insert')
    and not (c.relname = 'doces_barbara_availability_blocks' and p.priv in ('insert', 'delete'));
  if bad is not null then
    raise exception 'anon still holds: %', bad;
  end if;

  -- No anon reads of user data, including column-level grants.
  select string_agg(c.relname, ', ') into bad
  from pg_class c
  join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public'
    and c.relname in ('boost_digest_log', 'email_signups', 'platforms_meta_changes',
      'recent_searches', 'saved_strategies', 'signup_attributions', 'strategy_results',
      'subscriptions', 'user_accounts', 'user_cards', 'user_cashback_platforms',
      'user_favourites', 'user_miles_programs', 'user_notification_prefs',
      'user_preferences', 'user_profiles', 'user_sessions', 'user_simulation_summary',
      'user_simulations', 'user_subscriptions', 'users')
    and has_any_column_privilege('anon', c.oid, 'select');
  if bad is not null then
    raise exception 'anon can still read: %', bad;
  end if;

  -- The logged-out site must still read its catalogue.
  select count(*) into n
  from unnest(array['booster_events', 'cashback_offers', 'cashback_rates',
    'curated_strategies', 'gift_card_offers', 'hot_deals', 'miles_programs', 'offers',
    'platform', 'platforms_explained', 'point_offers', 'promotions', 'rate_history',
    'reward_options', 'stores', 'doces_barbara_availability_blocks']) t
  where not has_table_privilege('anon', ('public.' || t)::regclass, 'select');
  if n <> 0 then
    raise exception '% catalogue table(s) lost anon SELECT', n;
  end if;

  if not has_table_privilege('anon', 'public.email_signups', 'insert') then
    raise exception 'email_signups lost its public INSERT';
  end if;

  -- The signed-in app must be untouched.
  if not (has_table_privilege('authenticated', 'public.saved_strategies', 'insert')
      and has_table_privilege('authenticated', 'public.user_favourites', 'delete')
      and has_column_privilege('authenticated', 'public.user_profiles', 'onboarding_done', 'update')
      and has_table_privilege('authenticated', 'public.user_profiles', 'select')) then
    raise exception 'authenticated lost a privilege the app uses';
  end if;

  if not has_table_privilege('service_role', 'public.user_profiles', 'update') then
    raise exception 'service_role lost UPDATE on user_profiles';
  end if;
end $$;

commit;
