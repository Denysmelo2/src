-- 0025 — move live offers off merge-loser stores onto their canonical store
--
-- The 05/07/2026 dedup marked ~700 duplicate stores with
-- `is_active = false, merged_into = <canonical id>`. The site only shows
-- canonical stores. But the scraper's slug lookup (lib/upsert.js in
-- snapgain-scraper) did not read merged_into, so a loser found by its own
-- slug (bootscom, asos-uk, nike-uk, …) kept receiving fresh offers while
-- the canonical copies went stale and fell out of the 30-day window.
-- Measured 17/10/2026: 220 Avios, 87 cashback and 21 gift-card offers live
-- on losers, across ~296 canonical stores (Boots, ASOS, Nike among them).
-- The scraper fix is Denysmelo2/snapgain-scraper#39.
--
-- What this does, for each live offer (active, verified in the last 30
-- days) on a loser:
--   * the canonical store already has an offer for the same platform /
--     airline → that row takes the loser's values if the loser's are
--     newer, and the loser's row is deactivated;
--   * it has none → the row moves to the canonical store (store_id only).
-- Nothing is deleted. Stale offers on losers are left as they are.
--
-- Merge chains: 8 losers point at a store that is itself merged (e.g.
-- boohoo-uk → boohoo-ie → boohoo). The canonical store is the end of the
-- chain (at most 2 hops on 17/10/2026).
--
-- KiwiCo: the dedup had merged KiwiCo (kids' kits) into Kiwi.com
-- (flights), a different company. Owner's decision (17/10/2026): KiwiCo
-- is not part of SnapGain. `kiwico` and `kiwico-uk` are unmerged, marked
-- with the new `stores.excluded_at`, left inactive, and their offers are
-- deactivated. The scraper does not reactivate an excluded store
-- (snapgain-scraper#39). Kiwi.com is not changed.
--
-- Backup: every offer and store row touched is copied, as it was, to
-- ops.store_merge_fix_20261017 / ops.store_merge_fix_20261017_stores
-- (row as jsonb). Rollback is restoring those rows by id.
--
-- The booster triggers are switched off for the duration so that copying
-- is_boosted onto a long-stale canonical row does not log a fake
-- "entered_boost" event (and send it in the daily digest).

begin;

set local lock_timeout = '8s';

create schema if not exists ops;

create table if not exists ops.store_merge_fix_20261017 (
  offer_table text not null,
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
create table if not exists ops.store_merge_fix_20261017_stores (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.store_merge_fix_20261017, ops.store_merge_fix_20261017_stores
  from public, anon, authenticated;

-- ── KiwiCo leaves SnapGain ─────────────────────────────────────────────
alter table public.stores add column if not exists excluded_at timestamptz;
comment on column public.stores.excluded_at is
  'Set when the owner decided this merchant is not part of SnapGain. The scraper never reactivates it.';

insert into ops.store_merge_fix_20261017_stores (row_data)
select to_jsonb(s) from public.stores s where s.slug in ('kiwico', 'kiwico-uk');

insert into ops.store_merge_fix_20261017 (offer_table, row_data)
select 'cashback_offers', to_jsonb(o) from public.cashback_offers o
  join public.stores s on s.id = o.store_id where s.slug in ('kiwico', 'kiwico-uk') and o.is_active
union all
select 'gift_card_offers', to_jsonb(o) from public.gift_card_offers o
  join public.stores s on s.id = o.store_id where s.slug in ('kiwico', 'kiwico-uk') and o.is_active
union all
select 'point_offers', to_jsonb(o) from public.point_offers o
  join public.stores s on s.id = o.store_id where s.slug in ('kiwico', 'kiwico-uk') and o.is_active;

update public.stores
   set merged_into = null, is_active = false, excluded_at = now()
 where slug in ('kiwico', 'kiwico-uk');

update public.cashback_offers set is_active = false
 where is_active and store_id in (select id from public.stores where slug in ('kiwico', 'kiwico-uk'));
update public.gift_card_offers set is_active = false
 where is_active and store_id in (select id from public.stores where slug in ('kiwico', 'kiwico-uk'));
update public.point_offers set is_active = false
 where is_active and store_id in (select id from public.stores where slug in ('kiwico', 'kiwico-uk'));

alter table public.cashback_offers disable trigger cashback_booster_change_trg;
alter table public.gift_card_offers disable trigger giftcard_booster_change_trg;

-- ── Plan: one row per live loser offer ─────────────────────────────────
create temporary table _plan on commit drop as
with canon as (
  -- Loser → end of its merge chain (2 hops is the deepest on 17/10).
  select s.id, coalesce(m.merged_into, s.merged_into) canon_store
  from public.stores s join public.stores m on m.id = s.merged_into
  where s.merged_into is not null
), live_loser as (
  select 'cashback_offers'::text t, o.id, c.canon_store, o.platform k, o.last_verified_at
  from public.cashback_offers o join canon c on c.id = o.store_id
  where o.is_active and o.last_verified_at >= now() - interval '30 days'
  union all
  select 'gift_card_offers', o.id, c.canon_store, o.platform, o.last_verified_at
  from public.gift_card_offers o join canon c on c.id = o.store_id
  where o.is_active and o.last_verified_at >= now() - interval '30 days'
  union all
  select 'point_offers', o.id, c.canon_store, o.airline, o.last_verified_at
  from public.point_offers o join canon c on c.id = o.store_id
  where o.is_active and o.last_verified_at >= now() - interval '30 days'
), ranked as (
  -- Several losers of one canonical can carry the same platform; only the
  -- freshest is used, the others are just deactivated.
  select l.*, row_number() over (partition by t, canon_store, k order by last_verified_at desc, id) rn
  from live_loser l
)
select r.t, r.id loser_offer_id, r.canon_store, r.k, r.last_verified_at, r.rn,
  case r.t
    when 'cashback_offers' then (select c.id from public.cashback_offers c where c.store_id = r.canon_store and c.platform = r.k order by c.last_verified_at desc nulls last, c.id limit 1)
    when 'gift_card_offers' then (select c.id from public.gift_card_offers c where c.store_id = r.canon_store and c.platform = r.k order by c.last_verified_at desc nulls last, c.id limit 1)
    when 'point_offers' then (select c.id from public.point_offers c where c.store_id = r.canon_store and c.airline = r.k order by c.last_verified_at desc nulls last, c.id limit 1)
  end canon_offer_id
from ranked r;

-- ── Backup every offer row that will be touched ───────────────────────
insert into ops.store_merge_fix_20261017 (offer_table, row_data)
select 'cashback_offers', to_jsonb(o) from public.cashback_offers o
where o.id in (select loser_offer_id from _plan where t = 'cashback_offers'
               union select canon_offer_id from _plan where t = 'cashback_offers' and canon_offer_id is not null);
insert into ops.store_merge_fix_20261017 (offer_table, row_data)
select 'gift_card_offers', to_jsonb(o) from public.gift_card_offers o
where o.id in (select loser_offer_id from _plan where t = 'gift_card_offers'
               union select canon_offer_id from _plan where t = 'gift_card_offers' and canon_offer_id is not null);
insert into ops.store_merge_fix_20261017 (offer_table, row_data)
select 'point_offers', to_jsonb(o) from public.point_offers o
where o.id in (select loser_offer_id from _plan where t = 'point_offers'
               union select canon_offer_id from _plan where t = 'point_offers' and canon_offer_id is not null);

-- ── 1. Canonical row exists: copy the newer values onto it ─────────────
update public.cashback_offers c
   set rate = o.rate, rate_breakdown = o.rate_breakdown,
       affiliate_link = coalesce(o.affiliate_link, c.affiliate_link),
       conditions = o.conditions, is_boosted = o.is_boosted,
       valid_from = o.valid_from, valid_to = o.valid_to,
       last_verified_at = o.last_verified_at, is_active = true
  from _plan p join public.cashback_offers o on o.id = p.loser_offer_id
 where p.t = 'cashback_offers' and p.rn = 1 and c.id = p.canon_offer_id
   and (c.last_verified_at is null or c.last_verified_at < o.last_verified_at or not c.is_active);

update public.gift_card_offers c
   set discount_pct = o.discount_pct,
       affiliate_link = coalesce(o.affiliate_link, c.affiliate_link),
       conditions = o.conditions, is_boosted = o.is_boosted,
       valid_from = o.valid_from, valid_to = o.valid_to,
       last_verified_at = o.last_verified_at, is_active = true
  from _plan p join public.gift_card_offers o on o.id = p.loser_offer_id
 where p.t = 'gift_card_offers' and p.rn = 1 and c.id = p.canon_offer_id
   and (c.last_verified_at is null or c.last_verified_at < o.last_verified_at or not c.is_active);

update public.point_offers c
   set earn_rate = o.earn_rate, booster_available = o.booster_available,
       affiliate_link = coalesce(o.affiliate_link, c.affiliate_link),
       conditions = o.conditions,
       valid_from = o.valid_from, valid_to = o.valid_to,
       last_verified_at = o.last_verified_at, is_active = true
  from _plan p join public.point_offers o on o.id = p.loser_offer_id
 where p.t = 'point_offers' and p.rn = 1 and c.id = p.canon_offer_id
   and (c.last_verified_at is null or c.last_verified_at < o.last_verified_at or not c.is_active);

-- ── 2. No canonical row: move the freshest loser row across ────────────
update public.cashback_offers o set store_id = p.canon_store
  from _plan p where p.t = 'cashback_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;
update public.gift_card_offers o set store_id = p.canon_store
  from _plan p where p.t = 'gift_card_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;
update public.point_offers o set store_id = p.canon_store
  from _plan p where p.t = 'point_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;

-- ── 3. Everything still on a loser: deactivate ────────────────────────
update public.cashback_offers o set is_active = false
  from _plan p where p.t = 'cashback_offers' and o.id = p.loser_offer_id
   and o.store_id <> p.canon_store;
update public.gift_card_offers o set is_active = false
  from _plan p where p.t = 'gift_card_offers' and o.id = p.loser_offer_id
   and o.store_id <> p.canon_store;
update public.point_offers o set is_active = false
  from _plan p where p.t = 'point_offers' and o.id = p.loser_offer_id
   and o.store_id <> p.canon_store;

alter table public.cashback_offers enable trigger cashback_booster_change_trg;
alter table public.gift_card_offers enable trigger giftcard_booster_change_trg;

-- ── Verify ─────────────────────────────────────────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n from (
    select o.id from public.cashback_offers o join public.stores s on s.id = o.store_id
     where s.merged_into is not null and o.is_active and o.last_verified_at >= now() - interval '30 days'
    union all
    select o.id from public.gift_card_offers o join public.stores s on s.id = o.store_id
     where s.merged_into is not null and o.is_active and o.last_verified_at >= now() - interval '30 days'
    union all
    select o.id from public.point_offers o join public.stores s on s.id = o.store_id
     where s.merged_into is not null and o.is_active and o.last_verified_at >= now() - interval '30 days'
  ) x;
  if n <> 0 then
    raise exception '% live offer(s) still on merged stores', n;
  end if;

  -- Every planned offer is now live on its canonical store.
  select count(*) into n from _plan p
   where p.rn = 1 and not exists (
     select 1 from public.cashback_offers c where p.t = 'cashback_offers' and c.store_id = p.canon_store and c.platform = p.k and c.is_active and c.last_verified_at >= now() - interval '30 days'
     union all
     select 1 from public.gift_card_offers c where p.t = 'gift_card_offers' and c.store_id = p.canon_store and c.platform = p.k and c.is_active and c.last_verified_at >= now() - interval '30 days'
     union all
     select 1 from public.point_offers c where p.t = 'point_offers' and c.store_id = p.canon_store and c.airline = p.k and c.is_active and c.last_verified_at >= now() - interval '30 days'
   );
  if n <> 0 then
    raise exception '% planned offer(s) not live on their canonical store', n;
  end if;

  -- KiwiCo is out: unmerged, inactive, excluded, no active offers.
  select count(*) into n from public.stores
   where slug in ('kiwico', 'kiwico-uk')
     and (merged_into is not null or is_active or excluded_at is null);
  if n <> 0 then
    raise exception 'KiwiCo stores not excluded';
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'cashback_booster_change_trg' and tgenabled = 'O')
     or not exists (select 1 from pg_trigger where tgname = 'giftcard_booster_change_trg' and tgenabled = 'O') then
    raise exception 'booster triggers not re-enabled';
  end if;
end $$;

commit;
