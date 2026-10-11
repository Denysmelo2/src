-- 0011 — start the member scrape at 21:00 UK time
--
-- TopCashback (member rates) and the TC and Quidco gift-card shops only
-- show their rates to a logged-in member. They now run in their own
-- workflow, `scrape-member.yml` in Denysmelo2/snapgain-scraper, which
-- drives the real Chrome on Bárbara's Mac over Tailscale, logged in with
-- accounts created only for SnapGain. The owner chose 21:00, when that
-- Mac is on (2026-10-11).
--
-- pg_cron schedules in UTC and 21:00 UK is 20:00 UTC in summer (BST) and
-- 21:00 UTC in winter (GMT). So the job wakes at both and only sends the
-- dispatch when it is 21:00 in Europe/London — exactly once a day, with
-- no edit needed at the clock changes.
--
-- Same Vault secret as 0010 (`github_dispatch_token`, "Actions: read and
-- write" on snapgain-scraper covers both workflows). Inert until it
-- exists. `cron.schedule` keyed on the name is an upsert; safe to re-run.
--
-- Verify after 21:00 UK:
--   select r.id, r.status_code, left(r.content, 200)
--   from net._http_response r order by r.id desc limit 5;
-- 204 is success; 401/403/404 means the token (see 0010).

begin;

select cron.schedule(
  'member-scrape-dispatch',
  '0 20,21 * * *',
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
    AND extract(hour from now() AT TIME ZONE 'Europe/London') = 21;
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
    and schedule = '0 20,21 * * *'
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
