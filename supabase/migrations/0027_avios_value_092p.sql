-- 0027 — one value for an Avios across the site: £0.0092
--
-- The Compare page's Avios maths (src/lib/aviosMath.js, GBP_PER_AVIOS)
-- uses 0.92p per Avios, the average redemption value from Bárbara's
-- ebook. The route ranking (src/lib/strategies.js, points × the
-- programme's conversion_rate) and the Wallet / Miles pages read
-- miles_programs.conversion_rate, which said 1p. Owner's decision
-- (18/10/2026): use 0.92p everywhere. Avios stay shown in points, not £
-- (Bárbara's July rule); the value only drives the ranking and the
-- Wallet total.
--
-- Both Avios programmes change: British Airways Avios and Qatar
-- Privilege Club (Avios). Other programmes are not touched here; their
-- values are being checked by the Claude Cowork with the owner
-- (docs/PARA_COWORK_TAREFA2_2026-10-18.md).
--
-- Rollback: set conversion_rate back to 0.010 for the two rows.

begin;

update public.miles_programs
   set conversion_rate = 0.0092, updated_at = now()
 where name in ('British Airways Avios', 'Qatar Privilege Club (Avios)')
   and conversion_rate = 0.010;

do $$
declare
  n int;
begin
  select count(*) into n from public.miles_programs
   where name in ('British Airways Avios', 'Qatar Privilege Club (Avios)')
     and conversion_rate = 0.0092;
  if n <> 2 then
    raise exception 'expected 2 Avios programmes at 0.0092, found %', n;
  end if;
end $$;

commit;
