-- 0004 — retire the One4all-via-NX and Sainsbury's-gift-card-via-NX chains
--
-- Two things stopped working (Sept 2026):
--   1. NX Rewards no longer sells the One4all gift card. Every strategy
--      whose first step was "buy One4all at 20% off on NX" has lost its
--      opening layer, and nothing sells One4all at a discount, so those
--      rows are rewritten around the discounted gift card of the store
--      itself (EverUp / Cheddar / JamDoughnut, 3–8% off) plus the card
--      you pay with, plus the Avios eStore where the store is in it.
--   2. NX Rewards no longer pays cashback on Sainsbury's orders settled
--      with a gift card. The Sainsbury's rows now keep the two routes
--      apart: "easy" = gift card + Avios eStore (gift-card payment does
--      not affect eStore Avios), "max" = NX + points card (no gift card).
--
-- Rows are rewritten in place (same id / slug) so saved references keep
-- resolving. Every NX step also gets the right URL: NX Rewards is
-- nxrewards.com (Webloyalty), not nationalexpress.com (the coach firm).
-- No referral code exists for NX.

begin;

-- ── 1. Starter / trial card: discounted gift cards ───────────────────
update public.curated_strategies set
  title = 'Discounted gift cards: 3–8% off, instantly',
  description = 'The starter stack. Before you pay any UK retailer, check EverUp, Cheddar and JamDoughnut for that store''s gift card — one of them is usually 3–8% off. Buy it with a points card, spend it like cash. No tracking, no waiting.',
  hero_return_pct = 6,
  hero_return_label = '3–8% off + card points',
  bonus_points = null,
  bonus_points_program = null,
  difficulty = 'easy',
  category = 'gift-card',
  tags = array['gift-card','everup','cheddar','jamdoughnut','trial-free','starter'],
  target_store_id = null,
  steps = '[
    {"step":1,"icon":"gift-card","title":"Compare the three gift-card apps for your store","detail":"Open EverUp, Cheddar and JamDoughnut and search the retailer. Rates move weekly — buy from whichever is highest today (e.g. Currys 6.5% on Cheddar, Treatwell 7.8% on EverUp, Sainsbury''s 3.9% on EverUp).","earn_pct":6,"platform":"EverUp / Cheddar / JamDoughnut","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"},
    {"step":2,"icon":"credit-card","title":"Pay for the gift card with a points / cashback card","detail":"Amex, Barclaycard Avios or any 1% cashback card — the gift card purchase itself earns.","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"shopping-bag","title":"Spend the gift card in-store or online","detail":"Show the barcode at the till or paste the code at checkout. Most apps let you buy the exact amount of your basket, so nothing sits unused.","platform":null,"platform_slug":null,"is_online":true,"action_url":null,"action_label":null}
  ]'::jsonb,
  updated_at = now()
where slug = 'nx-one4all-basic';

-- ── 2. Boots / Argos: Airtime + NX or gift card ──────────────────────
update public.curated_strategies set
  title = 'Up to 15% at Boots & Argos: Airtime + NX or gift card',
  description = 'Register every points or cashback card you own in Airtime Rewards, then pick the route per shop: online through NX Rewards (10%) paying with that card, or in-store where Airtime credits up to 4% to your phone bill on top of the card''s 1%. Check the Airtime app first — some partners are in-store only.',
  hero_return_pct = 15,
  hero_return_label = 'up to 15% (NX 10% + card 1% + Airtime 4%)',
  difficulty = 'medium',
  tags = array['nx','airtime','boots','argos','stack'],
  steps = '[
    {"step":1,"icon":"phone","title":"Register all your points / cashback cards in Airtime Rewards","detail":"Airtime tracks the card, not the shop — so it only pays when you pay with a registered card, never with a gift card. Check each partner''s terms in the app before you shop (Boots and Argos work in-store).","earn_pct":4,"platform":"Airtime Rewards","platform_slug":"airtime_rewards","is_online":true,"action_url":"https://airtimerewards.app.link/B3GxIXjhbYb","action_label":"Open Airtime"},
    {"step":2,"icon":"link","title":"Online: click through NX Rewards and pay with the registered card","detail":"Boots is in the NX network — 10% minimum on the order. Argos is not, so for Argos go straight to step 3.","earn_pct":10,"platform":"NX Rewards","platform_slug":"nx_rewards","is_online":true,"action_url":"https://www.nxrewards.com/","action_label":"Open NX Rewards"},
    {"step":3,"icon":"credit-card","title":"In-store: pay with the registered points card","detail":"The card earns its usual 1%; Airtime adds up to 4% to your mobile bill automatically a few days later.","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":false,"action_url":null,"action_label":null},
    {"step":4,"icon":"gift-card","title":"Alternative: discounted gift card (skips Airtime)","detail":"Argos 4.8% on EverUp, Boots 4.5% on Cheddar. Cheaper up front, but a gift-card payment is invisible to Airtime — use it when the partner is online-only or Airtime isn''t tracking.","platform":"EverUp / Cheddar","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"}
  ]'::jsonb,
  updated_at = now()
where slug = 'nx-one4all-airtime-triple';

-- ── 3. Deliveroo — Avios eStore route ────────────────────────────────
update public.curated_strategies set
  title = '6% + 700 Avios on Deliveroo (Avios eStore stack)',
  description = 'The Avios route for Deliveroo. Buy a discounted Deliveroo gift card (EverUp ~5%), pay with a points card, then open Deliveroo through the British Airways Avios eStore — 7 Avios per £1 — and pay with the gift card. Prefer cash? The 21% triple stack uses NX instead.',
  hero_return_pct = 6,
  hero_return_label = '6% + 700 Avios per £100',
  tags = array['everup','jamdoughnut','avios','deliveroo','advanced'],
  steps = '[
    {"step":1,"icon":"gift-card","title":"Buy a Deliveroo gift card on EverUp or JamDoughnut","detail":"Check both — EverUp is usually ~5%, JamDoughnut 3–10% on boost days.","earn_pct":5,"platform":"EverUp","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"},
    {"step":2,"icon":"credit-card","title":"Pay for it with a points / cashback credit card","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"plane","title":"Open Deliveroo from the Avios eStore","detail":"Log in to your BA account, find Deliveroo in the eStore, click the tracking link before ordering. Earns 7 Avios per £1.","earn_points":700,"earn_points_program":"British Airways Avios","platform":"British Airways Avios","platform_slug":"avios","is_online":true,"action_url":"https://avios.mention-me.com/m/ol/yv2wt-denys-ferreira-goncalves-de-melo","action_label":"Open Avios"},
    {"step":4,"icon":"shopping-bag","title":"Pay with the gift card and complete the order","detail":"Gift-card payments still earn the eStore Avios.","platform":"Deliveroo","platform_slug":"deliveroo","is_online":true,"action_url":"https://deliveroo.co.uk/","action_label":"Open Deliveroo"}
  ]'::jsonb,
  updated_at = now()
where slug = 'deliveroo-advanced-avios';

-- ── 4. Uber Eats — Avios eStore route ────────────────────────────────
update public.curated_strategies set
  title = '5.5% + 200 Avios on Uber Eats (Avios eStore route)',
  description = 'Buy an Uber Eats gift card at ~4.5% off (Cheddar), pay with a points card, open Uber Eats through the Avios eStore for 2 Avios per £1, then pay with the gift card.',
  hero_return_pct = 5.5,
  hero_return_label = '5.5% + 200 Avios per £100',
  tags = array['cheddar','everup','avios','uber-eats','advanced'],
  steps = '[
    {"step":1,"icon":"gift-card","title":"Buy an Uber Eats gift card on Cheddar or EverUp","detail":"Cheddar ~4.5%, EverUp ~4%. Uber (rides) cards are separate — check which one your order needs.","earn_pct":4.5,"platform":"Cheddar","platform_slug":"cheddar","is_online":true,"action_url":"https://get.cheddar.me/app/CPLTBMB","action_label":"Open Cheddar"},
    {"step":2,"icon":"credit-card","title":"Pay with a points / cashback credit card","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"plane","title":"Open Uber Eats from the Avios eStore","detail":"Log in to BA Avios, find Uber Eats and click through before ordering. Earns 2 Avios per £1.","earn_points":200,"earn_points_program":"British Airways Avios","platform":"British Airways Avios","platform_slug":"avios","is_online":true,"action_url":"https://avios.mention-me.com/m/ol/yv2wt-denys-ferreira-goncalves-de-melo","action_label":"Open Avios"},
    {"step":4,"icon":"shopping-bag","title":"Add the gift card in the Uber app and order","platform":"Uber Eats","platform_slug":"uber_eats","is_online":true,"action_url":"https://www.ubereats.com/gb","action_label":"Open Uber Eats"}
  ]'::jsonb,
  updated_at = now()
where slug = 'uber-eats-advanced-avios';

-- ── 5. Treatwell easy ────────────────────────────────────────────────
update public.curated_strategies set
  title = '9% off Treatwell bookings',
  description = 'Quick beauty stack — Treatwell gift card at ~8% off on EverUp (7% on JamDoughnut) plus 1% on the card you pay with. Every haircut, manicure or spa booking is ~9% cheaper.',
  hero_return_pct = 9,
  hero_return_label = '9% cashback',
  tags = array['everup','jamdoughnut','treatwell','beauty','quick-win'],
  steps = '[
    {"step":1,"icon":"gift-card","title":"Buy a Treatwell gift card on EverUp or JamDoughnut","detail":"EverUp ~7.8%, JamDoughnut ~7% — pick the higher one today.","earn_pct":8,"platform":"EverUp","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"},
    {"step":2,"icon":"credit-card","title":"Pay with a 1% cashback / points card","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"wallet","title":"Redeem the gift card in your Treatwell account","detail":"Treatwell → Account → Gift cards → enter the code. The balance is applied at checkout.","platform":"Treatwell","platform_slug":"treatwell","is_online":true,"action_url":"https://trea.tw/xJuh9D","action_label":"Open Treatwell"},
    {"step":4,"icon":"calendar","title":"Book & pay","detail":"Search a salon near you and confirm the booking with the balance. Earn Treatwell loyalty points for next-visit discounts.","platform":null,"platform_slug":null,"is_online":true}
  ]'::jsonb,
  updated_at = now()
where slug = 'treatwell-easy-stack';

-- ── 6. Treatwell advanced (Avios) ────────────────────────────────────
update public.curated_strategies set
  title = '9% + 300 Avios on salons & barbershops',
  description = 'Combine the Treatwell gift card (~8%), card (1%) and the Avios eStore route into Treatwell — 3 Avios per £1 on every haircut, manicure or spa booking.',
  hero_return_pct = 9,
  hero_return_label = '9% + 300 Avios per £100',
  tags = array['everup','avios','treatwell','salon','grooming'],
  steps = '[
    {"step":1,"icon":"gift-card","title":"Buy a Treatwell gift card on EverUp or JamDoughnut","detail":"EverUp ~7.8%, JamDoughnut ~7%.","earn_pct":8,"platform":"EverUp","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"},
    {"step":2,"icon":"credit-card","title":"Pay with a 1% cashback / points card","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"plane","title":"Open Treatwell from the Avios eStore","detail":"Log in to BA Avios, find Treatwell, click the tracking link before booking. Earns 3 Avios per £1.","earn_points":300,"earn_points_program":"British Airways Avios","platform":"British Airways Avios","platform_slug":"avios","is_online":true,"action_url":"https://avios.mention-me.com/m/ol/yv2wt-denys-ferreira-goncalves-de-melo","action_label":"Open Avios"},
    {"step":4,"icon":"calendar","title":"Book your service and pay with the gift-card balance","detail":"Redeem the code under Account → Gift cards first, then confirm the booking.","platform":"Treatwell","platform_slug":"treatwell","is_online":true,"action_url":"https://trea.tw/xJuh9D","action_label":"Open Treatwell"}
  ]'::jsonb,
  updated_at = now()
where slug = 'treatwell-advanced-avios';

-- ── 7. Sainsbury's easy — gift card + Avios eStore ───────────────────
update public.curated_strategies set
  title = '5% + Avios + Nectar at Sainsbury''s (gift card route)',
  description = 'Online or in-store. Buy a Sainsbury''s gift card at up to 3.9% off (EverUp — check Cheddar and JamDoughnut too), pay with a points card, open Sainsbury''s from the Avios eStore for 1 Avios per £1, then pay with the gift card and scan Nectar. Gift-card payments still earn the eStore Avios.',
  hero_return_pct = 5,
  hero_return_label = '5% + 100 Avios + 100 Nectar',
  bonus_points = 162,
  bonus_points_program = 'British Airways Avios',
  tags = array['everup','cheddar','jamdoughnut','avios','sainsburys','nectar'],
  steps = '[
    {"step":1,"icon":"gift-card","title":"Buy a Sainsbury''s gift card on EverUp, Cheddar or JamDoughnut","detail":"EverUp ~3.9%, Cheddar ~3.5%, JamDoughnut ~3%. Buy the amount you plan to spend.","earn_pct":4,"platform":"EverUp","platform_slug":"everup","is_online":true,"action_url":"https://everup.onelink.me/9lgD/t8t7luj6","action_label":"Open EverUp"},
    {"step":2,"icon":"credit-card","title":"Pay with a 1% cashback / points credit card","detail":"Any Amex / Barclaycard cashback works — 100 points on a £100 gift card.","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"plane","title":"Open Sainsbury''s from the Avios eStore","detail":"Log in to BA Avios, find Sainsbury''s, click through before you shop. 1 Avios per £1 — £100 = 100 Avios, and paying with a gift card does not affect it.","earn_points":100,"earn_points_program":"British Airways Avios","platform":"British Airways Avios","platform_slug":"avios","is_online":true,"action_url":"https://avios.mention-me.com/m/ol/yv2wt-denys-ferreira-goncalves-de-melo","action_label":"Open Avios eStore"},
    {"step":4,"icon":"shopping-bag","title":"Pay with the gift card + scan Nectar","detail":"Gift card at checkout, Nectar card scanned: 100 Nectar per £100 → 62 Avios if you convert (400 Nectar = 250 Avios).","earn_points":62,"earn_points_program":"British Airways Avios","platform":"Nectar","platform_slug":"nectar","is_online":true,"action_url":null,"action_label":null}
  ]'::jsonb,
  updated_at = now()
where slug = 'sainsburys-easy-stack';

-- ── 8. Sainsbury's max — NX + points card (no gift card) ─────────────
update public.curated_strategies set
  title = '11% + Nectar at Sainsbury''s via NX + points card',
  description = 'The cash-first route. Click through NX Rewards to Sainsbury''s (10% minimum), pay with a points card (Amex: 1 point per £1), scan Nectar. Pay by card — NX no longer pays cashback on Sainsbury''s orders settled with a gift card.',
  hero_return_pct = 11,
  hero_return_label = '11% + 100 Nectar (→ 62 Avios)',
  bonus_points = 62,
  bonus_points_program = 'British Airways Avios',
  difficulty = 'medium',
  tags = array['nx','sainsburys','nectar','avios','amex'],
  steps = '[
    {"step":1,"icon":"link","title":"Click through NX Rewards to Sainsbury''s","detail":"Open NX Rewards, search Sainsbury''s, click the link so the 10% tracks. Order in the same browser session.","earn_pct":10,"platform":"NX Rewards","platform_slug":"nx_rewards","is_online":true,"action_url":"https://www.nxrewards.com/","action_label":"Open NX Rewards","store_slug":"sainsburys"},
    {"step":2,"icon":"credit-card","title":"Pay with a points / cashback credit card — not a gift card","detail":"Amex earns 1 point per £1 (100 points on £100). A gift-card payment voids the NX cashback here, so keep the two Sainsbury''s routes separate.","earn_pct":1,"platform":"Credit card","platform_slug":"credit_card","is_online":true,"action_url":null,"action_label":null},
    {"step":3,"icon":"plane","title":"Scan Nectar at checkout","detail":"100 Nectar per £100. Convert 400 Nectar → 250 Avios in the Nectar app when you want to fly.","earn_points":62,"earn_points_program":"British Airways Avios","platform":"Nectar","platform_slug":"nectar","is_online":true,"action_url":null,"action_label":null}
  ]'::jsonb,
  updated_at = now()
where slug = 'sainsburys-max-stack';

-- ── 9. Ribbon: the redeem step pointed at One4all-via-NX ─────────────
update public.curated_strategies set
  steps = jsonb_set(
    steps, '{3,detail}',
    to_jsonb('Convert points to brand cashback, or use them to buy discounted gift cards (EverUp, Cheddar, JamDoughnut) for compounding returns.'::text)
  ),
  updated_at = now()
where slug = 'ribbon-rent-cashback'
  and steps->3->>'title' = 'Redeem your Ribbon points monthly';

-- ── 9b. Uber easy combo: description contrasted itself with One4all ──
update public.curated_strategies set
  description = replace(description, 'No One4all juggling — just buy', 'The simple route — buy'),
  updated_at = now()
where slug = 'uber-easy-combo' and description like 'No One4all juggling%';

-- ── 9c. Card step: name the 1-point-per-£1 cards, not just "1% cashback"
-- Revolut Metal (RevPoints → Avios 1:1), Barclaycard Avios and Amex all
-- earn a point per £1; a 1% cashback card is the alternative, not the
-- only option. Applied to every credit_card step in every strategy.
update public.curated_strategies s set
  steps = (
    select jsonb_agg(
      case
        when st->>'platform_slug' = 'credit_card' then
          st
          || jsonb_build_object('title',
               case
                 when st->>'title' ilike '%not a gift card%' then 'Pay with a card that earns points or cashback — not a gift card'
                 when st->>'title' ilike 'in-store:%' then 'In-store: pay with a registered card that earns points or cashback'
                 else 'Pay with a card that earns points or cashback'
               end)
          || jsonb_build_object('detail',
               case
                 when st->>'title' ilike '%not a gift card%' then
                   '1 point per £1 — Revolut Metal (RevPoints → Avios 1:1), Barclaycard Avios or Amex — or any 1% cashback card: 100 points or £1 on a £100 shop. A gift-card payment voids the NX cashback here, so keep the two Sainsbury''s routes separate.'
                 when st->>'title' ilike 'in-store:%' then
                   'Any registered card that earns 1 point per £1 (Revolut Metal, Barclaycard Avios, Amex) or 1% cashback. Airtime adds up to 4% to your mobile bill automatically a few days later.'
                 when s.slug = 'amazon-optimiser' then
                   '1 point per £1 — Revolut Metal, Barclaycard Avios or Amex Membership Rewards — or a 1% cashback card such as Uphold Mastercard. Stacks on top of Rakuten.'
                 else
                   '1 point per £1 — Revolut Metal (RevPoints → Avios 1:1), Barclaycard Avios or Amex — or any 1% cashback card. On £100 that is 100 points or £1, on top of everything else in the stack.'
               end)
        else st
      end
      order by (st->>'step')::int
    )
    from jsonb_array_elements(s.steps) st
  ),
  updated_at = now()
where s.steps::text like '%"credit_card"%';

-- The double-cashback step 3 was "Place your order" — keep that framing
-- and its receipts advice.
update public.curated_strategies set
  steps = jsonb_set(jsonb_set(steps, '{2,title}', '"Place your order, paying with a card that earns points or cashback"'::jsonb),
                    '{2,detail}', '"1 point per £1 — Revolut Metal, Barclaycard Avios or Amex — or any 1% cashback card. Keep all receipts until both portals confirm."'::jsonb),
  updated_at = now()
where slug = 'double-cashback-trick' and steps->2->>'platform_slug' = 'credit_card';

-- ── 10. NX Rewards URL: nxrewards.com, not the coach company ─────────
update public.curated_strategies s set
  steps = (
    select jsonb_agg(
      case
        when st->>'platform_slug' = 'nx_rewards'
          then jsonb_set(st, '{action_url}', '"https://www.nxrewards.com/"'::jsonb)
        else st
      end
      order by (st->>'step')::int
    )
    from jsonb_array_elements(s.steps) st
  ),
  updated_at = now()
where s.steps::text like '%nationalexpress.com%';

commit;
