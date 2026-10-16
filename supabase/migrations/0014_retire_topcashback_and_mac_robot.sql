-- 0014 — retire TopCashback (cashback + gift cards) and the Quidco
-- gift-card shop, and stop the Mac robot
--
-- Owner's call, 16/10/2026: TopCashback blocks the robot ("Human
-- Verification" / "Access Denied" on 87 of 145 category pages on run #16)
-- and its rates are not the best; the gift-card comparison stays on
-- JamDoughnut, EverUp and Cheddar, which run in the cloud. With those
-- gone the member-scrape robot (Bárbara's Mac over Tailscale) has nothing
-- left to read, so its dispatch is switched off.
--
-- Reversible: nothing is deleted. Every row switched off here is listed
-- in ops.retired_offers; to bring a platform back:
--   update public.cashback_offers c set is_active = true
--     from ops.retired_offers r
--    where r.table_name = 'cashback_offers' and r.offer_id = c.id
--      and r.batch = '2026-10-16-topcashback';
--   (same for gift_card_offers), then
--   select cron.alter_job((select jobid from cron.job
--     where jobname = 'member-scrape-dispatch'), active := true);

begin;

create table if not exists ops.retired_offers (
  table_name text not null,
  offer_id uuid not null,
  platform text not null,
  batch text not null,
  retired_at timestamptz not null default now(),
  primary key (table_name, offer_id, batch)
);
alter table ops.retired_offers enable row level security;
revoke all on ops.retired_offers from public, anon, authenticated;

insert into ops.retired_offers (table_name, offer_id, platform, batch)
select 'cashback_offers', id, platform, '2026-10-16-topcashback'
  from public.cashback_offers
 where platform = 'topcashback' and is_active
on conflict do nothing;

insert into ops.retired_offers (table_name, offer_id, platform, batch)
select 'gift_card_offers', id, platform, '2026-10-16-topcashback'
  from public.gift_card_offers
 where platform in ('topcashback-giftcards', 'quidco-giftcards') and is_active
on conflict do nothing;

update public.cashback_offers set is_active = false
 where platform = 'topcashback' and is_active;

update public.gift_card_offers set is_active = false
 where platform in ('topcashback-giftcards', 'quidco-giftcards') and is_active;

update public.platforms_explained set is_active = false
 where slug = 'topcashback';

select cron.alter_job(jobid, active := false)
  from cron.job where jobname = 'member-scrape-dispatch';

do $$
declare n int;
begin
  select count(*) into n from public.cashback_offers where platform = 'topcashback' and is_active;
  if n <> 0 then raise exception '% TopCashback offers still active', n; end if;
  select count(*) into n from public.gift_card_offers
   where platform in ('topcashback-giftcards', 'quidco-giftcards') and is_active;
  if n <> 0 then raise exception '% retired gift-card offers still active', n; end if;
  select count(*) into n from cron.job where jobname = 'member-scrape-dispatch' and active;
  if n <> 0 then raise exception 'member-scrape-dispatch is still active'; end if;
end $$;

commit;
