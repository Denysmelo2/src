-- 0049 — the Quidco listing number of the day the tiers were read
-- (22/11/2026, the Quidco queue that did not shrink).
--
-- The Quidco listing shows one number per shop. When the robot reads the
-- shop page, `rate` becomes the top of the tiers, which is often not the
-- listing number (Argos: listing 12, top tier 4). The next day the robot
-- compared today's listing with `rate`, saw a change and put the shop in
-- the queue again: on 22/11 the "changed" shops went from 580 to 669 even
-- with 262 pages read.
--
-- cashback_offers.listing_rate: the listing number on the day the tiers
-- (rate_breakdown) were read, or written without tiers. Written only by
-- the Quidco robot (snapgain-scraper, lib/quidcoTiers.js), which compares
-- today's listing with it, not with `rate`. Empty for other platforms and
-- for Quidco rows written before this migration: the robot then falls
-- back to `rate`, as before.
--
-- Not shown on the site; no grant change (the robot uses the service role,
-- and `authenticated`/`anon` read cashback_offers as before).
--
-- Rollback: alter table public.cashback_offers drop column listing_rate;

begin;

alter table public.cashback_offers
  add column if not exists listing_rate numeric;

comment on column public.cashback_offers.listing_rate is
  'Quidco: the listing number on the day the tiers were read (robot, 0049). Compared with the next listing; not shown.';

commit;
