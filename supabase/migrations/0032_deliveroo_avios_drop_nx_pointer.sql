-- 0032 — the Deliveroo Avios strategy stops pointing at a paused one
--
-- deliveroo-advanced-avios ("6% + 700 Avios on Deliveroo") ended its
-- description with "Prefer cash? The 21% triple stack uses NX instead."
-- The 21% strategy (deliveroo-triple-stack) is paused since 0029. Owner's
-- decision (docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md, "O que fazer
-- agora", item 1): drop the sentence; it comes back only when the 21%
-- strategy is switched back on.
--
-- Rollback: append " Prefer cash? The 21% triple stack uses NX instead."
-- to the description.

begin;

update public.curated_strategies
   set description = rtrim(replace(description, ' Prefer cash? The 21% triple stack uses NX instead.', ''))
 where slug = 'deliveroo-advanced-avios'
   and description like '%Prefer cash? The 21\% triple stack uses NX instead.%';

do $$
begin
  if exists (select 1 from public.curated_strategies
              where slug = 'deliveroo-advanced-avios' and description ilike '%triple stack%') then
    raise exception 'the pointer to the 21%% strategy is still there';
  end if;
end $$;

commit;
