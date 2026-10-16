-- 0016 — switch the daily boost digest on (08:00 UTC)
--
-- Owner's call, 16/10/2026. Resend is set up on the "denysgmelo" team
-- (domain snapgain.uk verified, key `snapgain-boost-digest`, sending
-- access only); RESEND_API_KEY and EMAIL_FROM are Edge Function secrets.
-- A real test e-mail went out the same evening with a Resend message id.
-- To switch off: select cron.alter_job(jobid, active := false) for the
-- same job name.

select cron.alter_job(jobid, active := true)
  from cron.job where jobname = 'daily-boost-digest';
