-- 0038: switch off the curated strategies that pay with a gift card
-- through the Avios eStore.
--
-- BA's shopping terms (checked 23/10/2026): "Purchase of or using gift
-- card to pay for whole or part of the transaction is not eligible to earn
-- Avios, unless stated otherwise in retailer's purchase conditions." The
-- Avios-branded eStores say the same. These three strategies tell the
-- customer to open the store from the Avios eStore and pay with a
-- discounted gift card, so the Avios they promise would not be paid:
--
--   sainsburys-easy-stack     "5% + Avios + Nectar at Sainsbury's (gift card route)"
--   uber-eats-advanced-avios  "5.5% + 200 Avios on Uber Eats (Avios eStore route)"
--   treatwell-advanced-avios  "9% + 300 Avios on salons & barbershops"
--
-- Switched off, nothing deleted; a copy goes to ops first. The gift card
-- and the Avios eStore remain separate routes on /compare (the route
-- engine no longer stacks them, src/lib/strategies.js). uber-easy-combo
-- is left on: it uses Uber's own Avios account link, not the eStore.

create table if not exists ops.curated_backup_20261023 (
  row_data jsonb not null,
  saved_at timestamptz not null default now()
);
revoke all on ops.curated_backup_20261023 from public, anon, authenticated;

insert into ops.curated_backup_20261023 (row_data)
select to_jsonb(c) from public.curated_strategies c
 where slug in ('sainsburys-easy-stack', 'uber-eats-advanced-avios', 'treatwell-advanced-avios');

update public.curated_strategies
   set is_active = false
 where slug in ('sainsburys-easy-stack', 'uber-eats-advanced-avios', 'treatwell-advanced-avios');

do $$
begin
  if exists (
    select 1 from public.curated_strategies
     where is_active
       and slug in ('sainsburys-easy-stack', 'uber-eats-advanced-avios', 'treatwell-advanced-avios')
  ) then
    raise exception 'a gift card + Avios eStore strategy is still on';
  end if;
  if (select count(*) from ops.curated_backup_20261023
       where row_data->>'slug' in ('sainsburys-easy-stack', 'uber-eats-advanced-avios', 'treatwell-advanced-avios')) < 3 then
    raise exception 'backup incomplete';
  end if;
end $$;
