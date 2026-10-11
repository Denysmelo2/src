import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * useStores — list of UK retailers from public.stores.
 * @param {{ featuredOnly?: boolean }} [opts]
 */
export function useStores({ featuredOnly = false } = {}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // The stores table has 11K+ rows but PostgREST has a hard server-
    // side cap of 1000 per request that .range() can't override (the
    // Supabase default `db-max-rows` is 1000). Paginate manually until
    // we've drained the catalogue or the page returns < pageSize.
    // 2026-05-19: switched from single .range() (which was silently
    // truncating profile search past letter B) to true pagination.
    const PAGE_SIZE = 1000;
    const fetchAll = async () => {
      const all = [];
      let from = 0;
      while (true) {
        let q = supabase
          .from('stores')
          .select('id, slug, name, category, is_featured, logo_url, domain, in_nx_network')
          .eq('is_active', true)
          .order('name')
          .range(from, from + PAGE_SIZE - 1);
        if (featuredOnly) q = q.eq('is_featured', true);
        const { data, error } = await q;
        if (error) {
          if (alive) setError(error);
          break;
        }
        if (!data?.length) break;
        all.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      if (alive) {
        setStores(all);
        setLoading(false);
      }
    };
    fetchAll().catch((err) => {
      if (!alive) return;
      console.warn('[useStores] unexpected error:', err);
      setError(err);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [featuredOnly]);

  return { stores, loading, error };
}

/**
 * useStoreSearch — server-side search across the full stores catalogue.
 *
 * The plain `useStores()` above can only see the first ~1000 rows
 * because Supabase / PostgREST caps responses regardless of the
 * `.range()` we pass. That broke search for everything past "B".
 *
 * This hook ALWAYS asks Postgres to filter via ILIKE, so even Tesco
 * (alphabetically late in a 10K catalogue) is reachable. Returns
 * featured stores when the query is empty.
 *
 * @param {string} query           the typed search term ('' = featured)
 * @param {{ limit?: number }} [opts]
 */
export function useStoreSearch(query, { limit = 24, startsWith = false } = {}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMatching, setTotalMatching] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = String(query || '').trim();

    const fetch = async () => {
      // No search → featured stores. Use head:true count query then a
      // capped result so we can display "X featured of 10K total".
      if (q.length === 0) {
        const { data, error } = await supabase
          .from('stores')
          .select('id, slug, name, category, is_featured, logo_url, domain, in_nx_network')
          .eq('is_active', true)
          .eq('is_featured', true)
          .order('name')
          .limit(limit);
        if (!alive) return;
        if (error) console.warn('[useStoreSearch featured]', error.message);
        setStores(data || []);
        setTotalMatching(data?.length || 0);
        setLoading(false);
        return;
      }

      // With search: case-insensitive ILIKE on name. `startsWith=true`
      // forces a prefix match ("sain" → "Sainsbury's" ✓, NOT
      // "All Saints"), which is the right UX for an autocomplete
      // dropdown. `startsWith=false` keeps the fuzzy %X% behaviour
      // used by the Search page where mid-string matches are useful
      // ("tesco" finds "Tesco Travel Insurance" too).
      // `escaped` makes %_\ literal so users can't accidentally inject
      // SQL wildcards from the search box.
      const escaped = q.replace(/[%_\\]/g, (c) => `\\${c}`);
      const pattern = startsWith ? `${escaped}%` : `%${escaped}%`;
      const [{ data, error }, { count, error: countErr }] = await Promise.all([
        supabase
          .from('stores')
          .select('id, slug, name, category, is_featured, logo_url, domain, in_nx_network')
          .eq('is_active', true)
          .ilike('name', pattern)
          .order('name')
          .limit(limit),
        supabase
          .from('stores')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .ilike('name', pattern),
      ]);
      if (!alive) return;
      if (error) console.warn('[useStoreSearch results]', error.message);
      if (countErr) console.warn('[useStoreSearch count]', countErr.message);
      setStores(data || []);
      setTotalMatching(count || 0);
      setLoading(false);
    };

    fetch();
    return () => {
      alive = false;
    };
  }, [query, limit, startsWith]);

  return { stores, loading, totalMatching };
}

/**
 * useStoreBySlug — single store row matched by slug.
 */
export function useStoreBySlug(slug) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setStore(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from('stores')
      .select('id, slug, name, category, is_featured, logo_url, domain, in_nx_network')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error);
        else setStore(data);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return { store, loading, error };
}

/**
 * useStoreOffers — cashback + point + gift card offers for a store,
 * with Realtime updates on all three tables.
 */
export function useStoreOffers(storeId) {
  const [cashbackOffers, setCashbackOffers] = useState([]);
  const [pointOffers, setPointOffers] = useState([]);
  const [giftCardOffers, setGiftCardOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!storeId) {
      setCashbackOffers([]);
      setPointOffers([]);
      setGiftCardOffers([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);

    const fetchAll = () =>
      Promise.all([
        supabase
          .from('cashback_offers')
          .select('id, store_id, platform, rate, rate_breakdown, affiliate_link, conditions, last_verified_at, is_active')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('rate', { ascending: false }),
        supabase
          .from('point_offers')
          .select('id, store_id, airline, earn_rate, affiliate_link, booster_available, conditions, last_verified_at, is_active')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('earn_rate', { ascending: false }),
        supabase
          .from('gift_card_offers')
          .select('id, store_id, platform, discount_pct, affiliate_link, conditions, last_verified_at, is_active')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('discount_pct', { ascending: false }),
      ]);

    const apply = ([cbRes, ptRes, gcRes]) => {
      if (!alive) return;
      if (cbRes.error) setError(cbRes.error);
      else setCashbackOffers(cbRes.data || []);
      if (ptRes.error) setError(ptRes.error);
      else setPointOffers(ptRes.data || []);
      if (gcRes.error) setError(gcRes.error);
      else setGiftCardOffers(gcRes.data || []);
      setLoading(false);
    };

    fetchAll().then(apply);

    // Realtime: refetch on any change to this store's rows on any of the three offer tables
    const refresh = () => fetchAll().then(apply);
    const channel = supabase
      .channel(`store_offers:${storeId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashback_offers',  filter: `store_id=eq.${storeId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_offers',     filter: `store_id=eq.${storeId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_card_offers', filter: `store_id=eq.${storeId}` }, refresh)
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return { cashbackOffers, pointOffers, giftCardOffers, loading, error };
}

/**
 * useCuratedStrategies — multi-step "Pro Strategies" curated from
 * Bárbara's playbook (ebook). These are the marquee multi-platform
 * routes (e.g. "Buy a Sainsbury's gift card on EverUp → open Sainsbury's
 * from the Avios eStore → pay with the gift card → scan Nectar").
 *
 * Targeting model:
 *   - target_store_id            — primary store the strategy is for
 *   - applicable_store_ids[]     — extra stores it also works at
 *   - applicable_categories[]    — whole categories (text[] match)
 *
 * Pass `storeId` and (optionally) the store's category array. The
 * hook returns curated strategies sorted by hero_return_pct desc.
 *
 * `playbook_only = true` strategies (Ribbon, Revolut Ultra, etc.) are
 * NEVER returned here — they only show in /playbook. They wouldn't
 * make sense as the answer to "best deal at Tesco?".
 */
export function useCuratedStrategies(storeId, storeCategories = null) {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) {
      setStrategies([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);

    const cats = Array.isArray(storeCategories)
      ? storeCategories.filter(Boolean)
      : storeCategories
      ? [storeCategories]
      : [];

    // PostgREST OR filter: target_store_id = X
    //   OR applicable_store_ids contains X
    //   OR applicable_categories overlaps store.category[]
    // .cs.{...} = contains; .ov.{...} = overlap (array operators).
    const filters = [
      `target_store_id.eq.${storeId}`,
      `applicable_store_ids.cs.{${storeId}}`,
    ];
    if (cats.length > 0) {
      // Quote each value safely. Categories don't contain commas in our data.
      const wrap = cats.map((c) => `"${c}"`).join(',');
      filters.push(`applicable_categories.ov.{${wrap}}`);
    }

    supabase
      .from('curated_strategies')
      .select(
        'id, slug, title, description, hero_return_pct, hero_return_label, bonus_points, bonus_points_program, difficulty, category, tags, target_store_id, applicable_store_ids, applicable_categories, steps, is_premium, playbook_only, display_order'
      )
      .eq('is_active', true)
      .eq('playbook_only', false)
      .or(filters.join(','))
      .order('hero_return_pct', { ascending: false, nullsFirst: false })
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[useCuratedStrategies] error:', error.message);
        setStrategies(data || []);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [storeId, JSON.stringify(storeCategories || null)]);

  return { strategies, loading };
}

/**
 * useCuratedPlaybook — the full playbook catalog for /playbook.
 * Includes lifestyle strategies (Ribbon, Revolut Ultra, Monzo+PayPoint,
 * Fuel) that are NOT tied to a single store but are valuable on their
 * own. Returns ALL active strategies, sorted by category then by
 * display_order.
 */
export function useCuratedPlaybook() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from('curated_strategies')
      .select(
        'id, slug, title, description, hero_return_pct, hero_return_label, bonus_points, bonus_points_program, difficulty, category, tags, target_store_id, applicable_store_ids, steps, is_premium, playbook_only, display_order'
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[useCuratedPlaybook] error:', error.message);
        setStrategies(data || []);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { strategies, loading };
}

/**
 * usePlatformsExplained — editorial descriptions of every cashback /
 * loyalty / bank platform we support, used by `/learn/platforms`.
 *
 * Powered by `public.platforms_explained` (RLS read-only).
 */
export function usePlatformsExplained() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from('platforms_explained')
      .select(
        'id, slug, name, category, one_liner, description, typical_rate_label, difficulty, pros, cons, signup_url, homepage_url, logo_url, brand_color, payout_method, min_payout, approval_window, tags, is_featured, display_order, pricing_tiers'
      )
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[usePlatformsExplained] error:', error.message);
        setPlatforms(data || []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return { platforms, loading };
}

/**
 * useMilesPrograms — all active airline / loyalty programs (with conversion_rate).
 */
export function useMilesPrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from('miles_programs')
      .select('id, slug, name, conversion_rate, booster_url, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[useMilesPrograms] error:', error.message);
        setPrograms(data || []);
        setLoading(false);
      }, (err) => {
        if (!alive) return;
        console.warn('[useMilesPrograms] unexpected error:', err);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { programs, loading };
}

/**
 * useHotDeals — admin-curated featured deals from public.hot_deals,
 * filtered server-side to currently-active items in their valid window
 * via the public-read RLS policy. Live updates via Realtime.
 */
export function useHotDeals({ limit = 8 } = {}) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchAll = () =>
      supabase
        .from('hot_deals')
        .select(
          'id, title, description, platform, badge, rate_display, cta_url, rank, valid_from, valid_to, store:stores(id, slug, name, category, domain, logo_url)'
        )
        .order('rank', { ascending: true })
        .limit(limit);

    fetchAll().then(({ data }) => {
      if (!alive) return;
      setDeals(data || []);
      setLoading(false);
    });

    // Realtime: refetch on any change to hot_deals
    const channel = supabase
      .channel(`hot_deals:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hot_deals' }, () => {
        fetchAll().then(({ data }) => {
          if (!alive) return;
          setDeals(data || []);
        });
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { deals, loading };
}

/**
 * useAdminHotDeals — full CRUD on the hot_deals table for admins.
 * Admins see ALL rows (including scheduled / inactive) thanks to the
 * `hot_deals_admin_read` RLS policy plus the public-read policy.
 */
export function useAdminHotDeals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from('hot_deals')
      .select(
        'id, title, description, store_id, platform, badge, rate_display, cta_url, rank, valid_from, valid_to, is_active, created_at, updated_at, store:stores(id, slug, name)'
      )
      .order('rank', { ascending: true });
    setDeals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('hot_deals')
      .insert(payload)
      .select(
        'id, title, description, store_id, platform, badge, rate_display, cta_url, rank, valid_from, valid_to, is_active, created_at, updated_at, store:stores(id, slug, name)'
      )
      .single();
    if (error) throw error;
    setDeals((prev) => [...prev, data].sort((a, b) => a.rank - b.rank));
    return data;
  };

  const update = async (id, patch) => {
    const { data, error } = await supabase
      .from('hot_deals')
      .update(patch)
      .eq('id', id)
      .select(
        'id, title, description, store_id, platform, badge, rate_display, cta_url, rank, valid_from, valid_to, is_active, created_at, updated_at, store:stores(id, slug, name)'
      )
      .single();
    if (error) throw error;
    setDeals((prev) => prev.map((d) => (d.id === id ? data : d)).sort((a, b) => a.rank - b.rank));
    return data;
  };

  const remove = async (id) => {
    await supabase.from('hot_deals').delete().eq('id', id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  return { deals, loading, refresh, create, update, remove };
}

/**
 * usePlatforms — all active reward providers, optionally filtered by type.
 * @param {{ type?: 'cashback'|'gift_card'|'card'|'bank_offer' }} [opts]
 */
export function usePlatforms({ type } = {}) {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let q = supabase
      .from('platform')
      .select('id, code, slug, name, type, base_rate_display, notes, is_active')
      .eq('is_active', true)
      .order('name');
    if (type) q = q.eq('type', type);
    q.then(({ data, error }) => {
      if (!alive) return;
      if (error) console.warn('[usePlatforms] error:', error.message);
      setPlatforms(data || []);
      setLoading(false);
    }, (err) => {
      if (!alive) return;
      console.warn('[usePlatforms] unexpected error:', err);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [type]);

  return { platforms, loading };
}
