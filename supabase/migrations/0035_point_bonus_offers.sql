-- 0035 — fixed "N Avios per order" bonuses (task 3)
--
-- Some Avios eStore partners pay a flat bonus per order instead of
-- Avios per £1. Sainsbury's Grocery on avios.com (checked by Cowork,
-- 18/10/2026): 700 Avios for a new customer on the website, 800 for a
-- new customer in the app, 100 for an existing customer, £50 minimum
-- order. point_offers holds one per-£ rate per store and programme, so
-- it cannot hold this (owner's afternoon decision,
-- docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md).
--
-- One row per store, programme, customer type and channel. Read rules
-- copy point_offers: anyone can read active rows; only the service role
-- (the scrapers) writes. The scraper keeps last_verified_at fresh; until
-- it does, the rows below expire under the usual 30-day rule.
--
-- Rollback: drop table public.point_bonus_offers.

begin;

create table if not exists public.point_bonus_offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  airline text not null,
  bonus_points integer not null check (bonus_points > 0),
  customer_type text not null default 'any' check (customer_type in ('new', 'existing', 'any')),
  channel text not null default 'any' check (channel in ('web', 'app', 'any')),
  min_spend numeric(10, 2) check (min_spend is null or min_spend >= 0),
  affiliate_link text,
  conditions text,
  last_verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, airline, customer_type, channel)
);

create index if not exists point_bonus_offers_store_idx on public.point_bonus_offers (store_id);

alter table public.point_bonus_offers enable row level security;
revoke all on public.point_bonus_offers from public, anon, authenticated;
grant select on public.point_bonus_offers to anon, authenticated;
create policy point_bonus_offers_public_read on public.point_bonus_offers
  for select to anon, authenticated using (is_active);

insert into public.point_bonus_offers
  (store_id, airline, bonus_points, customer_type, channel, min_spend, conditions, last_verified_at)
select s.id, 'British Airways Avios', v.pts, v.ctype, v.chan, 50,
       'Avios eStore, Sainsbury''s Grocery: checked on avios.com by Cowork, 18/10/2026',
       timestamptz '2026-10-18 15:00:00+01'
  from public.stores s,
       (values (700, 'new', 'web'), (800, 'new', 'app'), (100, 'existing', 'any')) as v(pts, ctype, chan)
 where s.slug = 'sainsburys'
on conflict (store_id, airline, customer_type, channel) do nothing;

do $$
begin
  if (select count(*) from public.point_bonus_offers b
        join public.stores s on s.id = b.store_id
       where s.slug = 'sainsburys' and b.is_active and b.min_spend = 50) <> 3 then
    raise exception 'expected the three Sainsbury''s Avios bonuses';
  end if;
end $$;

commit;
