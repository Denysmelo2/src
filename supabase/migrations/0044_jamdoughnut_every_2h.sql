-- 0044 — JamDoughnut again at 10, 12, 14, 16, 18, 20 and 22 UK time
--
-- Handover 15/11/2026 (JamDoughnut Pump Up), task 3. JamDoughnut turns
-- Pump Ups on and off during the day; with one read at 08:00 a boost
-- that starts at 10:00 showed the next day or never. The read is one
-- HTTP call (about a minute), so it now also runs every 2 hours until
-- 22:00. 08:00 stays in daily-scrape-dispatch (0018) with the other
-- robots.
--
-- The job dispatches snapgain-scraper's scrape-jamdoughnut.yml
-- (snapgain-scraper#58), which runs only `node index.js jamdoughnut` and
-- shares daily-scrape's concurrency group. Same Vault token as 0018.
--
-- pg_cron schedules in UTC; UK is UTC+1 in summer. The job wakes every
-- hour from 09 to 22 UTC and dispatches only when the Europe/London
-- hour is one of the seven above: seven runs a day across the clock
-- changes. `cron.schedule` keyed on the name is an upsert; safe to
-- re-run.
--
-- To switch off: select cron.alter_job(jobid, active := false)
--   from cron.job where jobname = 'jamdoughnut-dispatch';

begin;

select cron.schedule(
  'jamdoughnut-dispatch',
  '0 9-22 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://api.github.com/repos/Denysmelo2/snapgain-scraper/actions/workflows/scrape-jamdoughnut.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || s.decrypted_secret,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'snapgain-pg-cron',
      'Content-Type', 'application/json'
    ),
    body := '{"ref":"main"}'::jsonb,
    timeout_milliseconds := 30000
  )
  FROM vault.decrypted_secrets s
  WHERE s.name = 'github_dispatch_token'
    AND extract(hour from now() AT TIME ZONE 'Europe/London') IN (10, 12, 14, 16, 18, 20, 22);
  $cmd$
);

do $$
declare
  n int;
begin
  select count(*) into n
  from cron.job
  where jobname = 'jamdoughnut-dispatch'
    and active
    and schedule = '0 9-22 * * *'
    and command ilike '%vault.decrypted_secrets%'
    and command ilike '%scrape-jamdoughnut.yml/dispatches%'
    and command ilike '%Europe/London%';
  if n <> 1 then
    raise exception
      'jamdoughnut-dispatch is not in the expected shape (matched % rows)', n;
  end if;

  select count(*) into n from cron.job where command ~ 'Bearer\s+(eyJ|gh[pousr]_|github_pat_)';
  if n <> 0 then
    raise exception '% cron job(s) carry a literal bearer token', n;
  end if;
end $$;

commit;
