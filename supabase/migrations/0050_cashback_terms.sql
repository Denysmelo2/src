-- 0050 — the shop's "Terms & Exclusions" on a cashback offer (Rakuten,
-- handover docs/HANDOVER_CLAUDE_CODE_2026-11-23-rakuten.md, item 5).
--
-- Rakuten's shop pages carry a "Terms & Exclusions" block, e.g. on Currys:
--   "Cashback is not available on gift cards or adjustments."
--   "Cashback is not available when using vouchers or discount codes that
--    are not from Rakuten UK."
-- The Rakuten robot (snapgain-scraper) writes that text here; the site
-- shows it under "See terms" on the route. `conditions` stays what it is
-- ('Up to', 'Pump Up …'), it is read by the ranking.
--
-- Written by the robots with the service role; read by everyone like the
-- other columns (table grants, no change). Empty for other platforms.
--
-- Rollback: alter table public.cashback_offers drop column terms;

begin;

alter table public.cashback_offers
  add column if not exists terms text;

comment on column public.cashback_offers.terms is
  'The shop''s terms and exclusions on the platform (Rakuten robot, 0050); shown under "See terms".';

commit;
