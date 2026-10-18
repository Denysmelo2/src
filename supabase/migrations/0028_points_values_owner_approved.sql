-- 0028 — £ value of one point per programme, and four programmes retired
--
-- Owner's decision of 18/10/2026, researched by the Claude Cowork from
-- official sources only (docs/DECISAO_VALOR_PONTOS_2026-10-18.md):
--   * Tesco Clubcard 0.01 (150 points = £1.50 in vouchers) — was 1.00
--   * Morrisons More 0.001 (5,000 points = £5 voucher) — was 0.10
--   * Nectar stays 0.005; both Avios programmes stay 0.0092 (0027)
--   * Airline and card programmes with no published cash value use the
--     Avios yardstick, 0.0092, always as an estimate: Lufthansa Miles &
--     More (was 1.10), TAP Miles & Go (1.00), Emirates Skywards (0.015),
--     Flying Blue (0.012), Etihad Guest, Virgin Points and Amex
--     Membership Rewards (0.010).
-- conversion_rate drives the route ranking and the Wallet / Miles totals;
-- points stay shown in points to customers (Bárbara's July rule).
--
-- Retired (is_active = false, nothing deleted), because they no longer
-- have points with a fixed value:
--   * M&S Sparks — "pounds, not points" since 15/04/2026
--   * My Waitrose — offers and vouchers, no points
--   * Co-op Membership — Member Rewards ended 24/01/2024 (coop.co.uk
--     membership terms, checked 18/10/2026)
--   * Lidl Plus — reward "prices" change weekly, no fixed value
-- On 18/10/2026 no user had any of these four in user_miles_programs;
-- the migration fails if that is no longer true, so nobody's wallet
-- silently loses a programme.
--
-- Rollback: the previous values are in the comments above; set
-- is_active = true for the four slugs.

begin;

do $$
declare
  n int;
begin
  select count(*) into n
  from public.user_miles_programs u
  join public.miles_programs mp on mp.id = u.miles_program_id
  where mp.slug in ('ms-sparks', 'waitrose', 'coop-membership', 'lidl-plus');
  if n <> 0 then
    raise exception '% user(s) hold a programme being retired; decide how to show it first', n;
  end if;
end $$;

update public.miles_programs p
   set conversion_rate = v.rate, updated_at = now()
  from (values
    ('tesco-clubcard',       0.01),
    ('morrisons-more',       0.001),
    ('lufthansa-miles-more', 0.0092),
    ('tap-miles-go',         0.0092),
    ('emirates-skywards',    0.0092),
    ('flying-blue',          0.0092),
    ('etihad-guest',         0.0092),
    ('virgin-points',        0.0092),
    ('amex-mr',              0.0092)
  ) as v(slug, rate)
 where p.slug = v.slug;

update public.miles_programs
   set is_active = false, updated_at = now()
 where slug in ('ms-sparks', 'waitrose', 'coop-membership', 'lidl-plus');

do $$
declare
  bad text;
begin
  select string_agg(slug || '=' || conversion_rate, ', ') into bad
  from public.miles_programs
  where (slug in ('lufthansa-miles-more', 'tap-miles-go', 'emirates-skywards', 'flying-blue',
                  'etihad-guest', 'virgin-points', 'amex-mr', 'ba-avios', 'qatar-avios')
         and conversion_rate <> 0.0092)
     or (slug = 'tesco-clubcard' and conversion_rate <> 0.01)
     or (slug = 'morrisons-more' and conversion_rate <> 0.001)
     or (slug = 'nectar' and conversion_rate <> 0.005);
  if bad is not null then
    raise exception 'unexpected values: %', bad;
  end if;

  if (select count(*) from public.miles_programs
       where slug in ('ms-sparks', 'waitrose', 'coop-membership', 'lidl-plus') and not is_active) <> 4 then
    raise exception 'the four retired programmes are not all inactive';
  end if;

  if exists (select 1 from public.miles_programs where is_active and conversion_rate > 0.05) then
    raise exception 'an active programme is still valued above 5p per point';
  end if;
end $$;

commit;
