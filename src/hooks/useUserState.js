import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { bestUserCard } from '@/lib/cardEarn';

/**
 * useRecentSearches — user's last 10 search queries from public.recent_searches.
 */
export function useRecentSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSearches([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('recent_searches')
      .select('id, query, searched_at')
      .order('searched_at', { ascending: false })
      .limit(10);
    setSearches(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const push = useCallback(
    async (query) => {
      const q = (query || '').trim();
      if (!q || !user) return;
      // Replace any existing same-query row so the new one bubbles to the top
      await supabase.from('recent_searches').delete().eq('query', q);
      await supabase.from('recent_searches').insert({ user_id: user.id, query: q });
      await refresh();
    },
    [user, refresh]
  );

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from('recent_searches').delete().eq('user_id', user.id);
    setSearches([]);
  }, [user]);

  return { searches, loading, push, clear };
}

/**
 * useSavedStrategies — user's saved comparison routes from public.saved_strategies.
 * Each row joins to the related store + platform for display.
 */
export function useSavedStrategies() {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  const STRATEGY_SELECT = `
    id, store_id, platform_id, amount, nickname, notes, created_at,
    store:stores(slug, name, logo_url),
    platform:platform(slug, code, name, type)
  `;

  const refresh = useCallback(async () => {
    if (!user) {
      setStrategies([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('saved_strategies')
      .select(STRATEGY_SELECT)
      .order('created_at', { ascending: false });
    setStrategies(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async ({ storeId, platformId, amount, nickname, notes }) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('saved_strategies')
        .insert({
          user_id: user.id,
          store_id: storeId || null,
          platform_id: platformId || null,
          amount: amount ? Number(amount) : null,
          nickname: nickname || null,
          notes: notes || null,
        })
        .select(STRATEGY_SELECT)
        .single();
      if (error) throw error;
      setStrategies((prev) => [data, ...prev]);
      return data;
    },
    [user]
  );

  // For the free-plan cap (3 saved): consumers can read this and decide.
  const FREE_SAVED_CAP = 3;
  const reachedFreeCap = strategies.length >= FREE_SAVED_CAP;

  const remove = useCallback(async (id) => {
    await supabase.from('saved_strategies').delete().eq('id', id);
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clear = useCallback(async () => {
    if (!user) return;
    await supabase.from('saved_strategies').delete().eq('user_id', user.id);
    setStrategies([]);
  }, [user]);

  return { strategies, loading, save, remove, clear, reachedFreeCap, FREE_SAVED_CAP };
}

/**
 * useUserFavourites — composite (user_id, store_id) join on public.user_favourites.
 */
export function useUserFavourites() {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFavourites([]);
      setLoading(false);
      return;
    }
    let alive = true;
    supabase
      .from('user_favourites')
      .select('store_id, created_at, store:stores(slug, name, logo_url)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[useUserFavourites] error:', error.message);
        setFavourites(data || []);
        setLoading(false);
      }, (err) => {
        if (!alive) return;
        console.warn('[useUserFavourites] unexpected error:', err);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (storeId) => {
      if (!user || !storeId) return;
      const exists = favourites.some((f) => f.store_id === storeId);
      if (exists) {
        await supabase.from('user_favourites').delete().eq('store_id', storeId);
        setFavourites((prev) => prev.filter((f) => f.store_id !== storeId));
      } else {
        const { data } = await supabase
          .from('user_favourites')
          .insert({ user_id: user.id, store_id: storeId })
          .select('store_id, created_at, store:stores(slug, name, logo_url)')
          .single();
        if (data) setFavourites((prev) => [data, ...prev]);
      }
    },
    [user, favourites]
  );

  const isFavourite = useCallback((storeId) => favourites.some((f) => f.store_id === storeId), [favourites]);

  return { favourites, loading, toggle, isFavourite };
}

/**
 * useUserWallet — the user's owned cards + miles programs + cashback platforms,
 * each with metadata and balance. Drives personalised comparison filtering.
 */
export function useUserWallet() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [milesPrograms, setMilesPrograms] = useState([]);
  const [cashbackPlatforms, setCashbackPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCards([]);
      setMilesPrograms([]);
      setCashbackPlatforms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cardsRes, milesRes, cashbackRes] = await Promise.all([
        supabase
          .from('user_cards')
          .select('id, card_provider, nickname, last_4, is_active, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_miles_programs')
          .select(
            'id, miles_program_id, balance, account_number, is_active, created_at, miles_program:miles_programs(slug, name, conversion_rate)'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_cashback_platforms')
          .select(
            'id, platform_id, balance, is_active, created_at, platform:platform(code, slug, name, type)'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
      ]);
      setCards(cardsRes.data || []);
      setMilesPrograms(milesRes.data || []);
      setCashbackPlatforms(cashbackRes.data || []);
    } catch (err) {
      console.warn('[useUserWallet] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ─── Cards ────────────────────────────────────────────────────────────
  const addCard = useCallback(
    async ({ cardProvider, nickname, last4 }) => {
      if (!user || !cardProvider) return null;
      const { data, error } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id,
          card_provider: cardProvider,
          nickname: nickname || null,
          last_4: last4 || null,
          is_active: true,
        })
        .select('id, card_provider, nickname, last_4, is_active, created_at')
        .single();
      if (error) throw error;
      setCards((prev) => [...prev, data]);
      return data;
    },
    [user]
  );

  const removeCard = useCallback(async (id) => {
    await supabase.from('user_cards').delete().eq('id', id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ─── Miles programs ───────────────────────────────────────────────────
  const addMilesProgram = useCallback(
    async ({ milesProgramId, balance, accountNumber }) => {
      if (!user || !milesProgramId) return null;
      const { data, error } = await supabase
        .from('user_miles_programs')
        .insert({
          user_id: user.id,
          miles_program_id: milesProgramId,
          balance: balance != null ? Number(balance) : 0,
          account_number: accountNumber || null,
          is_active: true,
        })
        .select(
          'id, miles_program_id, balance, account_number, is_active, created_at, miles_program:miles_programs(slug, name, conversion_rate)'
        )
        .single();
      if (error) throw error;
      setMilesPrograms((prev) => [...prev, data]);
      return data;
    },
    [user]
  );

  const removeMilesProgram = useCallback(async (id) => {
    await supabase.from('user_miles_programs').delete().eq('id', id);
    setMilesPrograms((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateMilesBalance = useCallback(async (id, balance) => {
    const num = Number(balance) || 0;
    await supabase.from('user_miles_programs').update({ balance: num }).eq('id', id);
    setMilesPrograms((prev) => prev.map((m) => (m.id === id ? { ...m, balance: num } : m)));
  }, []);

  // ─── Cashback platforms ───────────────────────────────────────────────
  const addCashbackPlatform = useCallback(
    async ({ platformId, balance }) => {
      if (!user || !platformId) return null;
      const { data, error } = await supabase
        .from('user_cashback_platforms')
        .insert({
          user_id: user.id,
          platform_id: platformId,
          balance: balance != null ? Number(balance) : 0,
          is_active: true,
        })
        .select(
          'id, platform_id, balance, is_active, created_at, platform:platform(code, slug, name, type)'
        )
        .single();
      if (error) throw error;
      setCashbackPlatforms((prev) => [...prev, data]);
      return data;
    },
    [user]
  );

  const removeCashbackPlatform = useCallback(async (id) => {
    await supabase.from('user_cashback_platforms').delete().eq('id', id);
    setCashbackPlatforms((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCashbackBalance = useCallback(async (id, balance) => {
    const num = Number(balance) || 0;
    await supabase.from('user_cashback_platforms').update({ balance: num }).eq('id', id);
    setCashbackPlatforms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, balance: num } : c))
    );
  }, []);

  // Helpers for the strategy filter
  const cashbackPlatformNames = new Set(
    cashbackPlatforms.map((c) => c.platform?.name).filter(Boolean)
  );
  const milesProgramNames = new Set(
    milesPrograms.map((m) => m.miles_program?.name).filter(Boolean)
  );
  const isEmpty =
    cards.length === 0 && milesPrograms.length === 0 && cashbackPlatforms.length === 0;

  return {
    cards,
    milesPrograms,
    cashbackPlatforms,
    loading,
    isEmpty,
    cashbackPlatformNames,
    milesProgramNames,
    addCard,
    removeCard,
    addMilesProgram,
    removeMilesProgram,
    updateMilesBalance,
    addCashbackPlatform,
    removeCashbackPlatform,
    updateCashbackBalance,
    refresh,
  };
}

/**
 * useBestCard — the best card the user saved, valued from platform rows
 * (card_earn_rate / card_earn_unit / card_point_value_gbp, src 0047), or
 * null. Owner's tests 21/11/2026, A2: that card's earnings go inside the
 * /compare totals (lib/cardEarn.js). Read on its own query: before 0047
 * is applied the columns are missing, the read fails and only this
 * feature goes off (the rest of the page never depends on it).
 */
export function useBestCard(cards) {
  const [card, setCard] = useState(null);
  const codes = (cards || []).map((c) => c.card_provider).filter(Boolean);
  const key = codes.join('|');
  useEffect(() => {
    let alive = true;
    if (!codes.length) {
      setCard(null);
      return undefined;
    }
    (async () => {
      const { data, error } = await supabase
        .from('platform')
        .select('code, name, card_earn_rate, card_earn_unit, card_point_value_gbp')
        .eq('type', 'card')
        .in('code', codes);
      if (!alive) return;
      if (error) {
        setCard(null);
        return;
      }
      setCard(bestUserCard(cards, data || []));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return card;
}
