-- 0010 — start the daily rate robot at 04:00 UTC, on time
--
-- The robot is the `daily-scrape` workflow in Denysmelo2/snapgain-scraper
-- (GitHub Actions). Its own trigger is `schedule: '0 4 * * *'`, but
-- GitHub runs scheduled workflows best-effort, and this one has been
-- starting at 09:00–11:00 UTC — five to seven hours late — every day.
--
-- pg_cron is on time, so the start moves here: at 04:00 UTC this job
-- calls GitHub's workflow_dispatch endpoint for `scrape-daily.yml` on
-- `main`. The GitHub `schedule` stays in the workflow as a fallback; its
-- first step skips the run when a dispatched run already started that
-- day, so the scrape still runs once a day.
--
-- The token: a fine-grained GitHub token whose only permission is
-- "Actions: read and write" on Denysmelo2/snapgain-scraper. It lives in
-- Supabase Vault under the name `github_dispatch_token`, never in this
-- file or in cron.job.command (see 0008 for why). The owner creates it
-- in GitHub and stores it in Vault from the dashboard.
--
-- Until that secret exists the job is inert: the SELECT below reads
-- FROM vault.decrypted_secrets, so with no matching row it sends
-- nothing at all (rather than an unauthenticated request that fails
-- every morning).
--
-- Like 0008, `cron.schedule` keyed on the job NAME is an upsert, so this
-- file both records the job and recreates it, and is safe to re-run.
--
-- Verify after 04:00 UTC the next day:
--   select r.id, r.status_code, left(r.content, 200)
--   from net._http_response r order by r.id desc limit 5;
-- A 204 is success. 401/403 means the token is wrong or lacks the
-- permission; 404 usually means the same (GitHub hides the repo), or
-- that the workflow file was renamed.

begin;

select cron.schedule(
  'daily-scrape-dispatch',
  '0 4 * * *',
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
  WHERE s.name = 'github_dispatch_token';
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
    and schedule = '0 4 * * *'
    and command ilike '%vault.decrypted_secrets%'
    and command ilike '%scrape-daily.yml/dispatches%';
  if n <> 1 then
    raise exception
      'daily-scrape-dispatch is not in the expected shape (matched % rows)', n;
  end if;

  -- 0008's rule still holds for the new job.
  select count(*) into n from cron.job where command ~ 'Bearer\s+(eyJ|gh[pousr]_|github_pat_)';
  if n <> 0 then
    raise exception '% cron job(s) carry a literal bearer token', n;
  end if;
end $$;

commit;
