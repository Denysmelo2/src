-- 0031 — store categories, names and four duplicate pairs (owner, 18/10/2026)
--
-- docs/DECISAO_CATEGORIAS_2026-10-18.md, answering
-- docs/PARA_COWORK_CATEGORIAS_2026-10-18.md. Nothing is deleted.
--
-- 1. Categories. 95 stores sat in 17 to 22 categories because the Quidco
--    scraper only ever added them (fixed in snapgain-scraper#40). Cowork
--    picked 1 to 3 per store from each store's own site and the owner
--    approved them. The new list replaces the old one; 'gift-card' is
--    kept where it was, since it marks that a platform sells the store's
--    gift cards rather than what the store sells.
-- 2. Names. 14 display names lose a page-title suffix ("adidas Shop" →
--    "adidas", "Very.co.uk" → "Very"...). Slugs stay: links and scrapers
--    use them. The scrapers never overwrite a name.
-- 3. Duplicates. Four pairs are merged the same way as 0026: the second
--    store gets merged_into = the first and is_active = false, and its
--    live offers move across. In each pair the store that stays has the
--    domain or the live offer, so the decision's "keep the one with more
--    information" rule needs no swap.
--
-- Backup of every store and offer row touched, before any change:
-- ops.store_cleanup_20261018_stores / ops.store_cleanup_20261018_offers.
-- Rollback: restore category, name, merged_into and is_active from the
-- stores backup; the offers backup holds the offer rows as they were.

begin;

set local lock_timeout = '8s';

create table if not exists ops.store_cleanup_20261018_stores (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
create table if not exists ops.store_cleanup_20261018_offers (
  offer_table text not null,
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.store_cleanup_20261018_stores, ops.store_cleanup_20261018_offers
  from public, anon, authenticated;

create temporary table _cats (slug text primary key, cats text[]) on commit drop;
insert into _cats (slug, cats) values
  ('adidas', array['fashion', 'sports']),
  ('aeg-uk', array['home', 'electronics']),
  ('allsaints', array['fashion']),
  ('antler-luggage', array['travel-and-leisure', 'fashion']),
  ('aocom', array['electronics', 'home']),
  ('aph-airport-parking-and-hotels', array['travel-and-leisure']),
  ('apple', array['electronics']),
  ('appliances-direct', array['home', 'electronics']),
  ('argos', array['department-stores', 'home', 'electronics']),
  ('aspinal-of-london', array['fashion', 'luxury']),
  ('austen-and-blake', array['jewellery']),
  ('avios-hotels-powered-by-expedia', array['travel-and-leisure']),
  ('avios-insurance', array['finance', 'travel-and-leisure']),
  ('b-and-q', array['home', 'garden']),
  ('barker-and-stonehouse', array['home']),
  ('bensons-for-beds', array['home']),
  ('bookingcom-uk', array['travel-and-leisure']),
  ('bosch', array['home', 'electronics']),
  ('brighton-gift-card-town-and-city-gift-cards', array['gifts']),
  ('bristol-gift-card-town-and-city-gift-cards', array['gifts']),
  ('burberry-uk', array['fashion', 'luxury']),
  ('butlins', array['travel-and-leisure', 'things-to-do']),
  ('cambridge-gift-card-town-and-city-gift-cards', array['gifts']),
  ('canterbury-gift-card-town-and-city-gift-cards', array['gifts']),
  ('chester-gift-card-town-and-city-gift-cards', array['gifts']),
  ('cos', array['fashion']),
  ('cotswold-company', array['home']),
  ('cult-beauty', array['beauty']),
  ('currys', array['electronics', 'home']),
  ('dreams', array['home']),
  ('edinburgh-gift-card-town-and-city-gift-cards', array['gifts']),
  ('emma-sleep', array['home']),
  ('flannels', array['fashion', 'luxury']),
  ('frasers', array['department-stores', 'fashion', 'luxury']),
  ('getyourguide', array['things-to-do', 'travel-and-leisure']),
  ('glasgow-gift-card-town-and-city-gift-cards', array['gifts']),
  ('goldsmiths', array['jewellery', 'luxury']),
  ('google-store', array['electronics']),
  ('habitat', array['home']),
  ('harrods', array['department-stores', 'luxury', 'fashion']),
  ('harvey-nichols', array['department-stores', 'luxury', 'fashion']),
  ('hobbs', array['fashion']),
  ('holiday-extras', array['travel-and-leisure']),
  ('holland-and-barrett', array['health', 'beauty']),
  ('hotelscom', array['travel-and-leisure']),
  ('ihg-hotels-and-resorts', array['travel-and-leisure']),
  ('it-luggage', array['travel-and-leisure', 'fashion']),
  ('john-lewis-and-partners', array['department-stores', 'home', 'fashion']),
  ('karcher-uk', array['home', 'garden']),
  ('liberty-london', array['department-stores', 'luxury', 'fashion']),
  ('london-city-gift-card-town-and-city-gift-cards', array['gifts']),
  ('lookfantastic', array['beauty']),
  ('lululemon', array['fashion', 'sports']),
  ('malmaison', array['travel-and-leisure']),
  ('mango-uk', array['fashion']),
  ('marks-and-spencer', array['department-stores', 'fashion', 'food-and-drink']),
  ('marriott-bonvoy', array['travel-and-leisure']),
  ('meta', array['electronics', 'gaming']),
  ('molton-brown', array['beauty']),
  ('moneysupermarket-travel-insurance', array['finance', 'travel-and-leisure']),
  ('nespresso-coffee', array['food-and-drink', 'home']),
  ('net-a-porter', array['fashion', 'luxury']),
  ('new-look', array['fashion']),
  ('noble-panacea', array['beauty']),
  ('panda', array['home']),
  ('pandora', array['jewellery']),
  ('passenger', array['fashion']),
  ('paul-smith', array['fashion', 'luxury']),
  ('pets-at-home', array['pets']),
  ('phase-eight', array['fashion']),
  ('radisson-hotels', array['travel-and-leisure']),
  ('randox-health', array['health']),
  ('ray-ban-uk', array['fashion']),
  ('river-island', array['fashion']),
  ('rohan', array['fashion', 'sports']),
  ('schuh', array['fashion']),
  ('selfridges', array['department-stores', 'luxury', 'fashion']),
  ('sephora', array['beauty']),
  ('sharkninja', array['home', 'electronics']),
  ('soho-home', array['home']),
  ('space-nk', array['beauty']),
  ('sweaty-betty', array['fashion', 'sports']),
  ('swift-direct-blinds', array['home']),
  ('the-range', array['department-stores', 'home', 'garden']),
  ('the-royal-mint', array['gifts', 'jewellery', 'finance']),
  ('tk-maxx', array['department-stores', 'fashion', 'home']),
  ('town-and-city-gift-card', array['gifts']),
  ('trainpal', array['travel-and-leisure']),
  ('tu-clothing', array['fashion']),
  ('uniqlo', array['fashion']),
  ('very', array['department-stores', 'fashion', 'electronics']),
  ('viator-uk', array['things-to-do', 'travel-and-leisure']),
  ('whistles', array['fashion']),
  ('wickes', array['home', 'garden']),
  ('york-gift-card-town-and-city-gift-cards', array['gifts']);

create temporary table _names (slug text primary key, old_name text, new_name text) on commit drop;
insert into _names (slug, old_name, new_name) values
  ('adidas', 'adidas Shop', 'adidas'),
  ('very', 'Very.co.uk', 'Very'),
  ('mango-uk', 'MANGO UK', 'MANGO'),
  ('lookfantastic', 'LOOKFANTASTIC Beauty Box', 'LOOKFANTASTIC'),
  ('pandora', 'PANDORA Jewellery', 'Pandora'),
  ('nespresso-coffee', 'Nespresso Coffee', 'Nespresso'),
  ('burberry-uk', 'Burberry UK', 'Burberry'),
  ('sephora', 'Sephora UK', 'Sephora'),
  ('ray-ban-uk', 'Ray-Ban UK', 'Ray-Ban'),
  ('viator-uk', 'Viator UK', 'Viator'),
  ('bookingcom-uk', 'Booking.com UK', 'Booking.com'),
  ('habitat', 'Habitat UK', 'Habitat'),
  ('aeg-uk', 'AEG UK', 'AEG'),
  ('karcher-uk', 'Kärcher UK', 'Kärcher');

create temporary table _pairs (a text, b text) on commit drop;
insert into _pairs (a, b) values
  ('alpinetrek', 'alpinetrekcouk'),
  ('ligo', 'ligocouk'),
  ('tyndrumwhisky', 'tyndrumwhiskycom'),
  ('yoursurprise', 'yoursurprisecouk');

create temporary table _merge on commit drop as
select a.id winner_id, a.slug winner_slug, b.id loser_id, b.slug loser_slug
  from _pairs p
  join public.stores a on a.slug = p.a
  join public.stores b on b.slug = p.b;

-- ── Check the lists match the database ────────────────────────────────
do $$
declare
  n int;
begin
  select count(*) into n from _cats c join public.stores s on s.slug = c.slug
   where s.is_active and s.merged_into is null;
  if n <> 95 then
    raise exception 'expected 95 active stores for the categories, found %', n;
  end if;
  select count(*) into n from _names c join public.stores s on s.slug = c.slug and s.name = c.old_name;
  if n <> 14 then
    raise exception 'expected 14 stores with the old names, found %', n;
  end if;
  select count(*) into n from _merge m
    join public.stores w on w.id = m.winner_id
    join public.stores l on l.id = m.loser_id
   where w.is_active and l.is_active and w.merged_into is null and l.merged_into is null
     and w.excluded_at is null and l.excluded_at is null;
  if n <> 4 then
    raise exception 'expected 4 unmerged active pairs, found %', n;
  end if;
end $$;

insert into ops.store_cleanup_20261018_stores (row_data)
select to_jsonb(s) from public.stores s
 where s.slug in (select slug from _cats union select slug from _names)
    or s.id in (select winner_id from _merge union select loser_id from _merge)
    or s.merged_into in (select loser_id from _merge);

-- ── 1. Categories ─────────────────────────────────────────────────────
update public.stores s
   set category = c.cats || case when 'gift-card' = any(coalesce(s.category, '{}'))
                                 then array['gift-card'] else '{}'::text[] end
  from _cats c
 where s.slug = c.slug;

-- ── 2. Names ──────────────────────────────────────────────────────────
update public.stores s set name = c.new_name
  from _names c where s.slug = c.slug and s.name = c.old_name;

-- ── 3. Duplicates (as 0026) ───────────────────────────────────────────
update public.stores w
   set domain = coalesce(w.domain, l.domain),
       logo_url = coalesce(w.logo_url, l.logo_url)
  from _merge m join public.stores l on l.id = m.loser_id
 where w.id = m.winner_id;

update public.stores s set merged_into = m.winner_id
  from _merge m where s.merged_into = m.loser_id;

update public.stores s set merged_into = m.winner_id, is_active = false
  from _merge m where s.id = m.loser_id;

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

insert into ops.store_cleanup_20261018_offers (offer_table, row_data)
select 'cashback_offers', to_jsonb(o) from public.cashback_offers o
where o.id in (select loser_offer_id from _plan where t = 'cashback_offers'
               union select canon_offer_id from _plan where t = 'cashback_offers' and canon_offer_id is not null);
insert into ops.store_cleanup_20261018_offers (offer_table, row_data)
select 'gift_card_offers', to_jsonb(o) from public.gift_card_offers o
where o.id in (select loser_offer_id from _plan where t = 'gift_card_offers'
               union select canon_offer_id from _plan where t = 'gift_card_offers' and canon_offer_id is not null);
insert into ops.store_cleanup_20261018_offers (offer_table, row_data)
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
  select count(*) into n from public.stores s join _cats c on c.slug = s.slug
   where not (s.category @> c.cats)
      or cardinality(array(select unnest(s.category) except select unnest(c.cats || array['gift-card']))) > 0;
  if n <> 0 then
    raise exception '% store(s) without the approved categories', n;
  end if;

  select count(*) into n from public.stores s join _names c on c.slug = s.slug
   where s.name <> c.new_name;
  if n <> 0 then
    raise exception '% store(s) not renamed', n;
  end if;

  select count(*) into n from public.stores s join _merge m on m.loser_id = s.id
   where s.merged_into is distinct from m.winner_id or s.is_active;
  if n <> 0 then
    raise exception '% loser store(s) not merged', n;
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

  if not exists (select 1 from pg_trigger where tgname = 'cashback_booster_change_trg' and tgenabled = 'O')
     or not exists (select 1 from pg_trigger where tgname = 'giftcard_booster_change_trg' and tgenabled = 'O') then
    raise exception 'booster triggers not re-enabled';
  end if;
end $$;

commit;
