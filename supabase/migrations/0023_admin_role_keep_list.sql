-- 0023 — exactly three admin accounts, chosen by the owner
--
-- On 17/10/2026, 4 of the 5 rows in user_profiles carried role = 'admin'.
-- `is_admin()` (0009) reads that column, and it grants write access to
-- the whole catalogue and SELECT on every user's profile (email, phone,
-- Stripe ids). Owner's decision (17/10/2026): these three accounts are
-- admin, every other account is 'user'.
--
-- KEEP: 32ae2f46-ff8b-4f69-a563-0bb1fcf3b58f, f45ccecc-5254-47de-bd9e-9067976a99c3, 232c8e15-64bb-4210-baa4-df042c238967
--
--   32ae2f46-… the owner's account (Google sign-in)          admin → admin
--   f45ccecc-…                                               admin → admin
--   232c8e15-…                                               user  → admin
--   everyone else who is admin today (15606075-…, 879a43ce-…) → user
--
-- Nothing is deleted; a demoted account keeps its data and can sign in as
-- a normal user. The migration refuses to run unless all three accounts
-- exist in auth.users and have a user_profiles row, and fails unless
-- exactly these three are admin afterwards.
--
-- Rollback (re-promote / demote one account):
--   update public.user_profiles set role = 'admin' where user_id = '<uuid>';
--   update public.user_profiles set role = 'user'  where user_id = '<uuid>';

begin;

set local lock_timeout = '8s';

do $$
declare
  keep uuid[] := array[
    '32ae2f46-ff8b-4f69-a563-0bb1fcf3b58f',  -- owner
    'f45ccecc-5254-47de-bd9e-9067976a99c3',
    '232c8e15-64bb-4210-baa4-df042c238967'
  ]::uuid[];
  n int;
begin
  select count(*) into n from auth.users where id = any (keep);
  if n <> cardinality(keep) then
    raise exception 'expected % kept account(s) in auth.users, found %', cardinality(keep), n;
  end if;

  select count(*) into n from public.user_profiles where user_id = any (keep);
  if n <> cardinality(keep) then
    raise exception 'expected % kept account(s) in user_profiles, found %', cardinality(keep), n;
  end if;

  update public.user_profiles
     set role = 'admin', updated_at = now()
   where user_id = any (keep)
     and role is distinct from 'admin';
  get diagnostics n = row_count;
  raise notice 'promoted % account(s) to admin', n;

  update public.user_profiles
     set role = 'user', updated_at = now()
   where role = 'admin'
     and not (user_id = any (keep));
  get diagnostics n = row_count;
  raise notice 'demoted % admin account(s) to user', n;

  select count(*) into n from public.user_profiles where role = 'admin';
  if n <> cardinality(keep) then
    raise exception 'expected exactly % admin(s) afterwards, found %', cardinality(keep), n;
  end if;

  select count(*) into n from public.user_profiles where role = 'admin' and user_id = any (keep);
  if n <> cardinality(keep) then
    raise exception 'a kept account is not admin afterwards';
  end if;
end $$;

commit;
