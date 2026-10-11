import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Trophy,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import {
  useStoreBySlug,
  useStoreOffers,
  useMilesPrograms,
  useCuratedStrategies,
} from '@/hooks/useCatalog';
import { CuratedStrategyCard } from '@/components/CuratedStrategyCard';
import { useSavedStrategies, useUserWallet } from '@/hooks/useUserState';
import { useWalletOnlyPref } from '@/hooks/useUserPrefs';
import { useSubscription } from '@/hooks/useSubscription';
import { computeStrategies, buildStrategySteps } from '@/lib/strategies';
import { buildWalletFilter } from '@/lib/walletFilter';
import { RateBreakdown } from '@/components/RateBreakdown';
import { gbpToAviosBooster } from '@/lib/aviosMath';
// This page used to print the age with its own copy of a fmtTimeAgo
// helper, in flat grey, and only when the strategy carried a top-level
// lastVerifiedAt — which a STACK never does, so the one route built
// from two possibly-stale sources was the one route that showed no date
// at all. DataAge + oldestVerifiedAt fix both halves of that.
import { DataAge } from '@/components/DataAge';
import { oldestVerifiedAt } from '@/lib/dataFreshness';

function StrategyPage() {
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get('store');
  const routeId = searchParams.get('route'); // e.g. 'cashback-<uuid>' or 'points-<uuid>'
  const amount = Number(searchParams.get('amount')) || 100;

  const { store, loading: storeLoading } = useStoreBySlug(storeSlug);
  const { cashbackOffers, pointOffers, giftCardOffers, loading: offersLoading } = useStoreOffers(store?.id);
  const { programs: milesPrograms } = useMilesPrograms();
  const { strategies: curatedStrategies } = useCuratedStrategies(
    store?.id,
    store?.category || null
  );
  // The top-ranked curated strategy (by hero_return_pct desc). If
  // present, we render it ABOVE the auto-generated highlighted route
  // because curated routes routinely beat single-platform stacks.
  const topCurated = curatedStrategies[0] || null;
  const { strategies: savedStrategies, save, reachedFreeCap, FREE_SAVED_CAP } = useSavedStrategies();
  const { isPremium } = useSubscription();
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
        amount,
        cashbackOffers,
        pointOffers,
        giftCardOffers,
        milesPrograms,
        userWallet: userWalletForStrategy,
        includeStacks: isPremium,
      }),
    [store, amount, cashbackOffers, pointOffers, giftCardOffers, milesPrograms, userWalletForStrategy, isPremium]
  );

  // Pick the highlighted strategy: routeId from URL > best by GBP return
  const highlighted =
    (routeId && strategies.find((s) => s.id === routeId)) || strategies[0] || null;

  // Direct Avios eStore baseline for this store: best earn_rate among
  // BA Avios point offers × amount. Used below to compare against the
  // ALL-IN-AVIOS conversion of a mixed (£ + Avios) route — same logic
  // as ComparePage's RouteBox.
  const bestDirectAvios = useMemo(() => {
    const aviosOffer = (pointOffers || []).find((p) =>
      /avios|british airways/i.test(p.airline || '')
    );
    if (!aviosOffer) return 0;
    return Math.round(Number(aviosOffer.earn_rate || 0) * (amount || 0));
  }, [pointOffers, amount]);

  // Mixed route → ALL-IN-AVIOS conversion (Bárbara 2026-05-19):
  // "if I converted the cashback to Avios via Booster, my total
  // Avios = (£X → Y Avios) + direct Z = total". Then compare against
  // the direct eStore baseline to see whether stacking still wins.
  const mixedAvios = useMemo(() => {
    if (!highlighted || !Array.isArray(highlighted.layers)) return null;
    let gbpPortion = 0;
    let aviosPortion = 0;
    for (const l of highlighted.layers) {
      if (l.kind === 'points') {
        aviosPortion += Number(l.points) || 0;
      } else {
        gbpPortion += Number(l.gbpReturn) || 0;
      }
    }
    if (gbpPortion <= 0 || aviosPortion <= 0) return null;
    const cashbackAsAvios = gbpToAviosBooster(gbpPortion);
    return {
      gbpPortion,
      aviosPortion,
      cashbackAsAvios,
      totalAvios: cashbackAsAvios + aviosPortion,
    };
  }, [highlighted]);

  const steps = useMemo(
    () => buildStrategySteps(highlighted, store),
    [highlighted, store]
  );

  // Check if this exact (store, route, amount) combo was already saved
  const isAlreadySaved = useMemo(() => {
    if (!store || !highlighted) return false;
    return savedStrategies.some(
      (s) =>
        s.store_id === store.id &&
        s.amount === amount &&
        s.nickname === highlighted.title
    );
  }, [savedStrategies, store, highlighted, amount]);

  const [savingNow, setSavingNow] = useState(false);

  const handleSave = async () => {
    if (!store || !highlighted || savingNow) return;
    if (!isPremium && reachedFreeCap && !isAlreadySaved) {
      toast({
        title: 'Free plan limit reached',
        description: `Free plan includes ${FREE_SAVED_CAP} saved strategies. Subscribe to save unlimited routes.`,
        variant: 'destructive',
      });
      return;
    }
    setSavingNow(true);
    try {
      await save({
        storeId: store.id,
        platformId: null, // not resolving platform.id from provider name yet
        amount,
        nickname: highlighted.title,
        notes: `${highlighted.subtitle} → ${highlighted.gbpReturnDisplay}`,
      });
      toast({
        title: 'Strategy saved',
        description: 'Find it in Saved strategies.',
      });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err.message || 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSavingNow(false);
    }
  };

  if (storeLoading || offersLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading strategies…</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold">No store selected</h1>
        <p className="text-muted-foreground">
          Pick a store and run a comparison to see the recommended strategy.
        </p>
        <Button asChild>
          <Link to="/search">Browse stores</Link>
        </Button>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-3xl font-bold">No strategies yet</h1>
        <p className="text-muted-foreground">
          We don&rsquo;t have enough offer data for {store.name} to recommend a
          route. Check back soon.
        </p>
        <Button asChild variant="outline">
          <Link to={`/store/${store.slug}`}>Back to {store.name}</Link>
        </Button>
      </div>
    );
  }

  const alternatives = strategies.filter((s) => s.id !== highlighted.id);

  // For ANY strategy, pull the cashback breakdown if one of its layers
  // has it (covers flat cashback AND gift_card×cashback stacks).
  const breakdownFor = (s) => {
    if (!s) return null;
    if (s.rateBreakdown && s.rateBreakdown.length > 0) return s.rateBreakdown;
    const cb = s.layers?.find((l) => l.kind === 'cashback');
    return cb?.rateBreakdown && cb.rateBreakdown.length > 0
      ? cb.rateBreakdown
      : null;
  };
  const highlightedBreakdown = breakdownFor(highlighted);

  return (
    <>
      <Helmet>
        <title>Strategy for {store.name} — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to={`/store/${store.slug}`}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to {store.name}
        </Link>

        {topCurated && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CuratedStrategyCard strategy={topCurated} defaultOpen />
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-light-pink/40 to-card">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Trophy className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {topCurated
                    ? 'Single-platform alternative'
                    : highlighted.id === strategies[0].id
                    ? 'Best route'
                    : 'Selected route'}
                </span>
              </div>
              <CardTitle className="text-2xl pt-1">
                {highlighted.title} · {store.name}
              </CardTitle>
              <CardDescription>{highlighted.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Estimated return
                  </div>
                  <div className="text-2xl font-bold gradient-text">
                    {highlighted.gbpReturnDisplay}
                  </div>
                  {/* ALL-IN-AVIOS conversion (Bárbara 2026-05-19):
                      shows "(£X → Y Avios via Booster) + Z direct =
                      total Avios", followed by the verdict vs the
                      Avios eStore direct baseline. Lets the user
                      decide whether stacking still beats going pure
                      Avios at the eStore. */}
                  {mixedAvios && (
                    <div
                      className="text-xs text-muted-foreground mt-1 leading-snug"
                      title="Cashback converted to Avios via Avios Booster (£0.0092/Avios)"
                    >
                      (£{mixedAvios.gbpPortion.toFixed(2)} →{' '}
                      {mixedAvios.cashbackAsAvios.toLocaleString('en-GB')} Avios via Booster)
                      <br />
                      + {mixedAvios.aviosPortion.toLocaleString('en-GB')} direct ={' '}
                      <span className="font-semibold text-foreground/80">
                        {mixedAvios.totalAvios.toLocaleString('en-GB')} Avios total
                      </span>
                    </div>
                  )}
                  {mixedAvios && bestDirectAvios > 0 && (
                    mixedAvios.totalAvios > bestDirectAvios ? (
                      <p className="text-xs font-medium text-emerald-700 mt-1">
                        ✓ Beats the Avios eStore by{' '}
                        {(mixedAvios.totalAvios - bestDirectAvios).toLocaleString('en-GB')} Avios
                      </p>
                    ) : mixedAvios.totalAvios < bestDirectAvios ? (
                      <p className="text-xs font-medium text-amber-700 mt-1">
                        ⚠ Avios eStore still wins —{' '}
                        {bestDirectAvios.toLocaleString('en-GB')} Avios direct via avios.com
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-sky-700 mt-1">
                        = Same as Avios eStore ({bestDirectAvios.toLocaleString('en-GB')} Avios)
                      </p>
                    )
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Spend
                  </div>
                  <div className="text-2xl font-bold">£{amount}</div>
                </div>
                <div className="self-end">
                  <DataAge verifiedAt={oldestVerifiedAt(highlighted.layers)} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleSave}
                  disabled={savingNow || isAlreadySaved}
                  variant={isAlreadySaved ? 'outline' : 'default'}
                >
                  {isAlreadySaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      {savingNow ? 'Saving…' : 'Save strategy'}
                    </>
                  )}
                </Button>
                {highlighted.affiliateLink && (
                  <a
                    href={highlighted.affiliateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline">
                      Open {highlighted.providerName}{' '}
                      <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </a>
                )}
              </div>

              {highlightedBreakdown && (
                <RateBreakdown
                  breakdown={highlightedBreakdown}
                  defaultOpen
                />
              )}
            </CardContent>
          </Card>
        </motion.section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Step by step</h2>
          <ol className="space-y-3">
            {steps.map((step, idx) => {
              const external = step.actionUrl && /^https?:\/\//i.test(step.actionUrl);
              return (
                <li key={idx}>
                  <Card>
                    <CardContent className="py-4 flex gap-4 items-start">
                      <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          {step.title}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.detail}
                        </p>
                        {step.warning && (
                          <div className="text-sm text-secondary inline-flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{step.warning}</span>
                          </div>
                        )}
                        {/* Per-step Open button. Each step now carries
                            its own action URL (affiliate first, then
                            internal store fallback) so the user can
                            execute the step without leaving the page. */}
                        {step.actionUrl && (
                          <div className="pt-1">
                            {external ? (
                              <a
                                href={step.actionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                  {step.actionLabel || 'Open'}
                                </Button>
                              </a>
                            ) : (
                              <Link to={step.actionUrl}>
                                <Button size="sm" variant="outline">
                                  {step.actionLabel || 'Open'}
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {alternatives.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Alternative routes</h2>
            <p className="text-sm text-muted-foreground">
              Sorted by estimated return on £{amount}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alternatives.map((s) => {
                const bd = breakdownFor(s);
                return (
                  <Link
                    key={s.id}
                    to={`/strategy?store=${encodeURIComponent(
                      store.slug
                    )}&route=${encodeURIComponent(s.id)}&amount=${amount}`}
                  >
                    <Card className="card-hover h-full">
                      <CardHeader className="pb-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {s.type}
                        </span>
                        <CardTitle className="text-lg pt-1">{s.title}</CardTitle>
                        <CardDescription>{s.subtitle}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-xl font-bold gradient-text">
                          {s.gbpReturnDisplay}
                        </div>
                        {bd && (
                          <RateBreakdown breakdown={bd} defaultOpen={false} compact />
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <Card className="bg-light-green/30 border-accent/30">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">Want to understand why this wins?</p>
                <p className="text-sm text-muted-foreground">
                  Read the chapter on stacking {highlighted.type} routes.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/library">Open library</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default StrategyPage;
