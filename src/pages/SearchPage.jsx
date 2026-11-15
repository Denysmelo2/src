import React, { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStores, useLiveStoreIds } from '@/hooks/useCatalog';
import { rankStores, hasNoOffers } from '@/lib/storeSearch';
import { useRecentSearches, useUserFavourites } from '@/hooks/useUserState';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { StoreLogo } from '@/components/StoreLogo';

function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  // 2026-05-19: ComparePage's "Browse retailers" sends `?cat=<slug>`
  // links so users can drill into a category. We filter the existing
  // store list client-side by matching against the category text[].
  const initialCat = (searchParams.get('cat') || '').trim().toLowerCase();
  // 2026-05-19 (afternoon): amount carried over from /compare so the
  // user can pick a store here and land back on /compare with the
  // amount already filled. Defaults to 100 if not provided.
  const initialAmount = searchParams.get('amount') || '100.00';
  const [amountInput, setAmountInput] = React.useState(initialAmount);
  const cameFromCompare = Boolean(initialCat);

  const { stores, loading } = useStores();
  const { push: pushRecent } = useRecentSearches();
  const { isFavourite } = useUserFavourites();

  // Record any query that came in via URL
  useEffect(() => {
    if (initialQuery) pushRecent(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const matched = useMemo(() => {
    const q = initialQuery.trim().toLowerCase();
    let out = stores;
    if (q) {
      out = out.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (initialCat) {
      out = out.filter((s) =>
        Array.isArray(s.category) &&
        s.category.some((c) => String(c).toLowerCase() === initialCat)
      );
    }
    return out;
  }, [initialQuery, initialCat, stores]);

  // Stores with a live offer first, the others after them and marked
  // (lib/storeSearch.js, handover 14/11/2026, task E). Offers are looked
  // up for the first 300 matches; past that the name order stays.
  const LIVE_LOOKUP = 300;
  const live = useLiveStoreIds(matched.slice(0, LIVE_LOOKUP).map((s) => s.id));
  const results = useMemo(() => {
    const head = rankStores(matched.slice(0, LIVE_LOOKUP), initialQuery, live, { matchOnly: false });
    return [...head, ...matched.slice(LIVE_LOOKUP)];
  }, [matched, initialQuery, live]);

  const handleSubmit = (query) => {
    const next = new URLSearchParams(searchParams);
    if (query?.trim()) next.set('q', query.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  // Validate the amount the same way ComparePage does — positive, >=1.
  // We keep it forgiving (default 100) so the user can still browse
  // without typing anything; the Compare flow will use whatever's there.
  const parsedAmount = (() => {
    const n = Number(String(amountInput || '').trim());
    if (!Number.isFinite(n) || n < 1) return 100;
    return Math.round(n * 100) / 100;
  })();

  // Where each store card sends the user. The whole point of landing
  // here from /compare is to continue the comparison flow — so click
  // → /compare?store=slug&amount=X, NOT /store/slug. The Compare page
  // bootstraps from those params and auto-loads the routes.
  const compareLinkFor = (store) =>
    `/compare?store=${encodeURIComponent(store.slug)}&amount=${parsedAmount}`;

  return (
    <>
      <Helmet>
        <title>
          {initialQuery
            ? `Search: ${initialQuery} — SnapGain`
            : 'Search stores — SnapGain'}
        </title>
      </Helmet>

      <div className="container mx-auto px-4 py-10 space-y-8">
        {/* Back to /compare (or /home if the user didn't come from a
            category drill-down). Always present so the user has a
            visible escape hatch — they shouldn't have to use the
            browser back button. */}
        <Link
          to={cameFromCompare ? '/compare' : '/home'}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {cameFromCompare ? 'Back to Compare' : 'Home'}
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {initialCat
              ? `${String(initialCat).replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} stores`
              : 'Search stores'}
          </h1>

          {initialCat && (
            <div className="flex items-center justify-between gap-3 flex-wrap text-sm bg-light-pink/30 border border-primary/30 rounded-lg px-3 py-2">
              <span>
                Showing stores in category:{' '}
                <span className="font-semibold capitalize">
                  {initialCat.replace(/[-_]/g, ' ')}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('cat');
                  setSearchParams(next, { replace: true });
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear category
              </button>
            </div>
          )}

          <SearchAutocomplete
            initialValue={initialQuery}
            onSubmit={handleSubmit}
            placeholder="Type a store name…"
            autoFocus
          />

          {/* Amount field — carried over to /compare when a card is
              clicked. Sitting right under the search keeps the two
              "inputs you need to compare" colocated, just like the
              hero form on /compare. The filter chips that used to be
              here (Cashback / Points / Gift Cards) were never wired up
              and only added noise — removed 2026-05-19. */}
          <div className="space-y-1.5 max-w-sm">
            <Label htmlFor="amount" className="text-sm font-semibold">
              Purchase amount (£)
            </Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              placeholder="100.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1) {
                  setAmountInput(n.toFixed(2));
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              We&rsquo;ll carry this amount over to the comparison.
            </p>
          </div>
        </motion.section>

        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading stores…'
              : `${results.length} ${results.length === 1 ? 'store' : 'stores'}${
                  initialQuery ? ` matching "${initialQuery}"` : ''
                }`}
          </p>

          {!loading && results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <p className="text-lg font-medium">
                  No stores match your search.
                </p>
                <p className="text-sm text-muted-foreground">
                  Try a different name or browse the full list from the home
                  page.
                </p>
                <Button asChild variant="outline">
                  <Link to="/home">Back to home</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((store) => (
                <Link key={store.id} to={compareLinkFor(store)}>
                  <Card className="card-hover h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <StoreLogo store={store} size="lg" />
                        {(store.is_featured || isFavourite(store.id)) && (
                          <Star className="w-5 h-5 text-secondary fill-secondary" />
                        )}
                      </div>
                      <CardTitle className="text-xl pt-2">{store.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {hasNoOffers(store, live)
                          ? 'No offers yet'
                          : `${store.category?.[0] || 'Retailer'} · Cashback · Points`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-sm font-medium text-primary inline-flex items-center">
                        Compare rewards <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export default SearchPage;
