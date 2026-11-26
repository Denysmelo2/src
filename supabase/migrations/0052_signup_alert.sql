-- 0052 — email the owner on every sign-up (owner's request, 26/11/2026).
--
-- After a row is inserted in auth.users, ops.notify_signup() calls the
-- Edge Function signup-alert through pg_net (asynchronous: the sign-up
-- never waits for the email). The service-role key comes from Vault
-- (service_role_key), as in the daily-boost-digest and source-alert crons.
-- Any error here is swallowed with a warning: a broken alert must never
-- block someone from signing up.
--
-- Rollback:
--   drop trigger if exists on_auth_user_created_notify on auth.users;
--   drop function if exists ops.notify_signup();

create schema if not exists ops;

create or replace function ops.notify_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  k text;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
  begin
    select decrypted_secret into k from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    if k is not null then
      perform net.http_post(
        url := 'https://ffowgyjdbgkphsflxybk.supabase.co/functions/v1/signup-alert',
        headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
        body := jsonb_build_object('user_id', new.id),
        timeout_milliseconds := 10000
      );
    end if;
  exception when others then
    raise warning 'notify_signup failed: %', sqlerrm;
  end;
  return new;
end;
$function$;

revoke all on function ops.notify_signup() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function ops.notify_signup();
