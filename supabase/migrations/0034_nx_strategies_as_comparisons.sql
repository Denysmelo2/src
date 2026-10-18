-- 0034 — Deliveroo and Boots NX strategies come back as live comparisons
--
-- Owner's afternoon decision of 18/10/2026
-- (docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md, section 2): NX strategies
-- are adjusted, not removed. Each becomes a comparison: for the amount
-- the customer types, the card lists the single routes that exist today
-- (NX, Avios eStore, cashback, gift card) with the sum for each and the
-- best one on top. NX never adds to a gift card (its Special Terms).
--
-- * live_compare (0033) is set, so the card shows the live comparison for
--   target_store_id (src/components/LiveCompare.jsx).
-- * deliveroo-triple-stack → "Deliveroo: 10% back with NX". It replaces
--   both Deliveroo NX strategies; deliveroo-easy-combo stays off. The
--   21% and 16% figures are gone.
-- * nx-one4all-airtime-triple → "Boots: NX, Avios, Quidco or gift card —
--   compared". Boots only (no Argos, not in the NX network); Airtime is a
--   separate in-store tip, never added to NX.
-- * Sainsbury's waits for the fixed Avios bonus (task 3); owner's call.
--
-- Backup of the two rows before the change: ops.curated_backup_20261018.
-- Rollback: restore title, description, hero_*, difficulty, category,
-- tags, steps, target_store_id, applicable_store_ids and is_active from
-- the backup.

begin;

create table if not exists ops.curated_backup_20261018 (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.curated_backup_20261018 from public, anon, authenticated;

insert into ops.curated_backup_20261018 (row_data)
select to_jsonb(c) from public.curated_strategies c
 where slug in ('deliveroo-triple-stack', 'nx-one4all-airtime-triple');

update public.curated_strategies
   set title = 'Deliveroo: 10% back with NX',
       description = 'NX Rewards pays at least 10% on Deliveroo orders placed through NX and paid by card. The box below compares it, for your order, with Quidco cashback and a discounted gift card. Pick one route: NX pays nothing if you pay with a gift card.',
       hero_return_pct = 10,
       hero_return_label = '10% with NX, compared live',
       bonus_points = null,
       bonus_points_program = null,
       difficulty = 'easy',
       tags = array['nx', 'deliveroo', 'compare'],
       live_compare = true,
       steps = $json$[
         {"icon": "link", "step": 1, "title": "Join NX Rewards",
          "detail": "A paid membership with a 30-day free trial. NX pays a minimum of 10% at its partner stores.",
          "earn_pct": 10, "platform": "NX Rewards", "is_online": true,
          "action_url": "https://www.nxrewards.com/", "action_label": "Open NX Rewards", "platform_slug": "nx_rewards"},
         {"icon": "shopping-bag", "step": 2, "title": "Open Deliveroo through NX and order on the website",
          "detail": "Search Deliveroo in NX and click through so the cashback tracks. Orders placed in the Deliveroo app do not pay.",
          "platform": "Deliveroo", "is_online": true,
          "action_url": "https://deliveroo.co.uk/", "action_label": "Open Deliveroo", "platform_slug": "deliveroo"},
         {"icon": "credit-card", "step": 3, "title": "Pay by card, never with a gift card",
          "detail": "NX pays nothing when the order is paid with a gift card or e-gift code. A card that earns points or 1% cashback adds its own reward.",
          "earn_pct": 1, "platform": "Credit card", "is_online": true,
          "action_url": null, "action_label": null, "platform_slug": "credit_card"},
         {"icon": "gift-card", "step": 4, "title": "Not using NX? Quidco or a gift card instead",
          "detail": "Quidco cashback, or a discounted Deliveroo gift card from Cheddar, EverUp or JamDoughnut. The box above shows which pays more for your order. One route per order.",
          "platform": "Quidco / gift card", "is_online": true,
          "action_url": null, "action_label": null, "platform_slug": "quidco"}
       ]$json$::jsonb,
       is_active = true
 where slug = 'deliveroo-triple-stack';

update public.curated_strategies
   set title = 'Boots: NX, Avios, Quidco or gift card — compared',
       description = 'Four ways to earn on a Boots order online: NX Rewards (minimum 10%), the British Airways Avios eStore, Quidco cashback and a discounted Boots gift card. The box below works out which pays most for your order. In a Boots shop, Airtime Rewards is the option instead.',
       hero_return_pct = 10,
       hero_return_label = 'up to 10% online, compared live',
       bonus_points = null,
       bonus_points_program = null,
       difficulty = 'easy',
       category = 'beauty',
       tags = array['nx', 'avios', 'quidco', 'boots', 'compare'],
       target_store_id = (select id from public.stores where slug = 'boots'),
       applicable_store_ids = '{}',
       live_compare = true,
       steps = $json$[
         {"icon": "link", "step": 1, "title": "NX Rewards: open Boots through NX and pay by card",
          "detail": "A paid membership (30-day free trial) that pays a minimum of 10%. No cashback on gift-card payments, orders in the Boots app, or excluded products such as Dyson, Apple, Chanel, Dior and infant milk.",
          "earn_pct": 10, "platform": "NX Rewards", "is_online": true,
          "action_url": "https://www.nxrewards.com/", "action_label": "Open NX Rewards", "platform_slug": "nx_rewards"},
         {"icon": "plane", "step": 2, "title": "Or: open Boots from the Avios eStore",
          "detail": "The British Airways Avios eStore pays Avios per £1 spent; the box above shows today's rate. Avios are valued at about 0.92p each.",
          "platform": "British Airways Avios", "is_online": true,
          "action_url": null, "action_label": null, "platform_slug": "avios"},
         {"icon": "banknote", "step": 3, "title": "Or: Quidco cashback",
          "detail": "The rate depends on what you buy; the box above counts the lowest tier and shows the range.",
          "platform": "Quidco", "is_online": true,
          "action_url": "https://quidco.com/raf/14425585/", "action_label": "Open Quidco", "platform_slug": "quidco"},
         {"icon": "gift-card", "step": 4, "title": "Or: a discounted Boots gift card",
          "detail": "From Cheddar, EverUp or JamDoughnut. Do not use it on an NX order: NX would not pay.",
          "platform": "Cheddar / EverUp / JamDoughnut", "is_online": true,
          "action_url": "https://get.cheddar.me/app/CPLTBMB", "action_label": "Open Cheddar", "platform_slug": "cheddar"},
         {"icon": "phone", "step": 5, "title": "In a Boots shop: Airtime Rewards",
          "detail": "Register your card in the Airtime app and pay with it in store. Airtime is for in-store purchases and is never added to an NX order.",
          "platform": "Airtime Rewards", "is_online": false,
          "action_url": "https://airtimerewards.app.link/B3GxIXjhbYb", "action_label": "Open Airtime", "platform_slug": "airtime_rewards"}
       ]$json$::jsonb,
       is_active = true
 where slug = 'nx-one4all-airtime-triple';

do $$
declare
  n int;
begin
  select count(*) into n from public.curated_strategies
   where slug in ('deliveroo-triple-stack', 'nx-one4all-airtime-triple')
     and is_active and live_compare and target_store_id is not null;
  if n <> 2 then
    raise exception 'expected the two comparison strategies on, found %', n;
  end if;
  if exists (select 1 from public.curated_strategies
              where slug in ('deliveroo-easy-combo', 'sainsburys-max-stack', 'deliveroo-advanced-avios')
                and is_active) then
    raise exception 'a strategy that should stay off is on';
  end if;
  if exists (select 1 from public.curated_strategies
              where is_active and (steps::text ilike '%one4all%' or title ilike '%argos%'
                                   or title ~ '(21|16)%')) then
    raise exception 'an active strategy still mentions One4all, Argos or the old 21%%/16%%';
  end if;
end $$;

commit;
