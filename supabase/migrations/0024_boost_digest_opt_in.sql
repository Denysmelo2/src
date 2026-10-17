-- 0024 — the boost digest is opt-in in the database too
--
-- Package C (PR #123) made the daily boost e-mail opt-in in the Settings
-- UI and in daily-boost-digest. The database still treated "no row" as
-- "on" in two places (checked 17/10/2026):
--   * user_notification_prefs.boost_email_enabled DEFAULT true
--   * list_digest_recipients() (0015): LEFT JOIN ... and
--     coalesce(p.boost_email_enabled, true), i.e. every user with an
--     e-mail and no prefs row was a recipient.
-- From here a user receives the digest only if they have a row with
-- boost_email_enabled = true, i.e. they switched it on.
--
-- Existing rows are NOT changed: whoever already has a row keeps exactly
-- the choice it records (on 17/10/2026: 1 row, set to true). The visible
-- effect is that users with no row stop receiving the digest.
--
-- Signature, return type, STABLE, SECURITY DEFINER, search_path, owner
-- and grants (service_role only) are kept as 0015 created them.
-- Independent of 0019–0023; can be applied in any order with them.
--
-- Rollback (back to opt-out):
--   alter table public.user_notification_prefs alter column boost_email_enabled set default true;
--   and re-run the function from 0015.

begin;

set local lock_timeout = '8s';

create temporary table _prefs_before on commit drop as
  select user_id, boost_email_enabled from public.user_notification_prefs;

alter table public.user_notification_prefs
  alter column boost_email_enabled set default false;

create or replace function public.list_digest_recipients()
returns table (user_id uuid, email text, name text, last_sent timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id,
         u.email::text,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
         p.boost_email_last_sent_at
    from auth.users u
    join public.user_notification_prefs p on p.user_id = u.id
   where u.email is not null
     and p.boost_email_enabled is true
$$;

revoke execute on function public.list_digest_recipients() from public, anon, authenticated;
grant execute on function public.list_digest_recipients() to service_role;

do $$
declare
  n int;
  def text;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'user_notification_prefs'
    and column_name = 'boost_email_enabled' and column_default = 'false';
  if n <> 1 then
    raise exception 'boost_email_enabled default is not false';
  end if;

  def := pg_get_functiondef('public.list_digest_recipients()'::regprocedure);
  if def ~* 'coalesce\(\s*p\.boost_email_enabled' or def ~* 'left\s+join' then
    raise exception 'list_digest_recipients() still treats a missing row as opted in';
  end if;
  if not (select prosecdef from pg_proc where oid = 'public.list_digest_recipients()'::regprocedure) then
    raise exception 'list_digest_recipients() lost SECURITY DEFINER';
  end if;

  if has_function_privilege('anon', 'public.list_digest_recipients()', 'execute')
     or has_function_privilege('authenticated', 'public.list_digest_recipients()', 'execute')
     or not has_function_privilege('service_role', 'public.list_digest_recipients()', 'execute') then
    raise exception 'list_digest_recipients() grants are not service_role-only';
  end if;

  -- Existing rows untouched.
  select count(*) into n
  from _prefs_before b
  full join public.user_notification_prefs p using (user_id)
  where b.user_id is null or p.user_id is null
     or b.boost_email_enabled is distinct from p.boost_email_enabled;
  if n <> 0 then
    raise exception '% user_notification_prefs row(s) changed', n;
  end if;

  -- Every recipient has an explicit opt-in row.
  select count(*) into n
  from public.list_digest_recipients() r
  left join public.user_notification_prefs p on p.user_id = r.user_id
  where p.boost_email_enabled is not true;
  if n <> 0 then
    raise exception '% recipient(s) without an explicit opt-in', n;
  end if;
end $$;

commit;
