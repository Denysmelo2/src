-- 0013 — internal SECURITY DEFINER functions are not public API
--
-- The security advisor listed 12 SECURITY DEFINER functions that anyone,
-- signed in or not, could call through /rest/v1/rpc/. Nothing in the site,
-- the Edge Functions or the robots calls them over the API (checked
-- 16/10/2026): they are trigger functions, a test helper, unused helpers
-- and invoke_platforms_meta_sync(), which only the 04:00 pg_cron job
-- (running as postgres) should start. Revoking EXECUTE does not stop a
-- trigger from firing, and service_role keeps access.
--
-- is_admin() stays callable: 42 RLS policies evaluate it as the caller.
-- merge_store() gets a fixed search_path (advisor 0011) and is no longer
-- callable by anon/authenticated.

begin;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.handle_new_user()',
    'public.log_rate_change()',
    'public.sync_user_role_to_profile()',
    'public.tg_set_updated_at()',
    'public.update_cashback_rate_timestamp()',
    'public.update_timestamp()',
    'public.invoke_platforms_meta_sync()',
    'public.test_auth_uid()',
    'public.can_access_user_data(uuid)',
    'public.is_owner()',
    'public.is_owner(uuid)',
    'public.merge_store(uuid, uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

alter function public.merge_store(uuid, uuid) set search_path = public;

do $$
declare n int;
begin
  select count(*) into n
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public'
    and p.proname in ('handle_new_user','log_rate_change','sync_user_role_to_profile',
      'tg_set_updated_at','update_cashback_rate_timestamp','update_timestamp',
      'invoke_platforms_meta_sync','test_auth_uid','can_access_user_data','is_owner','merge_store')
    and (has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute'));
  if n <> 0 then
    raise exception '% internal function(s) still callable by anon/authenticated', n;
  end if;
  if not has_function_privilege('authenticated', 'public.is_admin()', 'execute') then
    raise exception 'is_admin() must stay callable: RLS policies use it';
  end if;
end $$;

commit;
