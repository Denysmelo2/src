-- 0036 — Sainsbury's comes back as "NX or Avios", compared live
--
-- Owner's afternoon decision of 18/10/2026
-- (docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md, Sainsbury's): compare NX
-- (10%, pay by card) with the Avios eStore fixed bonus per order (0035:
-- 700 new on the website, 800 new in the app, 100 existing, £50 minimum).
-- The card asks whether the customer has bought through Avios before and
-- whether they order on the website or the app, then shows the best one.
-- Nectar comes on top of both. Owner's call: done with task 3.
--
-- Backup of the row before the change: ops.curated_backup_20261018 (0034).
-- Rollback: restore the row from the backup.

begin;

create table if not exists ops.curated_backup_20261018 (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.curated_backup_20261018 from public, anon, authenticated;

insert into ops.curated_backup_20261018 (row_data)
select to_jsonb(c) from public.curated_strategies c where slug = 'sainsburys-max-stack';

update public.curated_strategies
   set title = 'Sainsbury''s: NX or Avios — which pays more',
       description = 'Two ways to earn on a Sainsbury''s online shop: NX Rewards (minimum 10%, pay by card) or the British Airways Avios eStore, which pays a fixed bonus per order (more on your first order, nothing under £50). The box below asks two questions and shows which pays more for your order. Scan Nectar either way.',
       hero_return_pct = 10,
       hero_return_label = 'NX 10% or an Avios bonus, compared live',
       bonus_points = null,
       bonus_points_program = null,
       difficulty = 'easy',
       tags = array['nx', 'avios', 'nectar', 'sainsburys', 'compare'],
       target_store_id = (select id from public.stores where slug = 'sainsburys'),
       live_compare = true,
       steps = $json$[
         {"icon": "link", "step": 1, "title": "NX Rewards: open Sainsbury's through NX and pay by card",
          "detail": "A paid membership (30-day free trial) that pays a minimum of 10%. NX pays nothing on an order paid with a gift card or placed in the Sainsbury's app.",
          "earn_pct": 10, "platform": "NX Rewards", "is_online": true,
          "action_url": "https://www.nxrewards.com/", "action_label": "Open NX Rewards", "platform_slug": "nx_rewards"},
         {"icon": "plane", "step": 2, "title": "Or: open Sainsbury's from the Avios eStore",
          "detail": "A fixed Avios bonus per order with a £50 minimum: more on your first order, a little more in the app. The box above uses today's figures; Avios are valued at about 0.92p each.",
          "platform": "British Airways Avios", "is_online": true,
          "action_url": null, "action_label": null, "platform_slug": "avios"},
         {"icon": "star", "step": 3, "title": "Scan Nectar either way",
          "detail": "Nectar points come on top of both routes.",
          "platform": "Nectar", "is_online": true,
          "action_url": null, "action_label": null, "platform_slug": "nectar"}
       ]$json$::jsonb,
       is_active = true
 where slug = 'sainsburys-max-stack';

do $$
begin
  if not exists (select 1 from public.curated_strategies c
                   join public.stores s on s.id = c.target_store_id
                  where c.slug = 'sainsburys-max-stack' and c.is_active and c.live_compare
                    and s.slug = 'sainsburys') then
    raise exception 'Sainsbury''s comparison strategy is not on';
  end if;
  if (select count(*) from public.point_bonus_offers b join public.stores s on s.id = b.store_id
       where s.slug = 'sainsburys' and b.is_active) < 1 then
    raise exception 'no Avios bonus for Sainsbury''s: apply 0035 first';
  end if;
end $$;

commit;
