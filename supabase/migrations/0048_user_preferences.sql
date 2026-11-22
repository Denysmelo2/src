-- 0048 — preferences saved to the account, not to one browser (owner's
-- tests 21/11/2026, C1; docs/HANDOVER_CLAUDE_CODE_2026-11-21-testes-do-dono.md).
--
-- src/lib/userPrefs.js always tried to write user_profiles.preferences,
-- but the column never existed, so everything on /profile and /settings
-- (preferred name, phone, location, language, display and accessibility)
-- stayed in that browser's localStorage: filled in on the phone, missing
-- on the PC.
--
-- The user may write this ONE column on their own row, like is_student
-- (0045) and onboarding_done (0007): the row policies
-- user_profiles_owner_insert / _update already limit it to
-- auth.uid() = user_id. role, plan, subscription_status, stripe_* and the
-- trial dates stay unwritable by `authenticated`.
--
-- On the first load after this migration the site uploads what that
-- browser had in localStorage, once, when the column is still '{}'.
--
-- Rollback: alter table public.user_profiles drop column preferences;

begin;

alter table public.user_profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

grant insert (preferences), update (preferences) on public.user_profiles to authenticated;

comment on column public.user_profiles.preferences is
  'The user''s own settings from /profile and /settings (src/lib/userPrefs.js), 0048.';

commit;
