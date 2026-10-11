-- 0009 — is_admin() stops trusting a field the user can write
--
-- The last of the three escalation paths found on 2026-10-09. Migration
-- 0007 closed the other two and deliberately left this one, because
-- fixing it then would have risked locking the operator out: `is_admin()`
-- was the only thing standing between him and his own admin pages, and
-- only one of five accounts carried `user_profiles.role = 'admin'`.
-- That risk is gone — all four admin accounts now carry it — so this
-- can land safely.
--
-- THE HOLE. `is_admin()` read:
--
--   SELECT 1 FROM auth.users
--   WHERE id = auth.uid()
--     AND raw_user_meta_data->>'role' = 'admin'
--
-- `raw_user_meta_data` is the bag `supabase.auth.updateUser({ data })`
-- writes. It is user-controlled by design — that is what it is for. So
-- one client call made this function return true for the caller:
--
--   await supabase.auth.updateUser({ data: { role: 'admin' } })
--
-- And this function is what grants, through the RLS policies keyed on
-- it:
--   * INSERT / UPDATE / DELETE on `cashback_offers` (11,763 rows, the
--     rate catalogue the whole product is built on)
--   * full CRUD on `hot_deals`
--   * SELECT on EVERY row of `user_profiles` — the
--     `profiles_select_self` policy reads
--     `(auth.uid() = user_id) OR is_admin()`, so that is every user's
--     email, phone, Stripe customer and subscription ids
--
-- It now reads `user_profiles.role`, which is server-controlled since
-- 0007 revoked the column grants that let a user write it and emptied
-- the trigger that copied the role out of `user_metadata`.
--
-- `can_access_user_data()` delegates to this function, so it inherits
-- the fix. No RLS policy reads `raw_user_meta_data` directly (checked),
-- so this was the last place it was trusted for authorization.
--
-- NO RECURSION, which is the thing to get right here: the
-- `profiles_select_self` policy ON user_profiles calls `is_admin()`,
-- and `is_admin()` now reads user_profiles. That is a cycle on paper.
-- It does not fire because both the table and the function are owned by
-- `postgres` and `user_profiles` does not have FORCE ROW LEVEL
-- SECURITY, so inside this SECURITY DEFINER body the owner exemption
-- applies and the policy is never evaluated. Verified empirically
-- rather than argued — see the checks below. Were FORCE ROW LEVEL
-- SECURITY ever switched on for `user_profiles`, every profile read in
-- the app would start failing with "infinite recursion detected in
-- policy"; the fix then is to read the table in a helper marked
-- `SECURITY DEFINER` that sets `row_security = off`, not to revert this.
--
-- Also now `language sql` + `STABLE` rather than plpgsql: this is
-- evaluated per row inside RLS policies, and a stable SQL function can
-- be inlined.
--
-- Granting admin, from here and from 0007 onwards, is one deliberate
-- server-side statement:
--   update public.user_profiles set role = 'admin' where user_id = '<uuid>';
--
-- VERIFIED ON PRODUCTION, 2026-10-09, each check inside a transaction
-- that was rolled back:
--
--   1. As an authenticated admin (profile role 'admin'):
--      is_admin() = true, 5 of 5 profiles visible, no recursion error.
--   2. As an authenticated non-admin WHOSE user_metadata WAS SET TO
--      role='admin' for the test — i.e. the actual attack:
--      is_admin() = false, 1 profile visible (own row only), offers
--      visible only through the public read policy. The simulated
--      self-promotion was rolled back and re-verified gone.
--   3. The same non-admin attempting
--      `update cashback_offers set rate = 99 where platform='airtime'`
--      wrote 0 rows.
--   4. The admin attempting the same wrote 43 rows, so the admin path
--      still works.
--
-- Rollback (restores the hole — emergency only):
--   create or replace function public.is_admin()
--   returns boolean language plpgsql security definer
--   set search_path to 'public' as $$
--   BEGIN
--     RETURN EXISTS (
--       SELECT 1 FROM auth.users
--       WHERE id = auth.uid()
--       AND raw_user_meta_data->>'role' = 'admin'
--     );
--   END;
--   $$;

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Repointed 2026-10-09 — see this migration's header.
  --
  -- It used to read auth.users.raw_user_meta_data->>'role', which is the
  -- field `supabase.auth.updateUser({ data })` writes. Any logged-in user
  -- could therefore make this function return true for themselves, and
  -- this function is what grants INSERT/UPDATE/DELETE on cashback_offers,
  -- full CRUD on hot_deals, and — via the `profiles_select_self` policy,
  -- which ORs it — SELECT on every row of user_profiles, i.e. every
  -- user's email, phone and Stripe ids.
  --
  -- `user_profiles.role` is server-controlled since migration 0007
  -- revoked the column grants that let a user write it and neutralised
  -- the trigger that copied the role out of user_metadata.
  --
  -- No recursion, although `profiles_select_self` calls this function
  -- and this function reads that table: both are owned by `postgres` and
  -- user_profiles does not have FORCE ROW LEVEL SECURITY, so the owner
  -- exemption applies inside this SECURITY DEFINER body and the policy
  -- is never evaluated here. Verified by querying the table as a
  -- simulated authenticated user after this was applied.
  select exists (
    select 1
    from public.user_profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$function$;

do $$
declare
  body text;
begin
  -- The executable body must no longer mention the user-writable field.
  -- Comment lines are stripped first, so the explanation of the OLD
  -- behaviour cannot satisfy the test.
  select string_agg(line, E'\n') into body
  from regexp_split_to_table(
         pg_get_functiondef('public.is_admin()'::regprocedure), E'\n') as line
  where line !~ '^\s*--';

  if body ilike '%raw_user_meta_data%' then
    raise exception 'is_admin() still reads raw_user_meta_data';
  end if;
  if body not ilike '%user_profiles%' then
    raise exception 'is_admin() does not read user_profiles';
  end if;

  -- With no JWT, auth.uid() is null and this must be false, not an
  -- error: every public page evaluates policies that call it.
  if public.is_admin() is not false then
    raise exception 'is_admin() should be false with no authenticated user';
  end if;

  -- The recursion guard this relies on. If FORCE ROW LEVEL SECURITY is
  -- ever enabled on user_profiles, the owner exemption stops applying
  -- and every profile read in the app fails. Fail the migration rather
  -- than ship that.
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'user_profiles'
      and c.relforcerowsecurity
  ) then
    raise exception
      'user_profiles has FORCE ROW LEVEL SECURITY: is_admin() reading it would recurse';
  end if;

  -- And there must still be at least one admin, or the admin pages are
  -- unreachable by anyone.
  if (select count(*) from public.user_profiles where role = 'admin') = 0 then
    raise exception 'no account has user_profiles.role = ''admin''; this would lock everyone out';
  end if;
end $$;

commit;
