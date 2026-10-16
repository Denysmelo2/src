-- 0012 — move the member scrape from 21:00 to 09:00 UK time
--
-- From 12 to 15/10/2026 every 21:00 run stopped at "Mac not reachable":
-- Bárbara's Mac is not reliably on in the evening. The owner chose 09:00
-- UK, when it is on (2026-10-16). Everything else is as in 0011: same
-- Vault secret, same workflow, same "only when it is that hour in
-- Europe/London" guard, so pg_cron wakes at 08:00 and 09:00 UTC and
-- dispatches once a day across the clock changes.
--
-- The 04:00 UTC daily scrape (0010) finishes by about 06:40 UK, so the
-- two never share the Mac's Chrome. `cron.schedule` keyed on the name
-- is an upsert; safe to re-run.

begin;

select cron.schedule(
  'member-scrape-dispatch',
  '0 8,9 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://api.github.com/repos/Denysmelo2/snapgain-scraper/actions/workflows/scrape-member.yml/dispatches',
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
    AND extract(hour from now() AT TIME ZONE 'Europe/London') = 9;
  $cmd$
);

do $$
declare
  n int;
begin
  select count(*) into n
  from cron.job
  where jobname = 'member-scrape-dispatch'
    and active
    and schedule = '0 8,9 * * *'
    and command ilike '%vault.decrypted_secrets%'
    and command ilike '%scrape-member.yml/dispatches%'
    and command ilike '%Europe/London%';
  if n <> 1 then
    raise exception
      'member-scrape-dispatch is not in the expected shape (matched % rows)', n;
  end if;

  select count(*) into n from cron.job where command ~ 'Bearer\s+(eyJ|gh[pousr]_|github_pat_)';
  if n <> 0 then
    raise exception '% cron job(s) carry a literal bearer token', n;
  end if;
end $$;

commit;
