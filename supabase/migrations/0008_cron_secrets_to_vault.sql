-- 0008 — take the bearer token out of cron.job.command
--
-- `jamdoughnut-sync-daily` (jobid 3) carried its Authorization header as
-- a literal JWT inside the SQL text of the job:
--
--   'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
--
-- `cron.job` is an ordinary table. Anything that can read it — any
-- query, any backup, any dashboard screenshot, any `pg_dump` — read the
-- key. `daily-boost-digest` (jobid 6) was already doing it properly, so
-- this was an inconsistency rather than an unknown.
--
-- Applied 2026-10-09 with `cron.alter_job`, which keeps the jobid and
-- the run history. Written here as `cron.schedule` keyed on the job
-- NAME, which pg_cron treats as an upsert, so the file is both the
-- record and a way to recreate the job in a fresh project — and is safe
-- to re-run.
--
-- Everything else about the job is deliberately unchanged: the same
-- schedule (05:00 UTC), the same empty body, and the 60s
-- timeout_milliseconds that replaced pg_net's 5s default (the 5s
-- default was what made this sync fail silently every day while
-- `cron.job_run_details` kept reporting `succeeded` — see migration
-- 0006 for why that table cannot be trusted on its own).
--
-- STILL OUTSTANDING, and not something SQL can do: the token that was
-- sitting in this table should be ROTATED. It was readable for months.
-- Rotating a project API key is a dashboard action for the operator;
-- this migration only stops the leak continuing.
--
-- Verify:
--   select jobid, jobname,
--          (command ~ 'Bearer\s+eyJ')                  as literal_jwt,
--          (command ilike '%vault.decrypted_secrets%') as uses_vault
--   from cron.job order by jobid;

begin;

select cron.schedule(
  'jamdoughnut-sync-daily',
  '0 5 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://ffowgyjdbgkphsflxybk.supabase.co/functions/v1/jamdoughnut-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cmd$
);

do $$
declare
  n int;
begin
  -- No job may carry a literal JWT any more.
  select count(*) into n from cron.job where command ~ 'Bearer\s+eyJ';
  if n <> 0 then
    raise exception '% cron job(s) still carry a literal bearer token', n;
  end if;

  -- And this one must still be the vault-reading, 60s, daily job.
  select count(*) into n
  from cron.job
  where jobname = 'jamdoughnut-sync-daily'
    and active
    and schedule = '0 5 * * *'
    and command ilike '%vault.decrypted_secrets%'
    and command ilike '%timeout_milliseconds := 60000%'
    and command ilike '%functions/v1/jamdoughnut-sync%';
  if n <> 1 then
    raise exception
      'jamdoughnut-sync-daily is not in the expected shape (matched % rows)', n;
  end if;
end $$;

commit;
