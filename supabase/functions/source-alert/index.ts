// source-alert
//
// Emails the owner when a source that should update every day has not
// been verified for 48 hours. Quidco and Avios failed from 19/10/2026
// and nobody saw it for five days: the failure only showed in GitHub
// Actions (handover 23/10, section 1, item 3).
//
// Reads public.source_freshness() (migration 0040), the same numbers as
// ops.data_freshness on /admin. One email a day while anything is stale;
// nothing is sent when every watched source is fresh.
//
// Triggered by pg_cron once a day at 12:00 UK (job `source-stale-alert`),
// after the 08:00 daily run and the 09:00 run through the Mac. Can also
// be called by hand with ?dry_run=1 to see the result without sending.
//
// Auth model (same as daily-boost-digest): verify_jwt=false because
// pg_cron / pg_net don't carry a JWT. We require X-Internal-Key OR the
// service-role key in Authorization. Anonymous traffic is rejected.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY, EMAIL_FROM   already set for the other emails
//   ALERT_EMAIL                  who gets the alert; several addresses
//                                separated by commas. Never in this repo.
//   INTERNAL_SYNC_KEY            optional, for manual calls

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'SnapGain <noreply@snapgain.uk>';
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') || '';
const INTERNAL_SYNC_KEY = Deno.env.get('INTERNAL_SYNC_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://snapgain.uk';

const STALE_HOURS = 48;

// Sources expected to update every day, as ops.data_freshness names them
// (`fonte`), with the run that updates each one. NX is left out while its
// robot only reads (first week from 25/10/2026): it writes nothing yet,
// so it would always look stale. Add it here when the robot starts writing.
const WATCHED: Record<string, { label: string; run: string }> = {
  quidco: { label: 'Quidco', run: '09:00 run through the Mac (member-scrape)' },
  'british airways avios': { label: 'Avios eStore', run: '09:00 run through the Mac (member-scrape)' },
  jamdoughnut: { label: 'JamDoughnut', run: '08:00 daily run (scrape-daily)' },
  picodi: { label: 'Picodi', run: '08:00 daily run (scrape-daily)' },
  cheddar: { label: 'Cheddar', run: '08:00 daily run (scrape-daily)' },
  everup: { label: 'EverUp', run: '08:00 daily run (scrape-daily)' },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isAuthorized(req: Request): boolean {
  const internal = req.headers.get('x-internal-key');
  if (INTERNAL_SYNC_KEY && internal === INTERNAL_SYNC_KEY) return true;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
}

type FreshnessRow = {
  tabela: string;
  fonte: string;
  ofertas: number;
  ultima_verificacao: string | null;
};

type Stale = { label: string; run: string; last: string | null; hours: number | null; offers: number };

// A watched source is stale when its newest active offer is older than
// STALE_HOURS, or when it has no active offers at all.
export function findStale(rows: FreshnessRow[], now = Date.now()): Stale[] {
  const byFonte = new Map<string, FreshnessRow>();
  for (const r of rows) {
    const key = (r.fonte || '').toLowerCase();
    const prev = byFonte.get(key);
    if (!prev || (r.ultima_verificacao ?? '') > (prev.ultima_verificacao ?? '')) byFonte.set(key, r);
  }
  const stale: Stale[] = [];
  for (const [key, { label, run }] of Object.entries(WATCHED)) {
    const row = byFonte.get(key);
    const last = row?.ultima_verificacao ?? null;
    const hours = last ? Math.floor((now - new Date(last).getTime()) / 3_600_000) : null;
    if (hours === null || hours >= STALE_HOURS) {
      stale.push({ label, run, last, hours, offers: row?.ofertas ?? 0 });
    }
  }
  return stale.sort((a, b) => (b.hours ?? Infinity) - (a.hours ?? Infinity));
}

function age(hours: number | null): string {
  if (hours === null) return 'no active offers';
  if (hours < 72) return `${hours} hours`;
  return `${Math.floor(hours / 24)} days`;
}

function renderEmail(stale: Stale[]): { subject: string; html: string; text: string } {
  const names = stale.map((s) => s.label).join(', ');
  const subject = `SnapGain: ${names} not updated for ${STALE_HOURS}+ hours`;
  const lines = stale.map(
    (s) => `- ${s.label}: last update ${s.last ? new Date(s.last).toUTCString() : 'never'} (${age(s.hours)}), ${s.offers} active offers. Updated by the ${s.run}.`
  );
  const text = `These sources have not been updated for ${STALE_HOURS} hours or more:\n\n${lines.join('\n')}\n\nThe site still shows their last rates. Check the run in GitHub Actions (Denysmelo2/snapgain-scraper) and the freshness table on ${APP_URL}/admin.\n\nYou get this email once a day while a source is stale.`;
  const rows = stale
    .map(
      (s) => `<tr><td style="padding:10px 16px;border-bottom:1px solid #eee;font-size:14px;color:#333;line-height:20px;">
        <strong>${s.label}</strong>: ${age(s.hours)} without an update, ${s.offers} active offers<br>
        <span style="color:#777;">Last update ${s.last ? new Date(s.last).toUTCString() : 'never'}. Updated by the ${s.run}.</span>
      </td></tr>`
    )
    .join('');
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;">
    <tr><td style="padding:20px 16px 8px;">
      <h1 style="margin:0;font-size:18px;color:#1a1a1a;">${stale.length === 1 ? 'A source is' : `${stale.length} sources are`} not updating</h1>
      <p style="margin:8px 0 0;color:#555;font-size:14px;">No update for ${STALE_HOURS} hours or more. The site still shows their last rates.</p>
    </td></tr>
    ${rows}
    <tr><td style="padding:16px;color:#777;font-size:13px;line-height:19px;">
      Check the run in GitHub Actions (Denysmelo2/snapgain-scraper) and the freshness table on <a href="${APP_URL}/admin" style="color:#7c3aed;">/admin</a>.
      You get this email once a day while a source is stale.
    </td></tr>
  </table>
</body></html>`;
  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) return new Response('Unauthorized', { status: 401 });
  const dryRun = new URL(req.url).searchParams.get('dry_run') === '1';

  const { data, error } = await supabase.rpc('source_freshness');
  if (error) {
    console.error('[source-alert] source_freshness failed', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  const stale = findStale((data ?? []) as FreshnessRow[]);
  const recipients = ALERT_EMAIL.split(',').map((s) => s.trim()).filter(Boolean);
  const summary: Record<string, unknown> = { dry_run: dryRun, stale, recipients: recipients.length };

  if (!stale.length || dryRun) {
    return new Response(JSON.stringify({ ok: true, sent: false, ...summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!RESEND_API_KEY || !recipients.length) {
    console.error('[source-alert] RESEND_API_KEY or ALERT_EMAIL not set; stale:', stale.map((s) => s.label));
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY or ALERT_EMAIL not set', ...summary }), { status: 500 });
  }

  const { subject, html, text } = renderEmail(stale);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: recipients, subject, html, text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[source-alert] Resend', res.status, body);
    return new Response(JSON.stringify({ error: `Resend ${res.status}`, ...summary }), { status: 502 });
  }
  return new Response(JSON.stringify({ ok: true, sent: true, resend_id: body.id, ...summary }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
