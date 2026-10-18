-- 0029 — pause the four curated strategies that depend on NX Rewards
--
-- NX Rewards offers have been hidden since June: nobody checks them
-- (task 3, the monthly NX job, is not built yet). Four ready-made
-- strategies need an NX step, and one of them ("Up to 15% at Boots &
-- Argos") ranked first on /compare for Boots with no checked date
-- (docs/DECISAO_VALOR_PONTOS_2026-10-18.md, section 3, item 2).
-- Owner's decision (18/10/2026): take them off the site until task 3,
-- nothing deleted.
--
--   * nx-one4all-airtime-triple — Up to 15% at Boots & Argos
--   * deliveroo-triple-stack    — 21% off Deliveroo
--   * deliveroo-easy-combo      — 16% off Deliveroo
--   * sainsburys-max-stack      — 11% + Nectar at Sainsbury's
--
-- Rollback / after task 3: set is_active = true for the four slugs.

begin;

update public.curated_strategies
   set is_active = false
 where slug in ('nx-one4all-airtime-triple', 'deliveroo-triple-stack',
                'deliveroo-easy-combo', 'sainsburys-max-stack');

do $$
begin
  if (select count(*) from public.curated_strategies
       where slug in ('nx-one4all-airtime-triple', 'deliveroo-triple-stack',
                      'deliveroo-easy-combo', 'sainsburys-max-stack')
         and not is_active) <> 4 then
    raise exception 'expected the four NX strategies to be inactive';
  end if;
end $$;

commit;
