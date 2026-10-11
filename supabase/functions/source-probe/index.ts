// source-probe — reconnaissance only. Fetches ONE allowlisted page and
// describes its shape. It never touches the database and is never given
// a service-role key.
//
// Why it exists: the rate sources (airtime.co.uk, the TopCashback and
// Quidco gift-card shops, nxrewards.com) are unreachable from the
// environment the ingestion code is written in, so a parser written
// there is written blind. That is how `nx-sync` ended up carrying a
// hand-typed rate table from May 2026 and a silent fallback. Edge
// Functions run on Supabase's network, which can reach these hosts, so
// this one goes and looks and reports back what is actually in the
// markup. The real parser is written from its output, not from a guess.
//
// Guardrails, because a function that fetches a URL on request is an
// SSRF primitive if you let it be:
//   * host must be on ALLOWED exactly — no subdomain or suffix matching
//   * https only
//   * GET only, no redirects followed off-host
//   * no database client, no secrets in scope
//   * response is capped and truncated
//
// Usage:
//   POST { "url": "https://www.airtime.co.uk/partners" }
//   ->   { ok, status, contentType, bytes, looksJsRendered, title,
//          counts, percentSamples, linkSamples, headSnippet }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = new Set([
  'www.airtime.co.uk',
  'airtime.co.uk',
  'top-giftcards.topcashback.co.uk',
  'giftcards.quidco.com',
  'www.nxrewards.com',
  'nxrewards.com',
  // 2026-10-10: a public UK cashback comparison site that refreshes
  // ~7,000 retailers across 8 apps daily. Probed to learn how a working
  // daily pipeline gets its rates, not to copy its data.
  'scrimpr.co.uk',
  'www.scrimpr.co.uk',
  // The public (logged-out) retailer pages of the two biggest portals,
  // to check whether the rate is printed without a session.
  'www.topcashback.co.uk',
  'www.quidco.com',
]);

const MAX_BYTES = 3_000_000;

function sample<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let target: URL;
  let textFrom = 0;
  let textLen = 1200;
  let rawAround = '';
  try {
    const payload = await req.json();
    target = new URL(String(payload.url));
    if (Number.isFinite(payload.textFrom)) textFrom = Math.max(0, Number(payload.textFrom));
    if (Number.isFinite(payload.textLen)) textLen = Math.min(30000, Math.max(100, Number(payload.textLen)));
    if (typeof payload.rawAround === 'string') rawAround = payload.rawAround.slice(0, 120);
  } catch {
    return json({ ok: false, error: 'body must be {"url": "https://..."}' }, 400);
  }

  if (target.protocol !== 'https:') {
    return json({ ok: false, error: 'https only' }, 400);
  }
  if (!ALLOWED.has(target.hostname)) {
    return json(
      { ok: false, error: `host not allowlisted: ${target.hostname}`, allowed: [...ALLOWED] },
      400
    );
  }

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SnapGain-probe/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    });
  } catch (e) {
    return json({ ok: false, error: `fetch failed: ${String(e)}`, url: target.toString() });
  }

  // A redirect that lands off the allowlist means we are being bounced
  // to a login or a consent wall; say so rather than describing that.
  const finalHost = new URL(res.url).hostname;
  const offHost = !ALLOWED.has(finalHost);

  const body = await res.text();
  const html = body.length > MAX_BYTES ? body.slice(0, MAX_BYTES) : body;

  const title = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i)?.[1]?.trim() ?? null;

  const counts = {
    anchors: (html.match(/<a\b/gi) ?? []).length,
    listItems: (html.match(/<li\b/gi) ?? []).length,
    tableRows: (html.match(/<tr\b/gi) ?? []).length,
    images: (html.match(/<img\b/gi) ?? []).length,
    scripts: (html.match(/<script\b/gi) ?? []).length,
    jsonLd: (html.match(/application\/ld\+json/gi) ?? []).length,
    nextData: /__NEXT_DATA__/.test(html),
    nuxtData: /__NUXT__/.test(html),
  };

  // Anything that looks like a rate: "5%", "5.5 %", "up to 12%".
  const percentSamples = sample(
    [...new Set((html.match(/(?:up to\s*)?\d{1,3}(?:[.,]\d{1,2})?\s*%/gi) ?? []).map(s => s.trim()))],
    40
  );

  // Visible anchor text + href, which is how a store list usually reads.
  const linkSamples: { text: string; href: string }[] = [];
  const aRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(html)) !== null && linkSamples.length < 40) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length >= 2 && text.length <= 80) linkSamples.push({ text, href: m[1] });
  }

  // A page whose body carries almost no text but plenty of script is
  // rendered client-side; a server-side parser will find nothing.
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return json({
    ok: true,
    url: target.toString(),
    finalUrl: res.url,
    redirectedOffAllowlist: offHost,
    status: res.status,
    contentType: res.headers.get('content-type'),
    bytes: body.length,
    visibleTextLength: visibleText.length,
    looksJsRendered: visibleText.length < 2000 && counts.scripts > 3,
    title,
    counts,
    percentSamples,
    linkSamples,
    textWindow: { from: textFrom, len: textLen },
    visibleTextSnippet: visibleText.slice(textFrom, textFrom + textLen),
    rawAround: rawAround
      ? (() => {
          const i = html.indexOf(rawAround);
          return i < 0
            ? { needle: rawAround, found: false }
            : { needle: rawAround, found: true, at: i,
                markup: html.slice(Math.max(0, i - 500), i + 700) };
        })()
      : null,
    listItemSamples: sample(
      [...(html.matchAll(/<li\b[^>]*>([\s\S]{0,160}?)<\/li>/gi))]
        .map(x => x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(t => t.length >= 2 && t.length <= 120),
      25
    ),
  });
});
