-- 0018 — daily scrape at 08:00 UK time; the robot runs only in the morning
--
-- Owner's call, 17/10/2026: the daily cloud scrape (JamDoughnut, Quidco,
-- Picodi, Avios, Cheddar, EverUp) starts at 08:00 Europe/London instead
-- of 04:00 UTC, and no other robot dispatch runs. The member scrape (the
-- Mac robot, 0012) stays switched off as 0014 left it.
--
-- pg_cron schedules in UTC and 08:00 UK is 07:00 UTC in summer (BST) and
-- 08:00 UTC in winter (GMT), so the job wakes at both and dispatches only
-- when it is 08:00 in Europe/London: once a day across the clock changes.
-- Same Vault secret as 0010. `cron.schedule` keyed on the name is an
-- upsert; safe to re-run.

begin;

select cron.schedule(
  'daily-scrape-dispatch',
  '0 7,8 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://api.github.com/repos/Denysmelo2/snapgain-scraper/actions/workflows/scrape-daily.yml/dispatches',
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
    AND extract(hour from now() AT TIME ZONE 'Europe/London') = 8;
  $cmd$
);

do $$
declare
  n int;
begin
  select count(*) into n
  from cron.job
  where jobname = 'daily-scrape-dispatch'
    and active
    and schedule = '0 7,8 * * *'
    and command ilike '%vault.decrypted_secrets%'
    and command ilike '%scrape-daily.yml/dispatches%'
    and command ilike '%Europe/London%';
  if n <> 1 then
    raise exception
      'daily-scrape-dispatch is not in the expected shape (matched % rows)', n;
  end if;

  select count(*) into n
  from cron.job
  where jobname = 'member-scrape-dispatch' and active;
  if n <> 0 then
    raise exception 'member-scrape-dispatch should stay off (0014)';
  end if;

  select count(*) into n from cron.job where command ~ 'Bearer\s+(eyJ|gh[pousr]_|github_pat_)';
  if n <> 0 then
    raise exception '% cron job(s) carry a literal bearer token', n;
  end if;
end $$;

commit;
