import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Trophy,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RateBreakdown } from '@/components/RateBreakdown';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  useStoreBySlug,
  useStoreOffers,
  useMilesPrograms,
  useCuratedStrategies,
} from '@/hooks/useCatalog';
import { CuratedStrategyCard } from '@/components/CuratedStrategyCard';
import { AutoStrategyCard } from '@/components/AutoStrategyCard';
import { Sparkles } from 'lucide-react';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { useUserFavourites, useUserWallet } from '@/hooks/useUserState';
import { useWalletOnlyPref } from '@/hooks/useUserPrefs';
import { computeStrategies, withSyntheticNxOffer } from '@/lib/strategies';
import { buildWalletFilter } from '@/lib/walletFilter';
import { StoreLogo } from '@/components/StoreLogo';
// The age of a rate used to render here as a flat grey "Verified 144d
// ago" — the same weight as "Verified 2h ago" — via a local copy of a
// fmtTimeAgo helper that two other pages also carried. DataAge is the
// single place that decides how an age reads, and it colours a stale
// one. See lib/dataFreshness.js.
import { DataAge } from '@/components/DataAge';

// 2026-05-18: collapsed from 5 tabs to 2 per Bárbara's UX feedback —
// "as pessoas não gostam de pensar, querem a resposta pronta". The
// Strategies tab now shows curated Pro routes FIRST (marked SnapGain
// Choice) with the auto-generated alternatives directly below, each
// with a descriptive one-word label ("Easier", "Avios only", etc.).
const TABS = [
  { id: 'strategies', label: 'Strategies' },
  { id: 'offers',     label: 'All offers' },
];

const DEFAULT_AMOUNT = 100;

// "Up to" appears when the platform exposes a multi-tier rate (the
// rate column holds the MAX). We show it explicitly so the headline
// doesn't lie: "Up to 56%" sets the expectation that the breakdown
// below may include lower tiers (e.g. SHEIN: 16.8% new customer vs
// 2.4% existing customer — wildly different from the headline).
function CashbackOfferCard({ offer }) {
  const isUpTo = offer.conditions === 'Up to';
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-3xl" aria-hidden="true">💰</span>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-light-pink text-secondary">
            cashback
          </span>
        </div>
        <CardTitle className="text-lg pt-2">{offer.platform}</CardTitle>
        <CardDescription>
          {isUpTo ? `Up to ${offer.rate}% cashback` : `${offer.rate}% cashback`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold gradient-text">
          {isUpTo && <span className="text-base font-medium opacity-70">Up to </span>}
          {offer.rate}%
        </div>

        <RateBreakdown breakdown={offer.rate_breakdown} />

        {/* Rendered unconditionally: an offer with no recorded check
            date used to show nothing here, which read as "fine". */}
        <div>
          <DataAge verifiedAt={offer.last_verified_at} />
        </div>
        {(() => {
          const href = resolveOpenUrl({
            rowUrl: offer.affiliate_link,
            platform: offer.platform,
          });
          if (!href) return null;
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary inline-flex items-center hover:underline"
            >
              Open {offer.platform} <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          );
        })()}
      </CardContent>
    </Card>
  );
}

function PointOfferCard({ offer }) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-3xl" aria-hidden="true">✈️</span>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-light-pink text-secondary">
            points
          </span>
        </div>
        <CardTitle className="text-lg pt-2">{offer.airline}</CardTitle>
        <CardDescription>{offer.earn_rate} points per £1</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold gradient-text">
          {offer.earn_rate} pts/£
        </div>
        {offer.booster_available && (
          <span className="text-xs px-2 py-1 rounded-full bg-light-green text-accent-foreground">
            Booster available
          </span>
        )}
        {/* Rendered unconditionally: an offer with no recorded check
            date used to show nothing here, which read as "fine". */}
        <div>
          <DataAge verifiedAt={offer.last_verified_at} />
        </div>
      </CardContent>
    </Card>
  );
}

function StoreDetailPage() {
  const { storeId: slug } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  const { store, loading: storeLoading } = useStoreBySlug(slug);
  const { cashbackOffers: rawCashbackOffers, pointOffers, giftCardOffers, loading: offersLoading } = useStoreOffers(store?.id);
  const { strategies: curatedStrategies, loading: curatedLoading } = useCuratedStrategies(
    store?.id,
    store?.category || null
  );

  const tabs = TABS;
  // Strategies tab is always the default — it unifies curated Pro
  // routes + auto-generated alternatives in one ranked list.
  const resolvedTab = activeTab ?? 'strategies';
  // Inject synthetic NX 10% offer if the store is flagged in_nx_network
  // but doesn't already have a real NX row in cashback_offers. Keeps
  // the Cashback / Overview tabs consistent with what the strategy
  // engine shows.
  const cashbackOffers = useMemo(
    () => withSyntheticNxOffer(rawCashbackOffers, store),
    [rawCashbackOffers, store]
  );
  const { programs: milesPrograms } = useMilesPrograms();
  const { isFavourite, toggle: toggleFav } = useUserFavourites();
  const wallet = useUserWallet();
  const { walletOnly } = useWalletOnlyPref();
  const userWalletForStrategy = useMemo(
    () => buildWalletFilter({ walletOnly, wallet }),
    [walletOnly, wallet]
  );

  const strategies = useMemo(
    () =>
      computeStrategies({
        store,
        amount: DEFAULT_AMOUNT,
        cashbackOffers,
        pointOffers,
        giftCardOffers,
        milesPrograms,
        userWallet: userWalletForStrategy,
      }),
    [store, cashbackOffers, pointOffers, giftCardOffers, milesPrograms, userWalletForStrategy]
  );

  // (bestStrategy was previously used by the standalone "Best strategy"
  // tab; that tab was folded into Strategies in 2026-05-18 refactor.)

  if (storeLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading store…</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold">Store not found</h1>
        <p className="text-muted-foreground">
          We don&rsquo;t have rewards mapped for &ldquo;{slug}&rdquo; yet.
        </p>
        <Button asChild>
          <Link to="/search">Browse stores</Link>
        </Button>
      </div>
    );
  }

  const renderTabBody = () => {
    if (offersLoading || curatedLoading) {
      return <p className="text-muted-foreground">Loading offers…</p>;
    }
    switch (resolvedTab) {
      // ── STRATEGIES TAB (default) ─────────────────────────────────
      // Curated Pro routes first (SnapGain Choice), then auto-generated
      // alternatives each with a descriptive label. One single ranked
      // list — no need to bounce between tabs.
      case 'strategies': {
        const haveAnything = curatedStrategies.length > 0 || strategies.length > 0;
        if (!haveAnything) {
          return (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                We don&rsquo;t have any reward routes for {store.name} yet.
                Check back soon.
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-5">
            {/* Top curated strategy = SnapGain Choice. Stays collapsed
                by default so the page doesn't feel overwhelming; the
                user taps "Show steps" when they're ready to execute. */}
            {curatedStrategies[0] && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                  SnapGain Choice — best return
                </div>
                <CuratedStrategyCard
                  strategy={curatedStrategies[0]}
                  defaultOpen={false}
                />
              </div>
            )}

            {/* Other curated strategies (if any) — collapsed, compact. */}
            {curatedStrategies.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Other curated strategies
                </div>
                {curatedStrategies.slice(1).map((s) => (
                  <CuratedStrategyCard
                    key={s.id}
                    strategy={s}
                    defaultOpen={false}
                    compact
                  />
                ))}
              </div>
            )}

            {/* Auto-generated single-platform alternatives. Each gets
                a one-word label ("Easier", "Avios only", etc.) so the
                user can scan without thinking. Hidden when curated
                cover everything reasonable. */}
            {strategies.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Single-platform alternatives (on £{DEFAULT_AMOUNT})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {strategies.slice(0, 6).map((s, i) => (
                    <AutoStrategyCard
                      key={s.id || i}
                      strategy={s}
                      rank={i + 1}
                      storeSlug={store.slug}
                      amount={DEFAULT_AMOUNT}
                      highlight={i === 0 && curatedStrategies.length === 0}
                    />
                  ))}
                </div>
                {strategies.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    {strategies.length - 6} more routes available —{' '}
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/compare?store=${encodeURIComponent(store.slug)}`
                        )
                      }
                      className="text-primary font-semibold hover:underline"
                    >
                      run full comparison
                    </button>
                    {' '}with your own amount.
                  </p>
                )}
              </div>
            )}

            <Card className="bg-light-green/30 border-accent/30">
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">
                    Got a specific basket in mind?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Run the comparison with your real purchase amount.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    navigate(`/compare?store=${encodeURIComponent(store.slug)}`)
                  }
                  size="sm"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Compare with your amount
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      }

      // ── ALL OFFERS TAB ───────────────────────────────────────────
      // Cashback + points + gift cards in one flat list. Used by power
      // users who want to inspect raw data. Default users live entirely
      // in the Strategies tab.
      case 'offers':
      default: {
        const totalOffers =
          cashbackOffers.length + pointOffers.length;
        if (totalOffers === 0) {
          return (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No offers tracked for {store.name} yet.
              </CardContent>
            </Card>
          );
        }
        return (
          <div className="space-y-6">
            {cashbackOffers.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Cashback ({cashbackOffers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cashbackOffers.map((o) => (
                    <CashbackOfferCard key={o.id} offer={o} />
                  ))}
                </div>
              </div>
            )}
            {pointOffers.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Points & Miles ({pointOffers.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pointOffers.map((o) => (
                    <PointOfferCard key={o.id} offer={o} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  const fav = isFavourite(store.id);

  return (
    <>
      <Helmet>
        <title>{store.name} — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to="/search"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          All stores
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <StoreLogo store={store} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {store.name}
              </h1>
              <button
                onClick={() => toggleFav(store.id)}
                aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                className="text-secondary"
                type="button"
              >
                <Star
                  className={`w-6 h-6 ${
                    fav ? 'fill-secondary' : 'opacity-40 hover:opacity-100'
                  }`}
                />
              </button>
            </div>
            <p className="text-muted-foreground">
              Compare cashback, points, and gift card routes for {store.name}.
            </p>
          </div>
          <Button
            onClick={() =>
              navigate(`/compare?store=${encodeURIComponent(store.slug)}`)
            }
            size="lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            Compare rewards
          </Button>
        </motion.section>

        <div className="border-b">
          <nav
            className="-mb-px flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Store reward categories"
          >
            {tabs.map((tab) => {
              const active = resolvedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={active}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div role="tabpanel">{renderTabBody()}</div>
      </div>
    </>
  );
}

export default StoreDetailPage;
