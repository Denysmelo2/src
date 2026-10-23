// Subscription emails sent by stripe-webhook, through Resend.
//
// Owner's request (23/10/2026): signing up sends the trial welcome
// (Supabase's confirm-signup template), but becoming Premium sent
// nothing, and neither did cancelling. Both also help with the DMCC Act
// subscription rules (clear terms after sign-up, easy cancellation).
//
//   * Welcome to Premium: the first time a profile turns active. Plan,
//     price, next payment, how to cancel, the 14-day right.
//   * Cancellation: once per subscription, when it is set to cancel or
//     ends. Says until when Premium lasts.
//
// Each email is claimed in public.subscription_email_log (0037) before
// it is sent, so Stripe's retries and its several events per change send
// it once. If Resend fails the claim is released, so a later event can
// try again, and the webhook still answers 200: an email never makes
// Stripe resend a payment event.
//
// Same sender as the daily email: RESEND_API_KEY and EMAIL_FROM.

import type Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'SnapGain <noreply@snapgain.uk>';
const SITE_URL = 'https://snapgain.uk';
const FOOTER =
  'SnapGain is a trading name of Denys Ferreira Goncalves de Melo, 3 Union Way, ' +
  'Ambrose House, London NW10 6FH, United Kingdom.';

type Kind = 'premium_welcome' | 'cancellation';

function longDate(ts: number | null | undefined): string | null {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  });
}

function pounds(pence: number | null | undefined): string | null {
  if (typeof pence !== 'number') return null;
  return pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;
}

// deno-lint-ignore no-explicit-any
const item = (sub: Stripe.Subscription) => (sub as any).items?.data?.[0];

function periodEndTs(sub: Stripe.Subscription): number | null {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  const ts = typeof s.current_period_end === 'number' ? s.current_period_end : item(sub)?.current_period_end;
  return typeof ts === 'number' ? ts : null;
}

function layout(title: string, paragraphs: string[]) {
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px;">
<tr><td>
<h1 style="margin:0 0 16px 0;font-size:22px;">${title}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.5;">${p}</p>`).join('\n')}
<p style="margin:24px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">Questions? Email <a href="mailto:support@snapgain.uk">support@snapgain.uk</a>.<br>${FOOTER}</p>
</td></tr></table></td></tr></table></body></html>`;
  const plain = (p: string) => p.replace(/<[^>]+>/g, '').replace(/&rarr;/g, '→').replace(/&amp;/g, '&');
  const text = [title, '', ...paragraphs.map(plain), '', 'Questions? Email support@snapgain.uk.', FOOTER].join('\n');
  return { html, text };
}

export function welcomeEmail(sub: Stripe.Subscription) {
  const price = item(sub)?.price;
  const yearly = price?.recurring?.interval === 'year';
  const amount = pounds(price?.unit_amount) ?? (yearly ? '£60' : '£7.99');
  const next = longDate(periodEndTs(sub));
  const { html, text } = layout('Welcome to SnapGain Premium', [
    `Thank you for subscribing. Your <strong>${yearly ? 'Annual' : 'Monthly'}</strong> plan costs <strong>${amount} a ${yearly ? 'year' : 'month'}</strong> and renews automatically until you cancel.`,
    next ? `Your next payment of ${amount} is due on <strong>${next}</strong>.` : `You will be charged ${amount} at the start of each ${yearly ? 'year' : 'month'}.`,
    `You can cancel online at any time in <a href="${SITE_URL}/settings">Settings &rarr; Manage subscription</a>. Premium then stays on until the end of the period you paid for.`,
    `You have a 14-day right to cancel. If you cancel within 14 days of today, we refund what you paid minus the days you used. See our <a href="${SITE_URL}/refund-policy">Refund Policy</a>.`,
    `Start here: <a href="${SITE_URL}/home">open SnapGain</a>.`,
  ]);
  return { subject: 'Welcome to SnapGain Premium', html, text };
}

export function cancellationEmail(sub: Stripe.Subscription, endedNow: boolean) {
  // deno-lint-ignore no-explicit-any
  const s = sub as any;
  const until = longDate(s.cancel_at ?? periodEndTs(sub));
  const { html, text } = layout('Your SnapGain subscription is cancelled', [
    endedNow || !until
      ? 'Your SnapGain Premium subscription has ended. You will not be charged again.'
      : `Your subscription is cancelled. You keep Premium until <strong>${until}</strong> and will not be charged again.`,
    endedNow || !until
      ? `Changed your mind? You can subscribe again at any time from <a href="${SITE_URL}/pricing">Pricing</a>.`
      : `Changed your mind? You can undo the cancellation before ${until} in <a href="${SITE_URL}/settings">Settings &rarr; Manage subscription</a>.`,
    `If you cancelled within 14 days of subscribing, you can ask for a refund of the days you did not use: email <a href="mailto:support@snapgain.uk">support@snapgain.uk</a>. See our <a href="${SITE_URL}/refund-policy">Refund Policy</a>.`,
  ]);
  return { subject: 'Your SnapGain subscription is cancelled', html, text };
}

/** Send `kind` to this user once. Never throws: a failed email is logged
 *  and its claim released, and the webhook carries on. */
export async function sendOnce(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
  kind: Kind,
  ref: string,
  build: () => { subject: string; html: string; text: string }
) {
  try {
    const claim = await supabase
      .from('subscription_email_log')
      .insert({ user_id: userId, kind, ref })
      .select('id')
      .single();
    if (claim.error) {
      if (claim.error.code === '23505') return; // already sent
      throw claim.error;
    }
    const release = () => supabase.from('subscription_email_log').delete().eq('id', claim.data.id);

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    if (!RESEND_API_KEY || !profile?.email) {
      console.warn('[stripe-webhook] email', kind, 'not sent:', !RESEND_API_KEY ? 'no RESEND_API_KEY' : 'no email');
      await release();
      return;
    }

    const message = build();
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: profile.email, ...message }),
    });
    if (!res.ok) {
      console.error('[stripe-webhook] Resend', res.status, (await res.text()).slice(0, 300));
      await release();
      return;
    }
    const sent = await res.json().catch(() => ({}));
    await supabase.from('subscription_email_log').update({ resend_id: sent?.id ?? null }).eq('id', claim.data.id);
    console.log('[stripe-webhook] email', kind, 'sent for', userId);
  } catch (err) {
    console.error('[stripe-webhook] email', kind, 'failed:', err);
  }
}
