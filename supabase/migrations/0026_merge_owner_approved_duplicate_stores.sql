-- 0026 — merge the 69 duplicate-store pairs the owner approved
--
-- After 0025, 74 groups of active stores with the same name were still
-- separate: usually the Quidco/JamDoughnut offer on one, the Avios offer
-- on its twin ("Gap" / "Gap UK"). The owner reviewed the list with the
-- Claude Cowork on 17/10/2026 (docs/DECISAO_LOJAS_REPETIDAS_2026-10-17.md):
-- merge 69, keep 5 apart (braun / braun-household, manomano / manomanopro,
-- mission / mission-uk, national-trust / national-trust-online-shop,
-- perfume-uk / the-perfume-shop).
--
-- For each pair the store that stays is the one with a domain, then the
-- one with more live offers, then the one whose slug has no "-uk", then
-- the shorter slug. The other gets merged_into = the one that stays and
-- is_active = false, exactly like the 05/07 dedup; the stayer takes its
-- domain and logo if it has none. Stores already merged into the loser
-- are pointed at the stayer, so no chain gets longer. Then the live
-- offers move across with the same rules as 0025: the stayer's row for
-- the same platform takes the newer values, otherwise the row moves.
-- Nothing is deleted.
--
-- Also: the `manomano` store is the normal ManoMano shop but was named
-- "ManoMano Pro". It is renamed "ManoMano" (owner's decision).
--
-- Backup of every store and offer row touched:
-- ops.store_merge_fix_20261018 / ops.store_merge_fix_20261018_stores.
-- The scraper already follows merged_into on every lookup
-- (snapgain-scraper#39), so the twins are not recreated.

begin;

set local lock_timeout = '8s';

create table if not exists ops.store_merge_fix_20261018 (
  offer_table text not null,
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
create table if not exists ops.store_merge_fix_20261018_stores (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.store_merge_fix_20261018, ops.store_merge_fix_20261018_stores
  from public, anon, authenticated;

create temporary table _pairs (a text, b text) on commit drop;
insert into _pairs (a, b) values
  ('ag1','ag1-uk'),
  ('alibris','alibris-uk'),
  ('american-golf','american-golf-uk'),
  ('best-heating','bestheating'),
  ('brand-corner','brandcorner'),
  ('brooks-brothers','brooks-brothers-uk'),
  ('cabin-zero','cabinzero'),
  ('camperdays','camperdays-uk'),
  ('christophe-robin','christophe-robin-uk'),
  ('cotswold-company','the-cotswold-company'),
  ('curlsmith','curlsmith-uk'),
  ('dc-shoes','dc-shoes-uk'),
  ('dermalogica','dermalogica-uk'),
  ('diesel','diesel-uk'),
  ('eventim','eventim-uk'),
  ('flora-select','floraselect'),
  ('footpatrol','footpatrol-uk'),
  ('free-people','free-people-uk'),
  ('gap','gap-uk'),
  ('geox','geox-uk'),
  ('get-your-guide','getyourguide'),
  ('h-samuel','hsamuel'),
  ('hamilton','hamilton-watch'),
  ('harrys','harrys-uk'),
  ('heat-holders','heat-holders-uk'),
  ('helly-hansen','helly-hansen-uk'),
  ('high-street-tv','highstreet-tv'),
  ('hurley','hurley-uk'),
  ('ickle-bubba','icklebubba'),
  ('indytute','the-indytute'),
  ('interflora','interflora-uk'),
  ('kate-spade-new-york','kate-spade-new-york-uk'),
  ('kipling','kipling-uk'),
  ('london-theatre-direct','londontheatredirect'),
  ('lounge-pass','loungepass'),
  ('malmaison','malmaison-hotels'),
  ('md-london','mdlondon'),
  ('my-picture','mypicture'),
  ('nannybag','nannybag-uk'),
  ('netgear','netgear-uk'),
  ('never-fully-dressed','never-fully-dressed-uk'),
  ('olympic-shop','olympic-shop-uk'),
  ('omorovicza','omorovicza-cosmetics'),
  ('parfumdreams','parfumdreams-uk'),
  ('paris-saint-germain','paris-saint-germain-store'),
  ('pharmacy-online','pharmacy-online-uk'),
  ('purple-cv','purplecv'),
  ('quiksilver','quiksilver-uk'),
  ('regatta','regattacom'),
  ('roxy','roxy-uk'),
  ('shiseido','shiseido-uk'),
  ('simply-led','simplyled'),
  ('smart-buy-glasses','smartbuyglasses'),
  ('sonos','sonos-uk'),
  ('spa-seekers','spaseekers'),
  ('standout','standoutcouk'),
  ('tatcha','tatcha-uk'),
  ('th-baker','thbaker'),
  ('the-craft-beer','the-craft-beer-uk'),
  ('the-diamond-store','the-diamond-store-uk'),
  ('tog-24','tog24'),
  ('tonies','tonies-uk'),
  ('travelodge','travelodge-uk'),
  ('turtle-wax','turtle-wax-uk'),
  ('veronica-beard','veronica-beard-uk'),
  ('wahl','wahl-uk'),
  ('wingly','wingly-uk'),
  ('yesstyle','yesstylecouk'),
  ('you-garden','yougarden');

-- ── Pick the store that stays ─────────────────────────────────────────
create temporary table _merge on commit drop as
with live as (
  select store_id, count(*) n from (
    select store_id from public.cashback_offers where is_active and last_verified_at >= now() - interval '30 days'
    union all select store_id from public.gift_card_offers where is_active and last_verified_at >= now() - interval '30 days'
    union all select store_id from public.point_offers where is_active and last_verified_at >= now() - interval '30 days'
  ) x group by store_id
), side as (
  select p.a pair_key, s.id, s.slug,
    row_number() over (
      partition by p.a
      order by (s.domain is not null) desc, coalesce(l.n, 0) desc,
               (s.slug like '%-uk') asc, length(s.slug) asc, s.slug asc
    ) rk
  from _pairs p
  join public.stores s on s.slug in (p.a, p.b)
  left join live l on l.store_id = s.id
)
select w.pair_key, w.id winner_id, w.slug winner_slug, l.id loser_id, l.slug loser_slug
from side w join side l on l.pair_key = w.pair_key and l.rk = 2
where w.rk = 1;

do $$
declare
  n int;
begin
  select count(*) into n from _merge;
  if n <> 69 then
    raise exception 'expected 69 pairs, found %', n;
  end if;
  select count(*) into n from public.stores s
   where s.id in (select winner_id from _merge union select loser_id from _merge)
     and (s.merged_into is not null or s.excluded_at is not null);
  if n <> 0 then
    raise exception '% store(s) in the list are already merged or excluded', n;
  end if;
end $$;

insert into ops.store_merge_fix_20261018_stores (row_data)
select to_jsonb(s) from public.stores s
 where s.id in (select winner_id from _merge union select loser_id from _merge)
    or s.merged_into in (select loser_id from _merge)
    or s.slug = 'manomano';

-- ── Merge the stores ──────────────────────────────────────────────────
update public.stores w
   set domain = coalesce(w.domain, l.domain),
       logo_url = coalesce(w.logo_url, l.logo_url)
  from _merge m join public.stores l on l.id = m.loser_id
 where w.id = m.winner_id;

update public.stores s set merged_into = m.winner_id
  from _merge m where s.merged_into = m.loser_id;

update public.stores s set merged_into = m.winner_id, is_active = false
  from _merge m where s.id = m.loser_id;

update public.stores set name = 'ManoMano'
 where slug = 'manomano' and name = 'ManoMano Pro';

-- ── Move the live offers (same rules as 0025) ─────────────────────────
alter table public.cashback_offers disable trigger cashback_booster_change_trg;
alter table public.gift_card_offers disable trigger giftcard_booster_change_trg;

create temporary table _plan on commit drop as
with canon as (
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

insert into ops.store_merge_fix_20261018 (offer_table, row_data)
select 'cashback_offers', to_jsonb(o) from public.cashback_offers o
where o.id in (select loser_offer_id from _plan where t = 'cashback_offers'
               union select canon_offer_id from _plan where t = 'cashback_offers' and canon_offer_id is not null);
insert into ops.store_merge_fix_20261018 (offer_table, row_data)
select 'gift_card_offers', to_jsonb(o) from public.gift_card_offers o
where o.id in (select loser_offer_id from _plan where t = 'gift_card_offers'
               union select canon_offer_id from _plan where t = 'gift_card_offers' and canon_offer_id is not null);
insert into ops.store_merge_fix_20261018 (offer_table, row_data)
select 'point_offers', to_jsonb(o) from public.point_offers o
where o.id in (select loser_offer_id from _plan where t = 'point_offers'
               union select canon_offer_id from _plan where t = 'point_offers' and canon_offer_id is not null);

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

update public.cashback_offers o set store_id = p.canon_store
  from _plan p where p.t = 'cashback_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;
update public.gift_card_offers o set store_id = p.canon_store
  from _plan p where p.t = 'gift_card_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;
update public.point_offers o set store_id = p.canon_store
  from _plan p where p.t = 'point_offers' and p.rn = 1 and p.canon_offer_id is null and o.id = p.loser_offer_id;

update public.cashback_offers o set is_active = false
  from _plan p where p.t = 'cashback_offers' and o.id = p.loser_offer_id and o.store_id <> p.canon_store;
update public.gift_card_offers o set is_active = false
  from _plan p where p.t = 'gift_card_offers' and o.id = p.loser_offer_id and o.store_id <> p.canon_store;
update public.point_offers o set is_active = false
  from _plan p where p.t = 'point_offers' and o.id = p.loser_offer_id and o.store_id <> p.canon_store;

alter table public.cashback_offers enable trigger cashback_booster_change_trg;
alter table public.gift_card_offers enable trigger giftcard_booster_change_trg;

-- ── Verify ─────────────────────────────────────────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n from public.stores s join _merge m on m.loser_id = s.id
   where s.merged_into is distinct from m.winner_id or s.is_active;
  if n <> 0 then
    raise exception '% loser store(s) not merged', n;
  end if;

  select count(*) into n from public.stores s join public.stores m on m.id = s.merged_into
   join public.stores m2 on m2.id = m.merged_into where m2.merged_into is not null;
  if n <> 0 then
    raise exception '% merge chain(s) longer than 2 hops', n;
  end if;

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

  -- The five pairs the owner kept apart are untouched.
  select count(*) into n from public.stores
   where slug in ('braun', 'braun-household', 'manomano', 'manomanopro', 'mission', 'mission-uk',
                  'national-trust', 'national-trust-online-shop', 'perfume-uk', 'the-perfume-shop')
     and (merged_into is not null or not is_active);
  if n <> 0 then
    raise exception '% kept-apart store(s) were merged or deactivated', n;
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'cashback_booster_change_trg' and tgenabled = 'O')
     or not exists (select 1 from pg_trigger where tgname = 'giftcard_booster_change_trg' and tgenabled = 'O') then
    raise exception 'booster triggers not re-enabled';
  end if;
end $$;

commit;
