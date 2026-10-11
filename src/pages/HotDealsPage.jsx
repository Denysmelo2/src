// /hot-deals — Admin-curated featured deals of the day. Every row
// links straight to the destination (platform affiliate URL or the
// store's own page), opening in a new tab — users came here to claim
// the deal, not to read another SnapGain page first.
//
// Optional filter chips by platform and category make the page useful
// once the deal list grows past a single screen.

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft, Filter, ExternalLink, Wallet, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useHotDeals } from '@/hooks/useCatalog';
import { useUserWallet } from '@/hooks/useUserState';
import { useWalletOnlyPref } from '@/hooks/useUserPrefs';
import { buildWalletFilter } from '@/lib/walletFilter';
import { supabase } from '@/lib/customSupabaseClient';
import { hiddenBeforeIso } from '@/lib/dataFreshness';
import { StoreLogo } from '@/components/StoreLogo';
import { FilterChip } from '@/components/FilterChip';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { cn } from '@/lib/utils';

const isExternal = (url) => /^https?:\/\//i.test(url || '');

function HotDealsPage() {
  const { deals, loading } = useHotDeals({ limit: 50 });
  const [activePlatform, setActivePlatform] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  // 2026-05-20: "Show only in wallet" toggle (Bárbara request).
  // Hides any booster whose platform isn't in the user's wallet.
  // Default OFF — most users want to see everything. Persists in
  // user_preferences via useWalletOnlyPref so the toggle remembers.
  const wallet = useUserWallet();
  const { walletOnly, setWalletOnly } = useWalletOnlyPref();
  const walletFilter = useMemo(
    () => buildWalletFilter({ walletOnly, wallet }),
    [walletOnly, wallet]
  );

  // ── Recently boosted (last 7 days) ───────────────────────────────
  // Append-only log fed by triggers on cashback_offers + gift_card_offers
  // (see migration `create_booster_events_tracking`). We pull the
  // most recent 8 'entered_boost' events to surface "freshly hot"
  // deals — usually the most valuable ones because they just landed.
  const [recentBoosts, setRecentBoosts] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('booster_events')
        .select(
          'id, store_id, platform, offer_table, event, old_rate, new_rate, detected_at, store:stores(id, slug, name, category, logo_url, domain, is_active)'
        )
        .eq('event', 'entered_boost')
        .gte('detected_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
        .order('detected_at', { ascending: false })
        .limit(20);
      if (!alive) return;
      if (error) {
        console.warn('[HotDealsPage recentBoosts] error:', error.message);
        return;
      }
      // Dedup by store_id (a store with two platforms boosting → show once)
      const seen = new Set();
      const out = [];
      for (const ev of data || []) {
        if (!ev.store || ev.store.is_active === false) continue;
        if (seen.has(ev.store.id)) continue;
        seen.add(ev.store.id);
        out.push(ev);
        if (out.length >= 8) break;
      }
      setRecentBoosts(out);
    })();
    return () => { alive = false; };
  }, []);

  // ── Boosters grouped by platform ──────────────────────────────────
  // Pull offers flagged is_boosted=true across BOTH cashback_offers
  // (TC/Quidco) AND gift_card_offers (JamDoughnut "Pumped Up").
  // 2026-06-29 (Bárbara): instead of dedup+round-robin into one mixed
  // grid, group by platform so each platform gets its own section.
  // A store boosted on both TC AND Quidco appears in both sections —
  // user wants to see the comparison, not have us pick one for them.
  // valid_to is fetched even though it's null today; the scraper
  // update in PR 2 will populate it and the countdown chip will turn
  // on automatically.
  const [boostersByPlatform, setBoostersByPlatform] = useState({});
  const [boostersLoading, setBoostersLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      const cutoff = hiddenBeforeIso();
      const STORE_SEL =
        'store:stores(id, slug, name, category, logo_url, domain, is_active)';
      const [{ data: cbRows, error: cbErr }, { data: gcRows, error: gcErr }] =
        await Promise.all([
          supabase
            .from('cashback_offers')
            .select(`id, platform, rate, rate_breakdown, affiliate_link, conditions, valid_to, ${STORE_SEL}`)
            .eq('is_active', true)
            .eq('is_boosted', true)
            .gte('last_verified_at', cutoff)
            .order('rate', { ascending: false })
            .limit(200),
          supabase
            .from('gift_card_offers')
            .select(`id, platform, discount_pct, affiliate_link, conditions, valid_to, ${STORE_SEL}`)
            .eq('is_active', true)
            .eq('is_boosted', true)
            .gte('last_verified_at', cutoff)
            .order('discount_pct', { ascending: false })
            .limit(200),
        ]);
      if (!alive) return;
      if (cbErr) console.warn('[HotDealsPage boosters cb] error:', cbErr.message);
      if (gcErr) console.warn('[HotDealsPage boosters gc] error:', gcErr.message);

      const cb = (cbRows || []).map((o) => ({
        ...o,
        kind: 'cashback',
        rateValue: Number(o.rate) || 0,
      }));
      const gc = (gcRows || []).map((o) => ({
        ...o,
        kind: 'gift_card',
        rateValue: Number(o.discount_pct) || 0,
      }));

      // Group by platform. Within each platform, dedup by store (same
      // merchant could have two boosted offers on the same platform —
      // keep the better one).
      const byPlatform = {};
      for (const o of [...cb, ...gc]) {
        if (!o.store || o.store.is_active === false) continue;
        const platform = String(o.platform || 'other');
        if (!byPlatform[platform]) byPlatform[platform] = new Map();
        const bucket = byPlatform[platform];
        const cur = bucket.get(o.store.id);
        if (!cur || o.rateValue > cur.rateValue) bucket.set(o.store.id, o);
      }

      // Materialise each bucket as a sorted array (rate desc).
      const result = {};
      for (const [platform, bucket] of Object.entries(byPlatform)) {
        result[platform] = Array.from(bucket.values()).sort(
          (a, b) => b.rateValue - a.rateValue
        );
      }
      setBoostersByPlatform(result);
      setBoostersLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Wallet filter is applied at RENDER time (not in the fetch) so the
  // toggle is instant — no refetch when the user flips the switch.
  // Null walletFilter = show all (default OR empty wallet).
  // Per-platform variant: filter out entire platform sections the user
  // doesn't have in their wallet (more useful than hiding individual
  // offers from a mixed grid).
  const visibleBoostersByPlatform = useMemo(() => {
    if (!walletFilter?.cashbackPlatformNames) return boostersByPlatform;
    const allowed = new Set(
      walletFilter.cashbackPlatformNames.map((p) => String(p).toLowerCase())
    );
    const filtered = {};
    for (const [platform, offers] of Object.entries(boostersByPlatform)) {
      if (allowed.has(String(platform).toLowerCase())) {
        filtered[platform] = offers;
      }
    }
    return filtered;
  }, [boostersByPlatform, walletFilter]);

  const totalVisibleBoosters = useMemo(
    () => Object.values(visibleBoostersByPlatform).reduce((sum, arr) => sum + arr.length, 0),
    [visibleBoostersByPlatform]
  );

  // Platforms ordered by booster count (most active platform first).
  const orderedPlatforms = useMemo(
    () =>
      Object.entries(visibleBoostersByPlatform)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([p]) => p),
    [visibleBoostersByPlatform]
  );

  const visibleRecentBoosts = useMemo(() => {
    if (!walletFilter?.cashbackPlatformNames) return recentBoosts;
    return recentBoosts.filter((ev) => {
      const platform = String(ev.platform || '').toLowerCase();
      for (const wp of walletFilter.cashbackPlatformNames) {
        if (String(wp).toLowerCase() === platform) return true;
      }
      return false;
    });
  }, [recentBoosts, walletFilter]);

  // Build filter options from the real deal set so we never offer a
  // filter that returns zero results.
  const { platforms, categories } = useMemo(() => {
    const p = new Set();
    const c = new Set();
    deals.forEach((d) => {
      if (d.platform) p.add(d.platform);
      if (d.store?.category) c.add(d.store.category);
    });
    return {
      platforms: Array.from(p).sort(),
      categories: Array.from(c).sort(),
    };
  }, [deals]);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (activePlatform !== 'all' && d.platform !== activePlatform) return false;
      if (activeCategory !== 'all' && d.store?.category !== activeCategory) return false;
      return true;
    });
  }, [deals, activePlatform, activeCategory]);

  return (
    <>
      <Helmet>
        <title>Hot deals — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>

        {/* Title */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-8 h-8 text-secondary" />
            Hot deals today
          </h1>
          <p className="text-muted-foreground mt-1">
            The best offers our team is tracking right now across the
            major UK platforms. Tap a deal to go straight to its claim
            page.
          </p>
        </motion.section>

        {/* Filters */}
        {!loading && deals.length > 0 && (platforms.length > 1 || categories.length > 1) && (
          <Card>
            <CardContent className="py-4 space-y-3">
              {platforms.length > 1 && (
                <FilterRow
                  label="Platform"
                  options={platforms}
                  active={activePlatform}
                  onChange={setActivePlatform}
                />
              )}
              {categories.length > 1 && (
                <FilterRow
                  label="Category"
                  options={categories}
                  active={activeCategory}
                  onChange={setActiveCategory}
                />
              )}
              {(activePlatform !== 'all' || activeCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePlatform('all');
                    setActiveCategory('all');
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}

              {/* "Show only in wallet" toggle (Bárbara 2026-05-20) —
                  filters Block B (boosters) + Recently boosted to only
                  platforms the user actually has in their wallet. */}
              <div className="pt-2 mt-2 border-t flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={walletOnly}
                    onChange={(e) => setWalletOnly(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    Show only platforms in my wallet
                  </span>
                </label>
                {walletOnly && wallet && wallet.length === 0 && (
                  <span className="text-xs text-amber-700">
                    Wallet empty — set platforms in{' '}
                    <Link to="/wallet" className="font-semibold underline">
                      Wallet
                    </Link>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results — admin-curated hot deals + boosted offers */}
        {loading || boostersLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading deals…
            </CardContent>
          </Card>
        ) : filtered.length === 0 && totalVisibleBoosters === 0 && visibleRecentBoosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-2">
              <p>No hot deals featured right now.</p>
              <p className="text-xs">
                Curated boosts appear when our team or the cashback
                platforms run a temporary rate elevation. Check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Block A: admin-curated hot deals */}
            {filtered.length > 0 && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {filtered.length} curated{' '}
                  {filtered.length === 1 ? 'deal' : 'deals'}
                  {(activePlatform !== 'all' || activeCategory !== 'all') &&
                    ` (of ${deals.length})`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filtered.map((deal) => (
                    <HotDealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </>
            )}

            {filtered.length === 0 && deals.length > 0 && (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  No curated deals match your filters.
                </CardContent>
              </Card>
            )}

            {/* NEW Block: "Recently boosted (last 7 days)" — fed by
                booster_events trigger table. Surfaces JUST entered
                boosters so users catch fresh deals first. */}
            {visibleRecentBoosts.length > 0 && (
              <div className="pt-2 space-y-3">
                <div className="pb-2 border-b">
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    Recently boosted ({visibleRecentBoosts.length})
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Activated within the last 7 days — get in before
                    they expire.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {visibleRecentBoosts.map((ev) => (
                    <RecentBoostCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            )}

            {/* Block B: platform-flagged boosters, GROUPED PER PLATFORM
                (2026-06-29 Bárbara — was single mixed grid before).
                Each platform gets its own section so the user can
                compare a store across TC vs Quidco directly. Section
                ordering: most boosters first. Within a section: top
                N by rate desc. valid_to → countdown chip when the
                scraper starts populating it (currently null). */}
            {totalVisibleBoosters > 0 && (
              <div className="pt-2 space-y-8">
                <div className="pb-2 border-b">
                  <h2 className="text-xl font-bold tracking-tight">
                    {totalVisibleBoosters} active booster
                    {totalVisibleBoosters === 1 ? '' : 's'} across{' '}
                    {orderedPlatforms.length} platform
                    {orderedPlatforms.length === 1 ? '' : 's'}
                    {walletOnly && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        (filtered to your wallet)
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Rates temporarily elevated by the platforms themselves.
                    Limited-time — when a countdown is shown, that's when
                    the boost expires on the platform's site.
                  </p>
                </div>

                {orderedPlatforms.map((platform) => {
                  const offers = visibleBoostersByPlatform[platform];
                  const LIMIT = 12;
                  const shown = offers.slice(0, LIMIT);
                  const more = offers.length - shown.length;
                  return (
                    <section key={platform} className="space-y-3">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <h3 className="text-lg font-bold tracking-tight capitalize flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-secondary" />
                          {platform.replace(/-/g, ' ')}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({offers.length} boosted)
                          </span>
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {shown.map((offer, i) => (
                          <OrganicTopDealCard
                            key={offer.id}
                            offer={offer}
                            rank={i + 1}
                          />
                        ))}
                      </div>
                      {more > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {more} more {platform} booster{more === 1 ? '' : 's'} not shown.
                        </p>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function FilterRow({ label, options, active, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        <Filter className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          label="All"
          active={active === 'all'}
          onClick={() => onChange('all')}
        />
        {options.map((opt) => (
          <FilterChip
            key={opt}
            label={String(opt).replace(/_/g, ' ')}
            active={active === opt}
            onClick={() => onChange(opt)}
          />
        ))}
      </div>
    </div>
  );
}

function HotDealCard({ deal }) {
  const href = resolveOpenUrl({
    rowUrl: deal.cta_url,
    platform: deal.platform,
    storeDomain: deal.store?.domain,
    fallback: deal.store?.slug ? `/store/${deal.store.slug}` : null,
  });
  const external = isExternal(href);

  const inner = (
    <Card className="card-hover h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {deal.store ? (
              <StoreLogo store={deal.store} size="sm" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
            )}
            {deal.store?.name && (
              <span className="font-semibold text-sm truncate">
                {deal.store.name}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {deal.badge && (
              <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-light-pink text-secondary">
                {deal.badge}
              </span>
            )}
            {external && (
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        <CardTitle className="text-lg pt-2 leading-tight">
          {deal.title}
        </CardTitle>
        {deal.platform && (
          <CardDescription>via {deal.platform}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {deal.rate_display && (
          <div className="text-xl font-bold gradient-text">
            {deal.rate_display}
          </div>
        )}
        {deal.description && (
          <p className="text-sm text-muted-foreground">{deal.description}</p>
        )}
        {deal.store?.category && (
          <p className="text-xs text-muted-foreground capitalize pt-1">
            {String(deal.store.category).replace(/_/g, ' ')}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return <div>{inner}</div>;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link to={href} className="block">
      {inner}
    </Link>
  );
}

// ─── OrganicTopDealCard ─────────────────────────────────────────────
// Compact card for one of the "Top 10 cashback rates" rows. Sourced
// directly from the cashback_offers table (not the admin-curated
// hot_deals table). Rank badge in the corner; clicking the card opens
// the platform's affiliate link in a new tab.
// ─── RecentBoostCard ────────────────────────────────────────────────
// Card for a freshly-activated boost (booster_events table). Smaller
// than OrganicTopDealCard — it's a "just landed" badge, not a top-10
// position. Shows ↑ icon + the new rate + how recently it landed +
// links to the store page.
function RecentBoostCard({ event }) {
  const store = event.store || {};
  const newRate = Number(event.new_rate) || 0;
  const oldRate = Number(event.old_rate) || 0;
  const delta = newRate - oldRate;
  const ageMs = Date.now() - new Date(event.detected_at).getTime();
  const ageH = Math.floor(ageMs / 3600000);
  const ageD = Math.floor(ageH / 24);
  const ageLabel =
    ageH < 1 ? 'just now' : ageH < 24 ? `${ageH}h ago` : `${ageD}d ago`;
  const href = store.slug ? `/store/${store.slug}` : null;

  const inner = (
    <Card className="card-hover h-full border-secondary/30 bg-secondary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StoreLogo store={store} size="sm" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {store.name || 'Unknown store'}
              </div>
              <div className="text-xs text-muted-foreground">
                via {event.platform}
                {event.offer_table === 'gift_card' ? ' · gift card' : ''}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/20 text-secondary shrink-0 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            New
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold gradient-text leading-none">
            {newRate}%
          </div>
          {oldRate > 0 && delta > 0 && (
            <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{delta.toFixed(1)}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{ageLabel}</span>
      </CardContent>
    </Card>
  );

  if (!href) return <div>{inner}</div>;
  return (
    <Link to={href} className="block h-full">
      {inner}
    </Link>
  );
}

// Render a human countdown to a future timestamp. Returns one of:
//   "Ends in 3d 4h"   (>= 1 day)
//   "Ends in 12h"     (1 hour to 1 day)
//   "Ends in 45m"     (< 1 hour)
//   "Just expired"    (already past)
// Returns null if no validTo passed (so caller can hide the chip).
function formatExpiryCountdown(validTo) {
  if (!validTo) return null;
  const ms = new Date(validTo).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return 'Just expired';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `Ends in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Ends in ${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours - days * 24;
  return remH > 0 ? `Ends in ${days}d ${remH}h` : `Ends in ${days}d`;
}

function OrganicTopDealCard({ offer, rank }) {
  const store = offer.store || {};
  const href = resolveOpenUrl({
    rowUrl: offer.affiliate_link,
    platform: offer.platform,
    storeDomain: store.domain,
    fallback: store.slug ? `/store/${store.slug}` : null,
  });
  const external = isExternal(href);
  const isBest = rank === 1;
  const countdown = formatExpiryCountdown(offer.valid_to);
  // Pulse urgency once we're under 24h. Stays subtle — small chip, no
  // banner animation that would feel like a fire sale.
  const urgent = countdown && /Ends in \d+(m|h)$/.test(countdown);
  // 2026-07-05 (Bárbara): many merchants have different rates per
  // sub-category (Peacocks: New Customer 6.4% vs Existing 3.2%;
  // Hostinger: Horizons 70% / Domain 20% / Hosting 40%). rate_breakdown
  // is a jsonb array like [{name, rate, tag}]. Show up to the first 3
  // sub-rows so the user sees the real picture, not just the headline
  // "up to X%" that hides where the value actually is.
  const breakdown = Array.isArray(offer.rate_breakdown) ? offer.rate_breakdown : [];
  const showBreakdown = breakdown.length > 1;

  const inner = (
    <Card className={cn('card-hover h-full', isBest && 'border-primary/40')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StoreLogo store={store} size="sm" />
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {store.name || 'Unknown store'}
              </div>
              <div className="text-xs text-muted-foreground">
                via {offer.platform}
                {/* 2026-07-05: 'Up to' moved to the big rate number
                    itself so users can't miss it. Only render other
                    conditions here (e.g. minimum spend, category limits). */}
                {offer.conditions && offer.conditions !== 'Up to'
                  ? ` · ${offer.conditions}`
                  : ''}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-foreground/70 shrink-0">
            #{rank}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold gradient-text leading-none">
              {/* When the source platform lists this as "Up to X%" (i.e.
                  only some purchase sub-categories hit X% — see
                  rate_breakdown below), we must prefix the headline so
                  it matches what the platform actually shows. Without
                  this, users saw "80% cashback" for Angel VPN when TC's
                  own page says "Up to 80%" and the base tier is 50%. */}
              {offer.conditions === 'Up to' ? 'Up to ' : ''}
              {offer.rateValue}%
            </div>
            {/* Label by kind so users know whether it's % cashback or
                % off a gift card. */}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {offer.kind === 'gift_card' ? 'off gift card' : 'cashback'}
            </div>
          </div>
          {external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        {countdown && (
          <div
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
              urgent
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-800'
            )}
            title={`Expires ${new Date(offer.valid_to).toLocaleString('en-GB')}`}
          >
            <Clock className="w-3 h-3" />
            {countdown}
          </div>
        )}
        {showBreakdown && (
          <div className="pt-1 border-t border-border/40">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Rate by category
            </div>
            <ul className="space-y-0.5">
              {breakdown.slice(0, 3).map((row, i) => (
                <li key={i} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground truncate flex-1">
                    {row.name || '—'}
                    {row.tag && (
                      <span className="ml-1 inline-block text-[9px] font-semibold uppercase tracking-wider text-secondary">
                        {row.tag}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold shrink-0">
                    {row.rate != null ? `${row.rate}%` : '—'}
                  </span>
                </li>
              ))}
              {breakdown.length > 3 && (
                <li className="text-[10px] text-muted-foreground">
                  + {breakdown.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return <div>{inner}</div>;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  }
  return (
    <Link to={href} className="block h-full">
      {inner}
    </Link>
  );
}

export default HotDealsPage;
