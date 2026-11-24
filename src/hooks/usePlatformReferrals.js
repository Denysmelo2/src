// usePlatformReferrals — reads the `platform` table once per visit and
// hands it to lib/affiliateLinks.js (setPlatformReferrals), the one place
// for referral links and codes (handover "testes reais", 24/11/2026,
// task 2). Returns a number that changes when the rows arrive, for the
// useMemo deps of pages that build "Open X" buttons.
//
// The codes (referral_code/_reward/_note, src 0051) come in a second
// query: before 0051 is applied it fails and only the codes are missing,
// never the links (the 17/11 lesson).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { setPlatformReferrals, referralsVersion } from '@/lib/affiliateLinks';

let loading = null;
const listeners = new Set();

function load() {
  if (loading) return loading;
  loading = (async () => {
    const base = await supabase.from('platform').select('code, slug, name, affiliate_url');
    if (base.error) return;
    const codes = await supabase
      .from('platform')
      .select('code, referral_code, referral_reward, referral_note')
      .not('referral_code', 'is', null);
    const byCode = new Map(codes.error ? [] : (codes.data || []).map((r) => [r.code, r]));
    setPlatformReferrals((base.data || []).map((r) => ({ ...r, ...(byCode.get(r.code) || {}) })));
    for (const fn of listeners) fn(referralsVersion());
  })().catch(() => {});
  return loading;
}

export function usePlatformReferrals() {
  const [version, setVersion] = useState(referralsVersion());
  useEffect(() => {
    listeners.add(setVersion);
    load();
    return () => listeners.delete(setVersion);
  }, []);
  return version;
}
