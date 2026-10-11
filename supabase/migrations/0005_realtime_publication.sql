-- 0005 — put the offer tables back into the Realtime publication
--
-- The app moved from `cashback_rates` to `cashback_offers` /
-- `point_offers` / `gift_card_offers` in May 2026. The publication that
-- feeds Supabase Realtime never moved with it, because nothing in this
-- repo managed it — it was set once by hand in the dashboard, against
-- the old schema, and stayed there. Before this migration it carried:
--
--   cashback_rates (17 rows), offers (0), reward_options (0),
--   rate_history (0), strategy_results (0), user_simulations (0),
--   stores, miles_programs, user_cards
--
-- Four of those are empty and none of them is a table the live app
-- subscribes to. Meanwhile `useStoreOffers` (src/hooks/useCatalog.js)
-- subscribes to the three offer tables and `useSubscription`
-- (src/hooks/useSubscription.js) subscribes to `user_profiles`.
-- Postgres never published those, so `subscribe()` returned SUBSCRIBED
-- and not one event was ever emitted. No error anywhere — which is why
-- it survived five months.
--
-- REPLICA IDENTITY FULL is not optional here. The frontend subscribes
-- with `filter: store_id=eq.<id>`, and for DELETE the old row reaches
-- Realtime carrying only the replica identity. Under the default
-- (primary key) identity, `store_id` is absent, the filter cannot
-- match, and the delete is dropped. FULL is also what lets Realtime
-- evaluate the RLS policy against the old row. These five tables all
-- have a primary key and the largest is 5 MB, so the extra WAL volume
-- is small — but it IS extra WAL on every UPDATE.
--
-- Corrected 2026-10-09: this header first said the ingestion rewrites
-- a few thousand rows DAILY. It does not. Bulk runs land roughly every
-- six days (2026-10-01/02 and 2026-10-08, ~4,200 rows each), with 5–15
-- rows on the days between, so the extra WAL is a few thousand full
-- rows a WEEK, not a day — smaller than first stated. Still worth a
-- look after this lands, but not a concern.
--
-- Order matters: set the replica identity BEFORE adding the table to
-- the publication, never the other way round.
--
-- Rollback:
--   alter publication supabase_realtime drop table
--     public.cashback_offers, public.point_offers,
--     public.gift_card_offers, public.user_profiles, public.hot_deals;
--   alter table public.cashback_offers  replica identity default;  -- etc.

begin;

do $$
declare
  t text;
  targets text[] := array[
    'cashback_offers',
    'point_offers',
    'gift_card_offers',
    'user_profiles',
    'hot_deals'
  ];
begin
  foreach t in array targets loop
    -- 1. Replica identity first, so the table is never published
    --    without one.
    execute format('alter table public.%I replica identity full', t);

    -- 2. Join the publication. ALTER PUBLICATION ... ADD TABLE errors
    --    on a table that is already a member, so this is guarded —
    --    the migration has to be safe to re-run.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', t
      );
    end if;
  end loop;
end $$;

-- Fail loudly rather than leaving a half-applied publication behind.
do $$
declare
  n int;
begin
  select count(*) into n
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename in ('cashback_offers', 'point_offers',
                      'gift_card_offers', 'user_profiles', 'hot_deals');
  if n <> 5 then
    raise exception
      'expected 5 offer/profile tables in supabase_realtime, found %', n;
  end if;

  select count(*) into n
  from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relname in ('cashback_offers', 'point_offers',
                      'gift_card_offers', 'user_profiles', 'hot_deals')
    and c.relreplident = 'f';
  if n <> 5 then
    raise exception 'expected 5 tables at REPLICA IDENTITY FULL, found %', n;
  end if;
end $$;

commit;
