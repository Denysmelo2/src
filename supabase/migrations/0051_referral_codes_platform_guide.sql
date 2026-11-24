-- 0051 — referral codes in one place, and the Platform guide brought up
-- to date (handover docs/HANDOVER_CLAUDE_CODE_2026-11-24-testes-reais.md,
-- tasks 2 and 5).
--
-- 1. Referral codes (task 2). Several apps give the sign-up bonus only
--    when the code is TYPED (Ribbon DENYD11D, NX REFXYH9R, Curve
--    NVOGMMLD: curve.com drops what follows the "#"), and the site showed
--    none. The `platform` row is now the one source for links and codes
--    (src/lib/affiliateLinks.js getReferral; the file is only the
--    fallback):
--      referral_code    the code, e.g. 'REFXYH9R'
--      referral_reward  what the person gets, in English, e.g. '£25 after
--                       your first rent payment'
--      referral_note    where to type it, e.g. 'Type it in the app when
--                       you create your account.'
--    All empty after this migration: the Cowork fills what is confirmed.
--    Read by everyone like the other platform columns (table grants).
--
-- 2. Platform guide (task 5), table platforms_explained:
--    * NX Rewards is shown (it was inactive, so "Start here" listed only
--      JamDoughnut, Quidco and Avios), with the 10% minimum and without
--      One4all (never on SnapGain);
--    * Cheddar is hidden while its robot is off (since 21/11/2026);
--    * EverUp loses "Smaller network than NX / JamDoughnut" (337 brands
--      against JamDoughnut's 282 on 24/11/2026);
--    * the guide's own signup links that the `platform` table now gives
--      are cleared, so a link lives in one place: Rakuten's was the
--      broken /r/ one, EverUp's and Airtime's disagreed with the table.
--
-- Rollback: alter table public.platform drop column referral_code,
--   drop column referral_reward, drop column referral_note;
--   the guide rows: see ops.fix_backup_20261124_platforms_explained.

begin;

alter table public.platform
  add column if not exists referral_code text,
  add column if not exists referral_reward text,
  add column if not exists referral_note text;

comment on column public.platform.referral_code is
  'Referral code to type at sign-up (shown with a Copy button under "Open"), 0051.';
comment on column public.platform.referral_reward is
  'What the person gets with the code, in English, e.g. "£25 after your first rent payment", 0051.';
comment on column public.platform.referral_note is
  'Where to type the code, in English, 0051.';

-- A copy of the guide rows before the changes below.
create schema if not exists ops;
create table if not exists ops.fix_backup_20261124_platforms_explained as
  select * from public.platforms_explained;

update public.platforms_explained
   set is_active = true,
       typical_rate_label = '10% minimum at the shops it covers',
       one_liner = 'SnapGain''s main platform — at least 10% back at the shops it covers'
 where slug = 'nx_rewards';

update public.platforms_explained
   set is_active = false
 where slug = 'cheddar';

update public.platforms_explained
   set cons = array_remove(cons, 'Smaller network than NX / JamDoughnut')
 where slug = 'everup';

update public.platforms_explained
   set signup_url = null
 where slug in ('rakuten', 'everup', 'airtime_rewards', 'jamdoughnut', 'quidco', 'cheddar');

commit;
