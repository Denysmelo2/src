// cj-sync — read the advertisers SnapGain has JOINED on CJ Affiliate
// (from CJ's products feed) and add the missing ones to public.stores.
//
// 14/11/2026 (handover, task C). This file now matches what was deployed
// (the products-feed version; the repository still had an older one),
// with three fixes:
//   * callers: only X-Internal-Key: <INTERNAL_SYNC_KEY> or
//     Authorization: Bearer <service role key> (request.ts). The site's
//     publishable key gets 401; on 14/11 an anonymous visitor could run
//     it and it wrote to the database.
//   * offers: never without a rate, and one per store (plan.ts). The
//     products feed has no commission rate, so today no offer is written
//     and the summary says so. Before, each call inserted another row
//     with rate = null.
//   * stores: only NEW slugs are added; existing stores are not changed,
//     and a domain is never taken from a CJ click-tracking link.
//
// IMPORTANT: CJ only returns advertisers you have JOINED at
// https://members.cj.com.
//
// Env (Supabase → Edge Functions → secrets): CJ_PAT, CJ_PUBLISHER_CID,
// INTERNAL_SYNC_KEY; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided.
//
// POST {} — real run. {"dryRun": true}, {"dry_run": true}, ?dry_run=1 —
// read and report only.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAuthorized, wantsDryRun } from './request.ts';
import { CJ_PLATFORM, planOffers, storeDomain } from './plan.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-internal-key, apikey, content-type',
};

const QUERY = `
  query Products($cid: ID!, $offset: Int!, $limit: Int!) {
    products(
      companyId: $cid
      partnerStatus: JOINED
      offset: $offset
      limit: $limit
    ) {
      totalCount
      resultList {
        advertiserId
        advertiserName
        advertiserCountry
        link
        brand
      }
    }
  }
`;

async function fetchPage(pat: string, cid: string, offset: number, limit: number) {
  const res = await fetch('https://ads.api.cj.com/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { cid, offset, limit } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data.products;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const keys = {
    internalKey: Deno.env.get('INTERNAL_SYNC_KEY'),
    serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };
  if (!isAuthorized(req.headers, keys)) return json({ ok: false, error: 'Unauthorized' }, 401);

  const payload = await req.json().catch(() => ({}));
  const dryRun = wantsDryRun(req.url, payload);

  const PAT = Deno.env.get('CJ_PAT');
  const CID = Deno.env.get('CJ_PUBLISHER_CID');
  if (!PAT || !CID) return json({ error: 'Missing CJ_PAT and/or CJ_PUBLISHER_CID' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const summary = {
    dryRun,
    pagesFetched: 0,
    productsScanned: 0,
    uniqueAdvertisers: 0,
    storesAdded: 0,
    storesAlreadyThere: 0,
    offersInserted: 0,
    offersUpdated: 0,
    offersSkippedNoRate: 0,
    offersSkippedNoStore: 0,
    errors: [] as string[],
    hint: '',
  };

  try {
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 50;
    // CJ's products feed has no commission rate, so `rate` stays null and
    // planOffers writes no offer for it. A source with a rate can fill it.
    const seen = new Map<string, { name: string; link: string; rate: number | null }>();

    for (let i = 0; i < MAX_PAGES; i++) {
      const data = await fetchPage(PAT, CID, i * PAGE_SIZE, PAGE_SIZE);
      summary.pagesFetched += 1;
      const list = data.resultList ?? [];
      summary.productsScanned += list.length;
      if (list.length === 0) break;
      for (const p of list) {
        const id = String(p.advertiserId || '').trim();
        if (!id || seen.has(id)) continue;
        seen.set(id, { name: p.advertiserName || '', link: p.link || '', rate: null });
      }
      if (list.length < PAGE_SIZE) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    summary.uniqueAdvertisers = seen.size;

    if (seen.size === 0) {
      summary.hint =
        'No JOINED advertisers found. Join UK advertiser programmes at https://members.cj.com (Advertisers → search → Apply), then run this again.';
      return json({ ok: true, summary });
    }

    const named = [...seen.values()].filter((a) => a.name);
    const slugs = [...new Set(named.map((a) => slugify(a.name)))];
    const CHUNK = 500;

    // Which slugs already exist: those stores are left exactly as they are.
    const slugToId = new Map<string, string>();
    for (let i = 0; i < slugs.length; i += CHUNK) {
      const { data, error } = await supabase.from('stores').select('id, slug').in('slug', slugs.slice(i, i + CHUNK));
      if (error) summary.errors.push(`stores read ${i}: ${error.message}`);
      (data || []).forEach((r: { id: string; slug: string }) => slugToId.set(r.slug, r.id));
    }
    summary.storesAlreadyThere = slugToId.size;

    const newStores = named
      .filter((a, i, all) => !slugToId.has(slugify(a.name)) && all.findIndex((b) => slugify(b.name) === slugify(a.name)) === i)
      .map((a) => ({ slug: slugify(a.name), name: a.name, domain: storeDomain(a.link), is_active: true }));

    if (!dryRun) {
      for (let i = 0; i < newStores.length; i += CHUNK) {
        const chunk = newStores.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('stores')
          .upsert(chunk, { onConflict: 'slug', ignoreDuplicates: true })
          .select('id, slug');
        if (error) summary.errors.push(`stores add ${i}: ${error.message}`);
        (data || []).forEach((r: { id: string; slug: string }) => slugToId.set(r.slug, r.id));
      }
    }
    summary.storesAdded = newStores.length;

    // Each store's current CJ offer, so a run updates it instead of adding one.
    const storeIds = [...new Set([...slugToId.values()])];
    const existing = new Map<string, string>();
    for (let i = 0; i < storeIds.length; i += CHUNK) {
      const { data, error } = await supabase
        .from('cashback_offers')
        .select('id, store_id')
        .eq('platform', CJ_PLATFORM)
        .in('store_id', storeIds.slice(i, i + CHUNK));
      if (error) summary.errors.push(`offers read ${i}: ${error.message}`);
      (data || []).forEach((r: { id: string; store_id: string }) => {
        if (!existing.has(r.store_id)) existing.set(r.store_id, r.id);
      });
    }

    const plan = planOffers(
      named.map((a) => ({ storeId: slugToId.get(slugify(a.name)), link: a.link, rate: a.rate })),
      existing,
      new Date().toISOString()
    );
    summary.offersSkippedNoRate = plan.skippedNoRate;
    summary.offersSkippedNoStore = plan.skippedNoStore;
    if (plan.skippedNoRate && !plan.inserts.length && !plan.updates.length) {
      summary.hint = "CJ's products feed has no commission rate, so no offer was written.";
    }

    if (!dryRun) {
      for (let i = 0; i < plan.inserts.length; i += CHUNK) {
        const rows = plan.inserts.slice(i, i + CHUNK);
        const { error } = await supabase.from('cashback_offers').insert(rows);
        if (error) summary.errors.push(`offers insert ${i}: ${error.message}`);
        else summary.offersInserted += rows.length;
      }
      for (const u of plan.updates) {
        const { id, ...row } = u;
        const { error } = await supabase.from('cashback_offers').update(row).eq('id', id);
        if (error) summary.errors.push(`offer update ${id}: ${error.message}`);
        else summary.offersUpdated += 1;
      }
    } else {
      summary.offersInserted = plan.inserts.length;
      summary.offersUpdated = plan.updates.length;
    }

    return json({ ok: summary.errors.length === 0, wrote: !dryRun, summary });
  } catch (err) {
    return json({ ok: false, error: String(err), summary }, 500);
  }
});
