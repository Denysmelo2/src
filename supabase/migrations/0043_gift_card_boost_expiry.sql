-- 0043: a temporary gift-card rate ends on its own, on time.
--
-- Handover 15/11/2026 (JamDoughnut Pump Up), task 2. The robot now
-- stores JamDoughnut's highest Pump Up rate with valid_to = the end of
-- the boost (snapgain-scraper#57). The boost ends at 23:59 but the
-- robot runs at 08:00, so from midnight to 08:00 the site would show a
-- rate that no longer exists.
--
-- * standard_discount_pct: the rate to go back to when valid_to passes.
--   Null when the offer is not boosted. The robot writes it as soon as
--   the column exists (it checks at the start of each run).
-- * public.expire_gift_card_boosts(): every offer whose valid_to has
--   passed and that has a standard rate goes back to it, unboosted,
--   with the Pump Up text taken out of conditions.
-- * pg_cron job 'gift-card-boost-expiry', every 15 minutes.
-- * Backfill: the 264 offers the Cowork boosted by hand on 15/11 carry
--   "(…, N% standard)" in conditions; that N becomes their standard
--   rate, so they also go back at 23:59.
--
-- To switch off: select cron.alter_job(jobid, active := false)
--   from cron.job where jobname = 'gift-card-boost-expiry';
-- Rollback: unschedule the job, drop the function, drop the column.

alter table public.gift_card_offers
  add column if not exists standard_discount_pct numeric;

comment on column public.gift_card_offers.standard_discount_pct is
  'Rate to go back to when valid_to passes (temporary boost). Null when not boosted.';

update public.gift_card_offers
   set standard_discount_pct = substring(conditions from '([0-9]+(?:\.[0-9]+)?)% standard\)')::numeric
 where standard_discount_pct is null
   and is_boosted
   and valid_to is not null
   and conditions ~ 'Pump Up until .*[0-9]% standard\)';

create or replace function public.expire_gift_card_boosts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.gift_card_offers
     set discount_pct = standard_discount_pct,
         standard_discount_pct = null,
         is_boosted = false,
         valid_to = null,
         -- "Online · Pump Up until …" → "Online"; "Pump Up until …" → null
         conditions = nullif(regexp_replace(conditions, '(^| · )Pump Up until .*$', ''), ''),
         updated_at = now()
   where valid_to is not null
     and valid_to < now()
     and standard_discount_pct is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.expire_gift_card_boosts() from public, anon, authenticated;
grant execute on function public.expire_gift_card_boosts() to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'gift-card-boost-expiry';

select cron.schedule(
  'gift-card-boost-expiry',
  '*/15 * * * *',
  $cron$ select public.expire_gift_card_boosts(); $cron$
);

do $$
begin
  if has_function_privilege('anon', 'public.expire_gift_card_boosts()', 'execute') then
    raise exception 'anon can execute expire_gift_card_boosts()';
  end if;
  if not exists (select 1 from cron.job where jobname = 'gift-card-boost-expiry' and active) then
    raise exception 'gift-card-boost-expiry job missing';
  end if;
end $$;
