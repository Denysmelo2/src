-- 0023 — only two admin accounts: the owner's and Bárbara's
--
-- On 17/10/2026, 4 of the 5 rows in user_profiles carried role = 'admin'.
-- `is_admin()` (0009) reads that column, and it grants write access to
-- the whole catalogue and SELECT on every user's profile (email, phone,
-- Stripe ids). Owner's decision: keep his account and Bárbara's, demote
-- the rest to 'user'. Nothing is deleted; a demoted account keeps its
-- data and can sign in as a normal user.
--
-- KEEP: 32ae2f46-ff8b-4f69-a563-0bb1fcf3b58f, <uuid-barbara>
--
--   32ae2f46-… is the owner's account (Google sign-in).
--   <uuid-barbara> is a PLACEHOLDER. Two current admin accounts could be
--   Bárbara's and the repo cannot tell which; the owner must pick one
--   and paste its user_id into `keep_ids` below. This migration raises
--   an exception, and changes nothing, while the placeholder is there.
--
-- Rollback (re-promote one account):
--   update public.user_profiles set role = 'admin' where user_id = '<uuid>';

begin;

set local lock_timeout = '8s';

do $$
declare
  keep_ids text[] := array[
    '32ae2f46-ff8b-4f69-a563-0bb1fcf3b58f',  -- owner
    '<uuid-barbara>'                          -- Bárbara: REPLACE before applying
  ];
  keep uuid[];
  n int;
begin
  if exists (
    select 1 from unnest(keep_ids) k
    where k !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    raise exception 'KEEP list still holds a placeholder: %', keep_ids;
  end if;
  keep := keep_ids::uuid[];

  -- Refuse to run unless every kept account exists and is admin now, so
  -- a typo cannot lock the owner out of the admin pages.
  select count(*) into n
  from public.user_profiles
  where user_id = any (keep) and role = 'admin';
  if n <> cardinality(keep) then
    raise exception 'expected % kept admin account(s), found % — check the UUIDs',
      cardinality(keep), n;
  end if;

  update public.user_profiles
     set role = 'user', updated_at = now()
   where role = 'admin'
     and not (user_id = any (keep));
  get diagnostics n = row_count;
  raise notice 'demoted % admin account(s) to user', n;

  select count(*) into n from public.user_profiles where role = 'admin';
  if n <> cardinality(keep) then
    raise exception 'expected exactly % admin(s) after the change, found %',
      cardinality(keep), n;
  end if;
end $$;

commit;
