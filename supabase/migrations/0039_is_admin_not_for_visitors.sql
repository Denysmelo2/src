-- 0039 — visitors can no longer call is_admin(); ops.nx_key gets a fixed
-- search_path (Supabase advisor findings, Cowork's 23/10 handover §3).
--
-- 1. is_admin() was executable by `anon` (POST /rest/v1/rpc/is_admin).
--    Revoking that alone would break the site: the four hot_deals admin
--    policies were written for role `public`, so a visitor reading hot
--    deals evaluates is_admin() too, and Postgres refuses the whole query
--    ("42501 permission denied for function is_admin"; reproduced in a
--    rolled-back transaction on 23/10). Those policies move to
--    `authenticated` first: a visitor is never an admin, and visitors keep
--    reading active deals through hot_deals_public_read.
--    Every other policy that calls is_admin() is already `to
--    authenticated`; the only function that calls it
--    (can_access_user_data) is SECURITY DEFINER and not open to anon.
-- 2. ops.nx_key(text) had no fixed search_path. It only uses built-ins
--    (lower, translate, regexp_replace, coalesce), which resolve from
--    pg_catalog with an empty search_path.

begin;

set local lock_timeout = '8s';

alter policy hot_deals_admin_read   on public.hot_deals to authenticated;
alter policy hot_deals_admin_insert on public.hot_deals to authenticated;
alter policy hot_deals_admin_update on public.hot_deals to authenticated;
alter policy hot_deals_admin_delete on public.hot_deals to authenticated;

revoke execute on function public.is_admin() from anon, public;
grant execute on function public.is_admin() to authenticated, service_role;

alter function ops.nx_key(text) set search_path = '';

do $$
begin
  if has_function_privilege('anon', 'public.is_admin()', 'execute') then
    raise exception 'anon can still execute is_admin()';
  end if;
  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute') then
    raise exception 'authenticated lost is_admin()';
  end if;
  if exists (
    select 1 from pg_policies
     where (coalesce(qual, '') ilike '%is_admin(%' or coalesce(with_check, '') ilike '%is_admin(%')
       and not (roles <@ array['authenticated']::name[])
  ) then
    raise exception 'a policy that calls is_admin() still applies to visitors';
  end if;
  if ops.nx_key('Sainsbury’s Groceries Online') <> 'sainsburysgroceries' then
    raise exception 'ops.nx_key changed behaviour';
  end if;
end $$;

commit;
