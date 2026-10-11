-- 0006 — monitoring that does not lie
--
-- Two views, in an `ops` schema that PostgREST does not expose, so none
-- of this reaches the browser.
--
-- Why they exist:
--
-- `cron.job_run_details` reports `succeeded` for a job whose only
-- statement is `SELECT net.http_post(...)`, because pg_net returns a
-- request id the moment it queues the request. Whether the function
-- ever answered is recorded somewhere else entirely, in
-- `net._http_response`. On 2026-10-02 `jamdoughnut-sync-daily` had 30
-- consecutive `succeeded` runs while that day's call had in fact died
-- with `Timeout of 5000 ms reached`. Anything watching the cron table
-- alone was being told the pipeline was healthy while five of eleven
-- data sources sat between 88 and 137 days stale.
--
-- Known limits, stated rather than papered over:
--
--   * `net._http_response` is pruned within hours, so `sync_job_status`
--     reads 'sem resposta registada' for anything older than that. To
--     keep real history, copy rows out of it on a schedule.
--   * The two tables carry no shared key, so the join is by TIME: the
--     first response created in a window around the run. A job that
--     fires several requests, or two jobs a few seconds apart, can be
--     mis-paired. It is a strong hint, not proof.
--
-- `data_freshness` has neither limit — it reads the offer tables
-- directly and is the one to alert on.
--
-- Its thresholds are calibrated to the cadence the pipeline actually
-- has, which is NOT daily: bulk runs land roughly every six days
-- (2026-10-01/02 and 2026-10-08, ~4,200 rows each), with a trickle of
-- 5–15 rows on the days between. An 'ok' window of 48 hours would have
-- marked healthy sources as late five days out of six, and a monitor
-- that cries wolf is the one nobody reads. Hence 8 days.
--
-- These are provisional. How stale a rate may be before it should stop
-- being shown to a user is a product decision, not a technical one.

begin;

create schema if not exists ops;

-- Keep it off the API surface. PostgREST only exposes the schemas it
-- is configured with (public, graphql_public); `ops` is not one, and
-- these grants make that explicit rather than implicit.
revoke all on schema ops from anon, authenticated;

-- ── Freshness per data source ────────────────────────────────────────
-- One row per platform per offer table. This is the view that answers
-- "is the catalogue actually being refreshed?".
create or replace view ops.data_freshness as
with fontes as (
  select 'cashback_offers'::text as tabela, platform as fonte,
         count(*) as ofertas, max(last_verified_at) as ultima_verificacao
  from public.cashback_offers where is_active group by platform
  union all
  select 'gift_card_offers', platform,
         count(*), max(last_verified_at)
  from public.gift_card_offers where is_active group by platform
  union all
  select 'point_offers', airline,
         count(*), max(last_verified_at)
  from public.point_offers where is_active group by airline
)
select
  tabela,
  fonte,
  ofertas,
  ultima_verificacao,
  now() - ultima_verificacao as idade,
  case
    when ultima_verificacao is null                          then 'nunca'
    when ultima_verificacao > now() - interval '8 days'      then 'ok'
    when ultima_verificacao > now() - interval '30 days'     then 'atrasado'
    else 'parado'
  end as estado
from fontes
order by ultima_verificacao asc nulls first;

comment on view ops.data_freshness is
  'Idade dos dados por fonte. Alertar quando estado <> ''ok''. '
  'Limiares calibrados pela cadência observada — ver o cabeçalho. '
  'Em 2026-10-09: 5 de 11 fontes em ''parado'', entre 95 e 143 dias.';

-- ── Cron jobs, judged by the HTTP answer and not by pg_cron ──────────
create or replace view ops.sync_job_status as
select
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  d.start_time        as ultima_execucao,
  d.status            as estado_cron,
  r.status_code       as estado_http,
  r.timed_out         as expirou,
  left(r.error_msg, 200) as erro_http,
  case
    when not j.active                                then 'desactivado'
    when d.start_time is null                        then 'nunca correu'
    when r.created is null                           then 'sem resposta registada (podada)'
    when r.status_code between 200 and 299           then 'ok'
    when r.timed_out                                 then 'expirou'
    when r.status_code is not null                   then 'HTTP ' || r.status_code
    else 'falhou: ' || left(coalesce(r.error_msg, 'motivo desconhecido'), 80)
  end as veredicto
from cron.job j
left join lateral (
  select d2.start_time, d2.status
  from cron.job_run_details d2
  where d2.jobid = j.jobid
  order by d2.start_time desc
  limit 1
) d on true
left join lateral (
  -- Correlação por tempo: ver "Known limits" no cabeçalho.
  select r2.created, r2.status_code, r2.timed_out, r2.error_msg
  from net._http_response r2
  where d.start_time is not null
    and r2.created between d.start_time - interval '1 minute'
                       and d.start_time + interval '5 minutes'
  order by r2.created
  limit 1
) r on true
order by j.jobid;

comment on view ops.sync_job_status is
  'Estado real dos cron jobs. cron.job_run_details diz ''succeeded'' '
  'assim que o net.http_post enfileira o pedido, por isso o veredicto '
  'aqui vem do status_code de net._http_response. Correlação por tempo '
  'e histórico curto — ver o cabeçalho da migration 0006.';

commit;
