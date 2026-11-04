-- 0042: step data the live strategy returns need (handover 04/11/2026
-- "estratégias", task 4).
--
-- From this PR the site works out what a curated strategy pays from
-- today's rates (src/lib/curatedReturn.js) instead of the typed
-- hero_return_pct. Two strategies need a field the calculation reads:
--
--   * amazon-optimiser, step 1 (Rakuten): `earn_flat_gbp: 1`. Rakuten
--     pays £1 per Amazon order, a fixed amount, not a %. Without it the
--     Amazon route would show only the 1% card.
--   * amazon-currys-everywish, step 1 (gift card): `store_slug: "currys"`.
--     The gift card bought is a Currys one, so its rate is the best
--     Currys gift-card discount today, not an Amazon one (there is none,
--     and the strategy would be hidden).
--
-- Order: apply this BEFORE the site goes live with the PR. The old site
-- ignores both fields, so applying early changes nothing on screen.
-- Rollback: remove the two keys (`steps #- '{0,earn_flat_gbp}'`,
-- `steps #- '{0,store_slug}'`) on the same rows.

begin;

update public.curated_strategies
set steps = (
  select jsonb_agg(
           case when (e->>'step')::int = 1 then e || '{"earn_flat_gbp": 1}'::jsonb else e end
           order by ord)
  from jsonb_array_elements(steps) with ordinality as t(e, ord)
)
where slug = 'amazon-optimiser';

update public.curated_strategies
set steps = (
  select jsonb_agg(
           case when (e->>'step')::int = 1 then e || '{"store_slug": "currys"}'::jsonb else e end
           order by ord)
  from jsonb_array_elements(steps) with ordinality as t(e, ord)
)
where slug = 'amazon-currys-everywish';

-- Verify: both keys landed on step 1, and the Currys store exists.
do $$
begin
  if not exists (
    select 1 from public.curated_strategies
    where slug = 'amazon-optimiser'
      and (select (e->>'earn_flat_gbp')::numeric from jsonb_array_elements(steps) e where (e->>'step')::int = 1) = 1
  ) then
    raise exception 'amazon-optimiser step 1 has no earn_flat_gbp = 1';
  end if;
  if not exists (
    select 1 from public.curated_strategies
    where slug = 'amazon-currys-everywish'
      and (select e->>'store_slug' from jsonb_array_elements(steps) e where (e->>'step')::int = 1) = 'currys'
  ) then
    raise exception 'amazon-currys-everywish step 1 has no store_slug = currys';
  end if;
  if not exists (select 1 from public.stores where slug = 'currys') then
    raise exception 'no store with slug currys';
  end if;
end $$;

commit;
