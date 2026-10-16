-- 0015 — recipients for the daily boost digest
--
-- daily-boost-digest calls rpc('list_digest_recipients') and, when it is
-- missing, falls back to selecting user_profiles.name, which does not
-- exist; the dry run on 16/10/2026 stopped there with a 500. This adds
-- the RPC: every signed-up user with an e-mail whose boost e-mails are
-- not switched off, with the time of their last digest. Callable only
-- with the service role (the Edge Function), never from the browser.

begin;

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
    left join public.user_notification_prefs p on p.user_id = u.id
   where u.email is not null
     and coalesce(p.boost_email_enabled, true)
$$;

revoke execute on function public.list_digest_recipients() from public, anon, authenticated;
grant execute on function public.list_digest_recipients() to service_role;

commit;
