// plan.ts — what cj-sync may write (handover 14/11/2026, task C).
//
// On 14/11 each call of cj-sync INSERTED a new cashback offer with
// rate = null and the link of one product (Coffee Friend): two calls,
// two rows. Now:
//   * no rate, no offer. CJ's products feed (the one the function reads)
//     carries no commission rate, so in practice no offer is written and
//     the summary says why;
//   * one offer per store for platform "CJ Affiliate": an existing row is
//     updated, never duplicated (there is no unique index on
//     store_id + platform, so the function checks first);
//   * a store's domain never comes from a CJ click-tracking host
//     (anrdoezrs.net, dpbolvw.net, …), which is what product links use.
//
// No imports, so plain Node can test it (tests/cjSyncPlan.test.js).

export const CJ_PLATFORM = 'CJ Affiliate';

// CJ's click-tracking domains: a product link's host, never the shop's.
const CJ_CLICK_HOSTS = [
  'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com', 'tkqlhce.com',
  'emjcd.com', 'qksrv.net', 'ftjcfx.com', 'lduhtrp.net', 'afcyhf.com',
  'awltovhc.com', 'tqlkg.com', 'apmebf.com', 'cj.com', 'cj.dotomi.com',
];

/** The shop's domain from a link, or null for CJ tracking links. */
export function storeDomain(link: string | null | undefined): string | null {
  if (!link) return null;
  let host: string;
  try {
    host = new URL(link).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  if (CJ_CLICK_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return null;
  return host || null;
}

/** A usable cashback rate (a positive number up to 100), or null. */
export function usableRate(rate: unknown): number | null {
  const n = typeof rate === 'string' ? Number(rate.replace('%', '').trim()) : Number(rate);
  if (rate === null || rate === undefined || rate === '' || !Number.isFinite(n)) return null;
  return n > 0 && n <= 100 ? n : null;
}

type Candidate = { storeId: string | undefined; link: string | null | undefined; rate: unknown };
type Plan = {
  inserts: { store_id: string; platform: string; rate: number; affiliate_link: string | null; last_verified_at: string; is_active: boolean }[];
  updates: { id: string; rate: number; affiliate_link: string | null; last_verified_at: string; is_active: boolean }[];
  skippedNoRate: number;
  skippedNoStore: number;
};

/**
 * Rows to insert and update. `existing` maps store_id to the id of that
 * store's current "CJ Affiliate" offer (active or not).
 */
export function planOffers(candidates: Candidate[], existing: Map<string, string>, now: string): Plan {
  const plan: Plan = { inserts: [], updates: [], skippedNoRate: 0, skippedNoStore: 0 };
  const seen = new Set<string>();
  for (const c of candidates) {
    if (!c.storeId) {
      plan.skippedNoStore++;
      continue;
    }
    const rate = usableRate(c.rate);
    if (rate === null) {
      plan.skippedNoRate++;
      continue;
    }
    if (seen.has(c.storeId)) continue;
    seen.add(c.storeId);
    const row = { rate, affiliate_link: c.link || null, last_verified_at: now, is_active: true };
    const id = existing.get(c.storeId);
    if (id) plan.updates.push({ id, ...row });
    else plan.inserts.push({ store_id: c.storeId, platform: CJ_PLATFORM, ...row });
  }
  return plan;
}
