// daily-boost-digest
//
// Picks up boost events from the last 24h (or since the user's last
// digest, whichever is shorter), filters to events touching that user's
// favourite stores, and sends a single "N stores got a boost" email
// per user via Resend.
//
// Triggered by pg_cron once per day (job `daily-boost-digest`). Can also
// be invoked manually for one-off tests with ?dry_run=1.
//
// Auth model: verify_jwt=false because pg_cron / pg_net don't carry a
// JWT. We require X-Internal-Key OR the service-role-key in
// Authorization. Anonymous traffic is rejected.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   SUPABASE_URL                  (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-set by Supabase)
//   RESEND_API_KEY                (created at resend.com, team "denysgmelo")
//   EMAIL_FROM                    e.g. "SnapGain <boost@snapgain.uk>"
//   INTERNAL_SYNC_KEY             optional, for manual calls
//
// Query params:
//   dry_run=1   — builds the digest + logs to boost_digest_log with
//                  status='dry_run' but doesn't actually POST to Resend.
//   user_id=<u> — only run for one user (debugging).
//
// 16/10/2026: the button gets a solid colour first (Gmail drops
// gradients) and platforms are written by name (JamDoughnut, not
// jamdoughnut).
// 16/10/2026: recipients come from rpc('list_digest_recipients')
// (migration 0015); the old fallback asked for a user_profiles.name
// column that does not exist. Events from platforms retired on
// 16/10/2026 (migration 0014) are left out of the e-mail.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'SnapGain <noreply@snapgain.uk>';
const INTERNAL_SYNC_KEY = Deno.env.get('INTERNAL_SYNC_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://snapgain.uk';

// Platforms no longer compared on the site (migration 0014).
const RETIRED_PLATFORMS = ['topcashback', 'topcashback-giftcards', 'quidco-giftcards'];

// How each platform is written in the e-mail.
const PLATFORM_LABELS: Record<string, string> = {
  jamdoughnut: 'JamDoughnut',
  everup: 'EverUp',
  cheddar: 'Cheddar',
  quidco: 'Quidco',
  picodi: 'Picodi',
  avios: 'Avios',
  'british airways avios': 'Avios',
};
const platformLabel = (p: string) => PLATFORM_LABELS[(p || '').toLowerCase()] || p;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isAuthorized(req: Request): boolean {
  const internal = req.headers.get('x-internal-key');
  if (INTERNAL_SYNC_KEY && internal === INTERNAL_SYNC_KEY) return true;
  const auth = req.headers.get('authorization') || '';
  if (auth === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  return false;
}

type BoostEvent = {
  store_id: string;
  platform: string;
  event: string;
  old_rate: number | null;
  new_rate: number | null;
  detected_at: string;
  store_name?: string;
  store_slug?: string;
};

function renderEmail(opts: {
  userName: string | null;
  events: BoostEvent[];
  appUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { events, userName, appUrl, unsubscribeUrl } = opts;
  const n = events.length;
  const subject =
    n === 1
      ? `1 of your stores just got a boost`
      : `${n} of your stores just got a boost`;

  // Group by store so a store with boosts on two platforms appears once
  // with two rows.
  const byStore = new Map<string, BoostEvent[]>();
  for (const e of events) {
    const key = `${e.store_id}|${e.store_name || ''}|${e.store_slug || ''}`;
    const arr = byStore.get(key) || [];
    arr.push(e);
    byStore.set(key, arr);
  }

  const rowsHtml = Array.from(byStore.entries())
    .map(([key, evs]) => {
      const [, storeName, storeSlug] = key.split('|');
      const storeUrl = storeSlug
        ? `${appUrl}/store/${storeSlug}`
        : `${appUrl}/search?q=${encodeURIComponent(storeName)}`;
      const eventLines = evs
        .map((e) => {
          const rateMsg =
            e.event === 'rate_up' && e.old_rate != null && e.new_rate != null
              ? `${platformLabel(e.platform)}: ${e.old_rate}% → <strong>${e.new_rate}%</strong>`
              : e.event === 'entered_boost'
              ? `${platformLabel(e.platform)}: now boosted${e.new_rate != null ? ` (${e.new_rate}%)` : ''}`
              : `${platformLabel(e.platform)}: ${e.event}`;
          return `<div style="font-size:14px;color:#555;line-height:20px;">${rateMsg}</div>`;
        })
        .join('');
      return `<tr><td style="padding:12px 16px;border-bottom:1px solid #eee;">
        <a href="${storeUrl}" style="color:#7c3aed;text-decoration:none;font-weight:600;font-size:16px;">${storeName || 'Store'}</a>
        ${eventLines}
      </td></tr>`;
    })
    .join('');

  const text = `Hi${userName ? ' ' + userName : ''},\n\n${n} of your favourite store${n === 1 ? '' : 's'} got a cashback boost in the last 24 hours.\n\n${events
    .map((e) => `- ${e.store_name || e.store_id} (${platformLabel(e.platform)}): ${e.event}${e.new_rate ? ` → ${e.new_rate}%` : ''}`)
    .join('\n')}\n\nSee the full list: ${appUrl}/home\n\nManage preferences: ${unsubscribeUrl}`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f7f8;padding:24px 0;">
<tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:24px 24px 0;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">${subject}</h1>
      <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:20px;">Hi${userName ? ` ${userName}` : ''}, here’s what changed in the last 24 hours on the stores you follow.</p>
    </td></tr>
    <tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rowsHtml}</table>
    </td></tr>
    <tr><td align="center" style="padding:24px;">
      <a href="${appUrl}/home" style="display:inline-block;background-color:#7D4DFB;background-image:linear-gradient(90deg,#7D4DFB,#FF3FCE);color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Open SnapGain</a>
    </td></tr>
    <tr><td style="padding:0 24px 24px;">
      <p style="margin:0;color:#999;font-size:12px;line-height:18px;text-align:center;">
        You’re getting this because boost emails are on. <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Turn them off</a>.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ id: string }> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: {
        // RFC-compliant unsubscribe header so Gmail shows the
        // one-click unsubscribe affordance.
        'List-Unsubscribe': `<${APP_URL}/settings?notifications=off>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === '1';
  const onlyUser = url.searchParams.get('user_id');

  // Recipients: every user with an e-mail whose boost e-mails are not
  // switched off (rpc defined in migration 0015).
  let recipients: Array<{ user_id: string; email: string; name: string | null; last_sent: string | null }> = [];
  try {
    const { data, error } = await supabase.rpc('list_digest_recipients');
    if (error) throw error;
    recipients = (data || []) as typeof recipients;
  } catch (_e) {
    // Fallback: profiles carry the e-mail but no display name.
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .not('email', 'is', null)
      .limit(1000);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
    recipients = (data || []).map((r: any) => ({
      user_id: r.user_id,
      email: r.email,
      name: null,
      last_sent: null,
    }));
  }

  if (onlyUser) {
    recipients = recipients.filter((r) => r.user_id === onlyUser);
  }

  const summary = {
    candidates: recipients.length,
    sent: 0,
    skipped_no_events: 0,
    skipped_disabled: 0,
    failed: 0,
    dry_run: dryRun,
  };

  for (const r of recipients) {
    // Read prefs for this user (default-true if no row).
    const { data: pref } = await supabase
      .from('user_notification_prefs')
      .select('boost_email_enabled, boost_email_last_sent_at')
      .eq('user_id', r.user_id)
      .maybeSingle();

    if (pref && pref.boost_email_enabled === false) {
      summary.skipped_disabled += 1;
      continue;
    }

    // Frequency cap: don't send twice within 20h.
    if (pref?.boost_email_last_sent_at) {
      const lastMs = new Date(pref.boost_email_last_sent_at).getTime();
      if (Date.now() - lastMs < 20 * 60 * 60 * 1000) {
        summary.skipped_no_events += 1;
        continue;
      }
    }

    const since = pref?.boost_email_last_sent_at
      ? new Date(pref.boost_email_last_sent_at).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Boost events on this user's favourites since `since`.
    const { data: favs } = await supabase
      .from('user_favourites')
      .select('store_id')
      .eq('user_id', r.user_id);
    const storeIds = (favs || []).map((f: any) => f.store_id);
    if (storeIds.length === 0) {
      summary.skipped_no_events += 1;
      continue;
    }

    const { data: rawEvents } = await supabase
      .from('booster_events')
      .select('store_id, platform, event, old_rate, new_rate, detected_at')
      .in('store_id', storeIds)
      .in('event', ['entered_boost', 'rate_up'])
      .not('platform', 'in', `(${RETIRED_PLATFORMS.join(',')})`)
      .gte('detected_at', since)
      .order('detected_at', { ascending: false })
      .limit(50);

    const events = (rawEvents || []) as BoostEvent[];
    if (events.length === 0) {
      await supabase.from('boost_digest_log').insert({
        user_id: r.user_id,
        sent_at: new Date().toISOString(),
        event_count: 0,
        since,
        status: 'skipped_no_events',
      });
      summary.skipped_no_events += 1;
      continue;
    }

    // Decorate events with store name + slug.
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name, slug')
      .in('id', events.map((e) => e.store_id));
    const storeMap = new Map((stores || []).map((s: any) => [s.id, s]));
    for (const e of events) {
      const s = storeMap.get(e.store_id) as any;
      if (s) {
        e.store_name = s.name;
        e.store_slug = s.slug;
      }
    }

    const { subject, html, text } = renderEmail({
      userName: r.name,
      events,
      appUrl: APP_URL,
      unsubscribeUrl: `${APP_URL}/settings?notifications=off`,
    });

    if (dryRun) {
      await supabase.from('boost_digest_log').insert({
        user_id: r.user_id,
        sent_at: new Date().toISOString(),
        event_count: events.length,
        since,
        status: 'dry_run',
      });
      summary.sent += 1;
      continue;
    }

    try {
      const { id } = await sendViaResend({ to: r.email, subject, html, text });
      await supabase.from('boost_digest_log').insert({
        user_id: r.user_id,
        sent_at: new Date().toISOString(),
        event_count: events.length,
        since,
        provider_message_id: id,
        status: 'sent',
      });
      // Upsert pref row with new timestamp.
      await supabase.from('user_notification_prefs').upsert(
        {
          user_id: r.user_id,
          boost_email_last_sent_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      summary.sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from('boost_digest_log').insert({
        user_id: r.user_id,
        sent_at: new Date().toISOString(),
        event_count: events.length,
        since,
        status: 'failed',
        error: msg,
      });
      summary.failed += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
