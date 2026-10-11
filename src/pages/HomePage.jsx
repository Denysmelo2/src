import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import {
  Flame,
  ShoppingCart,
  Gift,
  Heart,
  Search,
  Bookmark,
  Wallet,
  CheckCircle2,
  Star,
  ArrowRight,
  Check,
  Calculator as CalcIcon,
  Building2,
  CreditCard,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useRecentSearches,
  useSavedStrategies,
  useUserFavourites,
  useUserWallet,
} from '@/hooks/useUserState';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from '@/lib/i18n';

/**
 * Format a date as a friendly "X ago" — used by the Recent Activities feed.
 */
function fmtAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

// Quick Actions row (top of dashboard, 4 cards). 2026-05-17: replaced
// "Favourite Stores" with Calculator per Bárbara's review — favourites
// live in /profile already, calculator is a higher-leverage entry.
const QUICK_ACTIONS = [
  {
    label: 'Hot Deals',
    sub: 'Today’s top offers with the platform that powers each',
    to: '/hot-deals',
    Icon: Flame,
    gradient: 'from-orange-400 to-red-500',
  },
  {
    label: 'Highest Supermarket Deal',
    sub: 'Best cashback at every UK grocery chain',
    to: '/deals/supermarket',
    Icon: ShoppingCart,
    gradient: 'from-green-400 to-emerald-600',
  },
  {
    label: 'Top Gift Cards',
    sub: 'Discounted gift cards across all platforms',
    to: '/deals/gift-cards',
    Icon: Gift,
    gradient: 'from-primary to-secondary',
  },
  {
    label: 'Calculator',
    sub: 'See how much your spending turns into',
    to: '/calculator',
    Icon: CalcIcon,
    gradient: 'from-violet-500 to-fuchsia-500',
  },
];

// Second row (below Quick Actions): comparison + the curated Playbook
// (the 17 multi-step strategies seeded from Bárbara's ebook).
const COMPARE_LINKS = [
  {
    label: 'The Playbook',
    sub: 'Every curated multi-step strategy — 21% Deliveroo stack, 11% Sainsbury\'s, more',
    to: '/playbook',
    Icon: BookOpen,
    gradient: 'from-primary to-secondary',
  },
  {
    label: 'Compare Banks',
    sub: 'What each UK bank offers in rewards and switch bonuses',
    to: '/banks',
    Icon: Building2,
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    label: 'Compare Cards',
    sub: 'Side-by-side credit and reward cards (Amex, Barclays, etc.)',
    to: '/cards',
    Icon: CreditCard,
    gradient: 'from-cyan-500 to-teal-500',
  },
];

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { searches } = useRecentSearches();
  const { strategies } = useSavedStrategies();
  const { favourites } = useUserFavourites();
  const wallet = useUserWallet();
  const sub = useSubscription();

  // "Start to compare" state — the purchase amount lives here so both
  // a picked-store click on the dropdown AND a free-text submit can
  // carry it through to the next page.
  const [heroAmount, setHeroAmount] = useState('');

  // Search from the Start to compare hero → jump into the Search page
  // (which handles free-text queries + shows matching stores). If the
  // user picked a store from the autocomplete dropdown, SearchAutocomplete
  // has already navigated straight to /compare — this only runs when
  // there was no exact match.
  const goSearch = (query, amount) => {
    const params = new URLSearchParams();
    const q = String(query || '').trim();
    if (q) params.set('q', q);
    const a = String(amount || '').trim();
    if (a) params.set('amount', a);
    const qs = params.toString();
    navigate(qs ? `/search?${qs}` : '/search');
  };

  const firstName =
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  // ─── Recent Activities: merge real events from multiple sources ────
  const activities = useMemo(() => {
    const items = [];

    for (const s of (searches || []).slice(0, 10)) {
      items.push({
        id: `search-${s.id}`,
        kind: 'search',
        title: `${t('dashboard.searchedFor')} "${s.query}"`,
        at: s.searched_at,
      });
    }
    for (const st of (strategies || []).slice(0, 10)) {
      const where = st.store?.name || '—';
      items.push({
        id: `strategy-${st.id}`,
        kind: 'strategy',
        title: `${t('dashboard.savedStrategyFor')} ${where}`,
        at: st.created_at,
      });
    }
    for (const f of (favourites || []).slice(0, 10)) {
      const where = f.store?.name || '—';
      items.push({
        id: `fav-${f.store_id}`,
        kind: 'favorite',
        title: t('dashboard.addedToFavorites', { store: where }),
        at: f.created_at,
      });
    }
    // Onboarding-complete pseudo-event so a brand-new user still sees one row
    if (sub.profile?.onboarding_done) {
      items.push({
        id: 'onboarding',
        kind: 'onboarding',
        title: t('dashboard.profileSetupCompleted'),
        at: sub.profile?.updated_at || sub.profile?.created_at || null,
      });
    }

    return items
      .filter((i) => i.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6);
  }, [searches, strategies, favourites, sub.profile]);

  // ─── Your Setup: live counts and overall completion ────────────────
  const setup = useMemo(() => {
    const banks = wallet.cards?.length || 0; // bank-issued cards
    const cards = wallet.cards?.length || 0;
    const programs =
      (wallet.milesPrograms?.length || 0) +
      (wallet.cashbackPlatforms?.length || 0);
    const favs = favourites?.length || 0;

    const filledSections = [banks > 0, cards > 0, programs > 0, favs > 0].filter(
      Boolean
    ).length;
    const completion = Math.round((filledSections / 4) * 100);

    return { banks, cards, programs, favs, completion };
  }, [wallet, favourites]);

  return (
    <>
      <Helmet>
        <title>Dashboard — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* ─── Welcome banner ──────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl px-6 py-7 md:py-8 bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground shadow-lg"
        >
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            {t('dashboard.welcomeBack')}, {firstName}!{' '}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1.5 text-primary-foreground/90 text-sm md:text-base">
            {t('dashboard.subtitle')}
          </p>
        </motion.section>

        {/* ─── Start to compare ────────────────────────────────────
            2026-07-05 (Bárbara): the primary job of the dashboard is
            to launch the user into a comparison in one tap. Wrapping
            the search + the quick actions in a highlighted "Start to
            compare" card makes the intent visually obvious the
            moment the page loads. */}
        <section
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-6 space-y-5"
          aria-labelledby="start-to-compare-heading"
        >
          <div className="space-y-1">
            <h2
              id="start-to-compare-heading"
              className="text-xl md:text-2xl font-bold"
            >
              Start to compare
            </h2>
            <p className="text-sm text-muted-foreground">
              Type a store name to see the best deal instantly — or jump straight into a shortcut.
            </p>
          </div>

          {/* Store · £ Amount · Search — all inline in one row on both
              mobile and desktop (Bárbara 2026-07-05). SearchAutocomplete
              hosts the amount input internally so the alignment stays
              consistent and the whole form submits as one. */}
          <SearchAutocomplete
            onSubmit={goSearch}
            placeholder="Type a store name…"
            amount={heroAmount}
            onAmountChange={setHeroAmount}
          />

          {/* Shortcuts under the search input. Kept the previous
              quick-action grid geometry so the layout stays familiar
              on mobile and desktop. */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Or jump into…
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {QUICK_ACTIONS.map(({ label, sub, to, Icon, gradient }) => (
                <Link key={label} to={to}>
                  <Card className="card-hover h-full">
                    <CardContent className="p-4 md:p-5 space-y-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="font-semibold leading-tight">{label}</div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {sub}
                      </p>
                      <div className="flex items-center text-xs font-medium text-primary pt-1">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Compare (Banks / Cards) ────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Compare</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {COMPARE_LINKS.map(({ label, sub, to, Icon, gradient }) => (
              <Link key={label} to={to}>
                <Card className="card-hover h-full">
                  <CardContent className="p-4 md:p-5 flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight">
                        {label}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug mt-1">
                        {sub}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── Two-column: Recent Searches + Your Setup ───────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Searches — cap 4 (Bárbara, 17/05/2026). Was a
              merged "Recent Activities" feed; simplified to focus on
              what users actually want to revisit: stores they looked
              up recently. */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent searches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(searches || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Searches you make will show up here.
                </p>
              ) : (
                (searches || []).slice(0, 4).map((s) => (
                  <Link
                    key={s.id}
                    to={`/compare?q=${encodeURIComponent(s.query || '')}`}
                    className="flex items-start gap-3 py-2 border-b last:border-b-0 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-light-pink/60 text-secondary">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        “{s.query}”
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtAgo(s.searched_at)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-2" />
                  </Link>
                ))
              )}
              {(searches || []).length > 4 && (
                <div className="pt-2">
                  <Link
                    to="/compare"
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center"
                  >
                    View all searches <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Setup */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  {t('dashboard.yourSetup')}
                </CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-light-green text-accent-foreground">
                  {setup.completion}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SetupRow label={t('dashboard.banks')} count={setup.banks} />
              <SetupRow label={t('dashboard.cards')} count={setup.cards} />
              <SetupRow label={t('dashboard.programs')} count={setup.programs} />
              <SetupRow
                label={t('dashboard.favoriteStores')}
                count={setup.favs}
              />

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('dashboard.profileCompletion')}
                  </span>
                  <span className="font-bold gradient-text">
                    {setup.completion}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                    style={{ width: `${setup.completion}%` }}
                  />
                </div>
                {setup.completion < 100 && (
                  <Link
                    to="/profile"
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center mt-3"
                  >
                    {t('dashboard.completeProfile')}{' '}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

function ActivityIcon({ kind }) {
  const map = {
    search: { Icon: Search, bg: 'bg-light-pink/60 text-secondary' },
    strategy: { Icon: Bookmark, bg: 'bg-primary/10 text-primary' },
    favorite: { Icon: Heart, bg: 'bg-pink-100 text-pink-600' },
    onboarding: { Icon: CheckCircle2, bg: 'bg-light-green text-accent-foreground' },
  };
  const { Icon, bg } = map[kind] || map.search;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function SetupRow({ label, count }) {
  const has = count > 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        {has ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-muted" />
        )}
        <span className={has ? '' : 'text-muted-foreground'}>{label}</span>
      </div>
      <span
        className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
          has ? 'bg-light-green text-accent-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </div>
  );
}

export default HomePage;
