-- 0020 — a user can insert their own user_preferences row again
--
-- The INSERT policy ANDed `is_admin()` onto the ownership test:
--
--   ... AND (auth.uid() = user_preferences.user_id) AND is_admin()
--
-- so only an admin could insert, and only for themselves. Every sibling
-- policy on this table (SELECT, UPDATE, DELETE) reads
-- `(auth.uid() = user_id) OR is_admin()`. This makes INSERT match them.
-- The anonymous-sign-in guard is kept exactly as it was.
--
-- Nothing in src/ writes this table today (display settings live in
-- localStorage via src/lib/userPrefs.js), so no screen changes; this
-- removes a trap for the first feature that does.

begin;

set local lock_timeout = '8s';

drop policy if exists "Authenticated user and admin can insert user_preferences"
  on public.user_preferences;

create policy "Authenticated user and admin can insert user_preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check (
    (select
      (auth.role() = 'authenticated')
      and (((select (auth.jwt() ->> 'is_anonymous')))::boolean is false)
      and (((select auth.uid()) = user_preferences.user_id) or is_admin())
    )
  );

do $$
declare
  chk text;
begin
  select with_check into chk
  from pg_policies
  where schemaname = 'public' and tablename = 'user_preferences'
    and policyname = 'Authenticated user and admin can insert user_preferences'
    and cmd = 'INSERT';
  if chk is null then
    raise exception 'user_preferences INSERT policy missing';
  end if;
  if chk !~* 'user_id\)\s*OR\s*is_admin\(\)' then
    raise exception 'user_preferences INSERT policy is not owner-OR-admin: %', chk;
  end if;
end $$;

commit;
