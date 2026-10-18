-- 0033 — curated_strategies.live_compare
--
-- When true, a curated strategy card shows the live comparison for its
-- target_store_id (src/components/LiveCompare.jsx): the single routes that
-- exist today, the sum for each and the best one on top (owner's afternoon
-- decision of 18/10/2026, docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md).
-- Applied before the app reads the column; 0034 switches the strategies on.
-- Rollback: alter table public.curated_strategies drop column live_compare.

begin;

alter table public.curated_strategies
  add column if not exists live_compare boolean not null default false;

commit;
