-- 0040: daily email to the owner when a source stops updating.
--
-- Handover 23/10/2026, section 1, item 3: Quidco and Avios failed from
-- 19/10 and nobody saw it for five days. The Edge Function
-- `source-alert` reads the freshness numbers below and, when a source
-- that should update every day is 48 hours old, emails ALERT_EMAIL (an
-- Edge Function secret; the address is never written in this repo).
--
-- Order after merge: deploy `source-alert` (verify_jwt = false), set the
-- ALERT_EMAIL secret, then apply this migration. If the job fires before
-- the function exists, the call just gets a 404.
--
-- To switch off: select cron.alter_job(jobid, active := false)
--   from cron.job where jobname = 'source-stale-alert';

-- The same rows as ops.data_freshness, for the service role only (the
-- ops schema is not exposed to the API).
create or replace function public.source_freshness()
returns table (tabela text, fonte text, ofertas bigint, ultima_verificacao timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select f.tabela, f.fonte, f.ofertas, f.ultima_verificacao
    from ops.data_freshness f;
$$;

revoke execute on function public.source_freshness() from public, anon, authenticated;
grant execute on function public.source_freshness() to service_role;

-- 12:00 UK every day, after the 08:00 daily run and the 09:00 run
-- through the Mac (which may take up to 150 minutes). Fires at 11:00 and
-- 12:00 UTC and only calls at 12 o'clock London time, so it stays at
-- noon through the clock change (same as daily-scrape-dispatch).
select cron.unschedule(jobid) from cron.job where jobname = 'source-stale-alert';

select cron.schedule(
  'source-stale-alert',
  '0 11,12 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ffowgyjdbgkphsflxybk.supabase.co/functions/v1/source-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.decrypted_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  FROM vault.decrypted_secrets s
  WHERE s.name = 'service_role_key'
    AND extract(hour from now() AT TIME ZONE 'Europe/London') = 12;
  $cron$
);

do $$
begin
  if has_function_privilege('anon', 'public.source_freshness()', 'execute') then
    raise exception 'anon can execute source_freshness()';
  end if;
  if not exists (select 1 from cron.job where jobname = 'source-stale-alert' and active) then
    raise exception 'source-stale-alert job missing';
  end if;
end $$;
