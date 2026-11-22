-- 0047 — owner's tests of 21/11/2026, PR A (comparison numbers).
-- Handover docs/HANDOVER_CLAUDE_CODE_2026-11-21-testes-do-dono.md.
--
-- 1. A2, the user's card inside the total. platform rows of type 'card'
--    get what the card earns per £1 spent:
--      card_earn_rate        1, 1.5, 0.25 …
--      card_earn_unit        'pct' (1 = 1% back), 'avios' (Avios per £1)
--                            or 'points' (points per £1)
--      card_point_value_gbp  £ per point, for 'points' cards only (Amex
--                            MR, Clubcard, Nectar are worth different
--                            amounts). Avios use the site's £0.0092.
--    All empty after this migration: the Cowork fills them after checking
--    each bank. A card with no rate is ignored, and /compare keeps today's
--    "+ ~£1.00 if you pay with a 1% card" line, out of the total.
-- 2. A3, the shop's name on the source. cashback_offers.source_name: the
--    name the platform lists the shop under, when it is not the store's
--    name (NX lists "Currys Partsmaster", the store is Currys). Written by
--    the NX robot; the steps say "On NX Rewards, search for 'Currys
--    Partsmaster'".
-- 3. A5, Avios boosts in Hot deals and in the boost email. point_offers
--    had no trigger, so an Avios eStore boost never became a
--    booster_event. track_points_booster_change() does for
--    booster_available what the cashback and gift-card triggers do for
--    is_boosted (same events, same 0.5 threshold on a rate that moves
--    while boosted). booster_events.offer_table accepts 'points'.
--
-- Rollback:
--   drop trigger points_booster_change_trg on public.point_offers;
--   drop function public.track_points_booster_change();
--   (put the offer_table check back to 'cashback', 'gift_card' after
--    deleting the 'points' rows)
--   alter table public.cashback_offers drop column source_name;
--   alter table public.platform drop column card_earn_rate,
--     drop column card_earn_unit, drop column card_point_value_gbp;

begin;

-- 1. What a card earns ---------------------------------------------------
alter table public.platform
  add column if not exists card_earn_rate numeric,
  add column if not exists card_earn_unit text,
  add column if not exists card_point_value_gbp numeric;

alter table public.platform drop constraint if exists platform_card_earn_unit_check;
alter table public.platform
  add constraint platform_card_earn_unit_check
  check (card_earn_unit is null or card_earn_unit in ('pct', 'avios', 'points'));

alter table public.platform drop constraint if exists platform_card_earn_rate_check;
alter table public.platform
  add constraint platform_card_earn_rate_check
  check (card_earn_rate is null or (card_earn_rate >= 0 and card_earn_rate < 100));

comment on column public.platform.card_earn_rate is
  'Cards only: what the card earns per £1 spent, in card_earn_unit (0047).';
comment on column public.platform.card_earn_unit is
  'Cards only: pct (1 = 1% back), avios (Avios per £1) or points (points per £1) (0047).';
comment on column public.platform.card_point_value_gbp is
  'Cards with card_earn_unit = points: £ per point (0047).';

-- 2. The shop's name on the source --------------------------------------
alter table public.cashback_offers
  add column if not exists source_name text;

comment on column public.cashback_offers.source_name is
  'The name the platform lists the shop under, when it differs from the store name (NX robot, 0047).';

-- 3. Avios boosts become booster_events ----------------------------------
alter table public.booster_events drop constraint if exists booster_events_offer_table_check;
alter table public.booster_events
  add constraint booster_events_offer_table_check
  check (offer_table in ('cashback', 'gift_card', 'points'));

create or replace function public.track_points_booster_change()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'UPDATE' then
    if old.booster_available is not true and new.booster_available is true then
      insert into booster_events (store_id, platform, offer_table, event, old_rate, new_rate)
        values (new.store_id, new.airline, 'points', 'entered_boost', old.earn_rate, new.earn_rate);
    elsif old.booster_available is true and new.booster_available is not true then
      insert into booster_events (store_id, platform, offer_table, event, old_rate, new_rate)
        values (new.store_id, new.airline, 'points', 'left_boost', old.earn_rate, new.earn_rate);
    elsif old.booster_available is true and new.booster_available is true
          and abs(coalesce(new.earn_rate, 0) - coalesce(old.earn_rate, 0)) > 0.5 then
      insert into booster_events (store_id, platform, offer_table, event, old_rate, new_rate)
        values (
          new.store_id, new.airline, 'points',
          case when new.earn_rate > old.earn_rate then 'rate_up' else 'rate_down' end,
          old.earn_rate, new.earn_rate
        );
    end if;
  elsif tg_op = 'INSERT' and new.booster_available is true then
    insert into booster_events (store_id, platform, offer_table, event, old_rate, new_rate)
      values (new.store_id, new.airline, 'points', 'entered_boost', null, new.earn_rate);
  end if;
  return new;
end;
$function$;

drop trigger if exists points_booster_change_trg on public.point_offers;
create trigger points_booster_change_trg
  after insert or update on public.point_offers
  for each row execute function public.track_points_booster_change();

commit;
