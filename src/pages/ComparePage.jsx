/**
 * /compare — focused store comparison flow.
 *
 * Redesign 2026-05-19 (Bárbara UX rewrite). Goals:
 *   - "Direta, simples, sem poluição visual"
 *   - One job: pick a store + amount → see the best route.
 *   - First box ALWAYS the best route — Pro curated wins ties.
 *   - Each route box expands inline with step-by-step action buttons.
 *   - "Browse retailers" at the bottom for people without a store
 *     in mind, grouped by category for accessibility.
 *
 * What we deliberately removed from the old design:
 *   - Type-filter chips + min-rate slider (cognitive overhead)
 *   - "Compare Cards" tab (already lives at /cards)
 *   - Sticky wallet banner (kept but only when actively filtering)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronUp,
  Trophy,
  Sparkles,
  Wallet,
  CreditCard,
  Tag,
  ExternalLink,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import {
  useStoreSearch,
  useStoreBySlug,
  useStoreOffers,
  useMilesPrograms,
  useCuratedStrategies,
  useStores,
} from '@/hooks/useCatalog';
import { useUserWallet } from '@/hooks/useUserState';
import { useWalletOnlyPref } from '@/hooks/useUserPrefs';
import { useSubscription } from '@/hooks/useSubscription';
import { computeStrategies } from '@/lib/strategies';
import { StoreLogo } from '@/components/StoreLogo';
import { CuratedStrategyCard } from '@/components/CuratedStrategyCard';
import { buildWalletFilter } from '@/lib/walletFilter';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { RateBreakdown } from '@/components/RateBreakdown';
import { labelForStrategy } from '@/components/AutoStrategyCard';
import { compareCashbackVsAvios, gbpToAviosBooster } from '@/lib/aviosMath';
import { oldestVerifiedAt } from '@/lib/dataFreshness';
import { DataAge } from '@/components/DataAge';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/** Validate the typed amount: positive number, max 2 decimals. */
function parseAmount(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: false, value: 0 };
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 1) return { ok: false, value: 0 };
  // Round to 2 decimals — the input already restricts via step=0.01
  // but defensive in case someone pastes a precise value.
  return { ok: true, value: Math.round(num * 100) / 100 };
}

/** Pick the right one-word label for the badge in the top-right
 * corner of a route box. Curated routes use their stored difficulty;
 * auto routes inherit from labelForStrategy.
 */
function routeBadge(item) {
  if (item.source === 'curated') {
    return (item.difficulty || 'pro').toUpperCase();
  }
  return labelForStrategy(item.strategy)?.toUpperCase() || 'EASY';
}

/** Map an "Avios" point value to its approximate £ worth, so we can
 * rank curated strategies (which include points bonuses) alongside
 * pure-£ auto strategies on a single scale. */
function pointsToGbp(points, programName, milesPrograms) {
  if (!points) return 0;
  const prog = (milesPrograms || []).find(
    (p) => (p.name || '').toLowerCase() === String(programName || '').toLowerCase()
  );
  const rate = prog?.conversion_rate;
  return rate ? points * Number(rate) : 0;
}

/** Normalise a curated strategy into the same shape we use for the
 * unified route list — so ranking, badge and expand UX share code. */
function curatedToItem(curated, amount, milesPrograms) {
  const pct = Number(curated.hero_return_pct) || 0;
  const gbpFromPct = (pct / 100) * amount;
  const gbpFromPoints = pointsToGbp(
    curated.bonus_points,
    curated.bonus_points_program,
    milesPrograms
  );
  const total = gbpFromPct + gbpFromPoints;
  return {
    source: 'curated',
    id: `curated-${curated.id}`,
    title: curated.title,
    subtitle: curated.hero_return_label,
    gbpReturn: total,
    gbpReturnDisplay: `£${total.toFixed(2)}`,
    difficulty: curated.difficulty,
    curated,
  };
}

/** Same shape as curatedToItem, for an auto-generated route. */
function autoToItem(s) {
  return {
    source: 'auto',
    id: s.id || `auto-${Math.random()}`,
    title: s.title,
    subtitle: s.subtitle,
    gbpReturn: Number(s.gbpReturn) || 0,
    gbpReturnDisplay: s.gbpReturnDisplay,
    // When this route's numbers were last checked against the provider.
    // Taken from the layers rather than the strategy's own field, because
    // a stack has no single date and the honest one is the oldest of its
    // parts — see lib/dataFreshness.js. Dropping this on the way up is
    // what let a rate from May render exactly like one from this morning.
    verifiedAt: oldestVerifiedAt(s.layers),
    strategy: s,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────

/**
 * AllStoresPicker — full-list dropdown for users who don't want to
 * type. Opens as a wide modal-style panel below the input with a
 * search box (fuzzy match) and a scrollable list of every store.
 * Capped at 100 visible rows to keep the DOM light; the search is
 * the way to drill into the long tail.
 */
function AllStoresPicker({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  // Previously used useStoreSearch which returns ONLY featured stores
  // when the query is empty (and caps at 100 with a query). For a real
  // "Browse all" the user expects the FULL catalogue scrollable.
  // useStores() paginates and gives us all ~11K rows in memory; we
  // filter locally and incrementally render to keep the DOM light.
  const { stores, loading } = useStores();
  // How many rows to render at once. "Load more" appends another batch.
  // 200 keeps the initial render snappy even on lower-end devices, and
  // since the list is sorted alphabetically users can find the chunk
  // they want either by scrolling + Load more, or just by typing.
  const PAGE = 200;
  const [renderCount, setRenderCount] = useState(PAGE);

  // Re-sort + filter on query change. Sorting is already done in the
  // hook (order by name), so we just filter here.
  // PREFIX MATCH (startsWith) — Bárbara's rule (2026-05-19): typing
  // "sai" must show ONLY stores that BEGIN with "sai" (Sainsbury's),
  // never stores that merely CONTAIN those letters (All Saints).
  // Same rule as the inline autocomplete on /compare; keeps the two
  // dropdowns consistent so users don't have to learn two behaviours.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      String(s.name || '').toLowerCase().startsWith(q)
    );
  }, [stores, query]);

  // Reset the pagination window whenever the user types — they don't
  // want to scroll past 500 stale alphabetical rows to find the new
  // matches.
  useEffect(() => {
    setRenderCount(PAGE);
  }, [query]);

  // Also reset when the modal re-opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setRenderCount(PAGE);
    }
  }, [open]);

  if (!open) return null;

  const visible = filtered.slice(0, renderCount);
  const hasMore = filtered.length > renderCount;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-2xl rounded-xl border bg-background shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${stores.length.toLocaleString('en-GB')} stores… (or scroll the list)`}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Loading stores…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No matches. Try fewer letters.
            </p>
          ) : (
            <>
              {visible.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <StoreLogo store={s} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    {s.category?.[0] && (
                      <div className="text-xs text-muted-foreground capitalize truncate">
                        {String(s.category[0]).replace(/[-_]/g, ' ')}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {hasMore && (
                <div className="px-4 py-3 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRenderCount((n) => n + PAGE)}
                  >
                    Load more ({(filtered.length - renderCount).toLocaleString('en-GB')} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground text-center">
          {loading
            ? 'Loading full catalogue…'
            : query
            ? `${filtered.length.toLocaleString('en-GB')} matching · scroll or load more`
            : `${stores.length.toLocaleString('en-GB')} stores total · type to filter`}
        </div>
      </div>
    </>
  );
}

/**
 * StoreAutocomplete — text input that surfaces matching stores in a
 * dropdown as the user types. Picking a row sets `selected` to the
 * store row and locks the input value.
 */
function StoreAutocomplete({ value, onChange, selected, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // startsWith=true: the dropdown only surfaces stores whose name
  // BEGINS with the typed text. Typing "sain" matches "Sainsbury's"
  // but NOT "All Saints" — the previous fuzzy %X% search confused
  // users by returning loosely-related stores.
  const { stores, loading } = useStoreSearch(value, { limit: 8, startsWith: true });
  // Only show the dropdown when there's a real search term that
  // doesn't already match the selected store's name.
  const shouldShow =
    open && value.length >= 1 && (!selected || selected.name !== value);

  // Close on outside click.
  useEffect(() => {
    function handle(e) {
      if (
        !inputRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Clear field + drop the selected store. If parent provided onClear
  // (the recommended path), delegate to it so it can ALSO clear the URL
  // params + reset `submitted`. Otherwise fall back to a local clear.
  // We need parent-side clearing because the page bootstraps `selected`
  // from `?store=…` in the URL on every render where selected is null;
  // a local-only clear would be undone by that effect on the next tick.
  const clear = () => {
    if (typeof onClear === 'function') {
      onClear();
    } else {
      onChange('');
      onSelect(null);
    }
    setOpen(false);
    // Refocus so they can keep typing right away.
    requestAnimationFrame(() => {
      inputRef.current?.querySelector('input')?.focus();
    });
  };

  return (
    <div className="relative">
      <div className="relative" ref={inputRef}>
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          inputMode="search"
          autoComplete="off"
          placeholder="e.g. Sainsbury's"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            if (selected) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear store search"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {shouldShow && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Matching stores"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-lg border bg-background shadow-lg"
        >
          {loading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              Searching…
            </div>
          ) : stores.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No matches. Try a different word.
            </div>
          ) : (
            stores.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={selected?.id === s.id}
                onClick={() => {
                  onSelect(s);
                  onChange(s.name);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none"
              >
                <StoreLogo store={s} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  {s.category?.[0] && (
                    <div className="text-xs text-muted-foreground capitalize truncate">
                      {String(s.category[0]).replace(/[-_]/g, ' ')}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RouteBox — collapsible card for one strategy (curated or auto).
 * Header always visible (title + return + tiny badge). Click anywhere
 * on header expands the body inline showing the steps + action
 * buttons. No nav, no second click — everything is right there.
 */
function RouteBox({
  item,
  rank,
  isBest,
  amount,
  storeSlug,
  directAvios = 0,
  defaultOpen = false,
  now,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badge = routeBadge(item);
  const isCurated = item.source === 'curated';

  // Golden Rule comparison (Bárbara's ebook): for any route that earns
  // cashback (£), show how many Avios that £ would buy via the Avios
  // Booster, and which is better — cashback-route or direct Avios
  // eStore for the same store.
  //
  // Hide the comparison when the route ALREADY earns Avios directly —
  // showing "this £ would buy N Avios via Booster" on top of a route
  // that already gives Avios looks like double-counting and confuses
  // users (e.g. "everup + British Airways Avios" stack: it gives 800
  // Avios directly + cashback; converting the cashback to MORE Avios
  // is meaningless because you already chose the Avios route).
  const aviosCompare = useMemo(() => {
    // Auto: pure points route (BA Avios eStore alone).
    if (item.source === 'auto' && item.strategy?.type === 'points') return null;
    // Auto: stack that includes a points layer (e.g. cashback + Avios).
    if (
      item.source === 'auto' &&
      Array.isArray(item.strategy?.layers) &&
      item.strategy.layers.some((l) => l.kind === 'points')
    ) {
      return null;
    }
    // Curated: strategy already awards bonus Avios.
    if (
      item.source === 'curated' &&
      Number(item.curated?.bonus_points) > 0
    ) {
      return null;
    }
    const gbp = Number(item.gbpReturn) || 0;
    if (gbp <= 0) return null;
    return compareCashbackVsAvios({ cashbackGbp: gbp, directAvios });
  }, [item, directAvios]);

  // Mixed-value route: returns BOTH a £ amount AND Avios (e.g.
  // "everup + BA Avios" → £400 + 35,000 Avios). For these we surface
  // an ALL-IN-AVIOS conversion per Bárbara's request (2026-05-19):
  // convert the £ portion via Avios Booster (£0.0092/Avios), add to
  // the direct Avios portion, show the total. Then the user can
  // compare that total to what the Avios eStore would give them
  // straight — letting them decide whether to take the stack or go
  // pure-Avios.
  //
  //   (£400 → 43,478 Avios via Booster) + 35,000 = 78,478 Avios total
  //
  // Split the route into its £ side and Avios side from the strategy
  // shape: for auto stacks, walk layers[]; for curated, use the
  // hero_return_pct and bonus_points fields.
  const mixedAvios = useMemo(() => {
    let gbpPortion = 0;
    let aviosPortion = 0;
    if (item.source === 'auto' && Array.isArray(item.strategy?.layers)) {
      for (const l of item.strategy.layers) {
        if (l.kind === 'points') {
          aviosPortion += Number(l.points) || 0;
        } else {
          gbpPortion += Number(l.gbpReturn) || 0;
        }
      }
    } else if (item.source === 'curated') {
      const pct = Number(item.curated?.hero_return_pct) || 0;
      // The amount the user typed into Compare — passed in from the
      // page-level scope so RouteBox can compute the £ side without
      // re-reading the form.
      gbpPortion = (pct / 100) * (Number(amount) || 0);
      aviosPortion = Number(item.curated?.bonus_points) || 0;
    }
    if (gbpPortion <= 0 || aviosPortion <= 0) return null;
    const cashbackAsAvios = gbpToAviosBooster(gbpPortion);
    return {
      gbpPortion,
      aviosPortion,
      cashbackAsAvios,
      totalAvios: cashbackAsAvios + aviosPortion,
    };
  }, [item, amount]);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        // Visual hierarchy — Best gets the strongest pink tint + shadow,
        // alternatives get a softer pink tint so they cohere as a group
        // while still being clearly secondary. Hover lift signals they're
        // tappable. All cards now visibly differ from the page bg.
        isBest
          ? 'border-2 border-primary/60 shadow-lg bg-light-pink/40'
          : 'border-2 border-primary/15 bg-light-pink/15 hover:border-primary/40 hover:bg-light-pink/25 hover:shadow-md'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left"
      >
        {/* Two-column layout per Bárbara's feedback (2026-05-19):
            LEFT  = title + subtitle (+ tiny rank label at the top).
            RIGHT = difficulty badge, £ value, Avios-via-Booster
                    equivalence, comparison verdict, chevron.
            Previous layout stacked everything on the left and felt
            cluttered; right-aligning the numeric stuff gives the eye
            a clear two-column rhythm. */}
        <div className="px-4 py-3 flex items-start gap-4">
          {/* ── LEFT COLUMN: title block ── */}
          <div className="min-w-0 flex-1 space-y-1">
            {isBest ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Trophy className="w-3 h-3" />
                Best route
              </span>
            ) : rank != null ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                #{rank}
              </span>
            ) : null}
            <h3 className="text-base font-semibold leading-snug">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground">
                {item.subtitle}
              </p>
            )}
            {/* How old the numbers above are. Auto routes only: those
                come from the ingestion pipeline and carry
                last_verified_at. Curated strategies are hand-written
                editorial content with no such column, and inventing a
                date for them would be exactly the dishonesty this is
                here to remove. */}
            {!isCurated && (
              <DataAge verifiedAt={item.verifiedAt} now={now} />
            )}
          </div>

          {/* ── RIGHT COLUMN: badge + value + Avios + verdict ── */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1.5 min-w-[140px]">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap',
                  isCurated
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-foreground/70'
                )}
              >
                {isCurated && <Sparkles className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                {badge}
              </span>
              {open ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <div className="text-2xl font-bold gradient-text leading-none">
              {item.gbpReturnDisplay}
            </div>

            {/* ALL-IN-AVIOS conversion for mixed routes. Shows what
                the WHOLE route is worth in Avios if the user converts
                the £ portion through the Avios Booster. The verdict
                line below compares the total against the direct Avios
                eStore baseline for the same store + amount, so users
                can immediately tell whether stacking still wins. */}
            {mixedAvios && (
              <div
                className="text-xs text-muted-foreground leading-snug"
                title="Cashback converted to Avios via Avios Booster (£0.0092/Avios)"
              >
                (£{mixedAvios.gbpPortion.toFixed(2)} →{' '}
                {mixedAvios.cashbackAsAvios.toLocaleString('en-GB')} Avios)
                <br />
                + {mixedAvios.aviosPortion.toLocaleString('en-GB')} ={' '}
                <span className="font-semibold text-foreground/80">
                  {mixedAvios.totalAvios.toLocaleString('en-GB')} Avios total
                </span>
              </div>
            )}

            {/* Verdict for mixed routes: compare ALL-IN-AVIOS total to
                what the Avios eStore would give straight up. */}
            {mixedAvios && directAvios > 0 && (
              mixedAvios.totalAvios > directAvios ? (
                <p className="text-xs font-medium text-emerald-700 leading-snug">
                  ✓ Beats the Avios eStore<br />
                  by {(mixedAvios.totalAvios - directAvios).toLocaleString('en-GB')} Avios
                </p>
              ) : mixedAvios.totalAvios < directAvios ? (
                <p className="text-xs font-medium text-amber-700 leading-snug">
                  ⚠ Avios eStore still wins<br />
                  ({directAvios.toLocaleString('en-GB')} Avios direct)
                </p>
              ) : (
                <p className="text-xs font-medium text-sky-700 leading-snug">
                  = Same as Avios eStore<br />
                  ({directAvios.toLocaleString('en-GB')} Avios)
                </p>
              )
            )}

            {aviosCompare && aviosCompare.cashbackAvios > 0 && (
              <div className="text-xs text-muted-foreground leading-snug" title={aviosCompare.note}>
                ≈{' '}
                <span className="font-semibold text-foreground/80">
                  {aviosCompare.cashbackAvios.toLocaleString('en-GB')} Avios
                </span>
                <br />
                via Avios Booster
              </div>
            )}

            {aviosCompare && aviosCompare.cashbackAvios > 0 && (
              <>
                {aviosCompare.winner === 'cashback' && directAvios > 0 && (
                  <p className="text-xs font-medium text-emerald-700 leading-snug">
                    ✓ Beats the Avios eStore<br />
                    by {aviosCompare.deltaAvios.toLocaleString('en-GB')} Avios
                  </p>
                )}
                {aviosCompare.winner === 'avios' && (
                  <p className="text-xs font-medium text-amber-700 leading-snug">
                    ⚠ Avios eStore wins<br />
                    ({directAvios.toLocaleString('en-GB')} Avios direct)
                  </p>
                )}
                {aviosCompare.winner === 'tie' && directAvios > 0 && (
                  <p className="text-xs font-medium text-sky-700 leading-snug">
                    = Same as Avios eStore<br />
                    ({directAvios.toLocaleString('en-GB')} Avios)
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/20 p-4">
          {isCurated ? (
            <CuratedStrategyCard
              strategy={item.curated}
              defaultOpen
              compact
            />
          ) : (
            <AutoRouteDetail
              strategy={item.strategy}
              storeSlug={storeSlug}
              amount={amount}
              now={now}
            />
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * AutoRouteDetail — body for an auto-generated route. Shows each
 * layer of the stack as a step-like row, then a primary "Open" button
 * that resolves the affiliate URL via lib/affiliateLinks.
 */
function AutoRouteDetail({ strategy, storeSlug, amount, now }) {
  const layers = strategy.layers || [];
  const openUrl =
    strategy.openUrl ||
    resolveOpenUrl({
      rowUrl: layers[0]?.affiliateLink,
      platform: layers[0]?.platform,
      fallback: storeSlug ? `/store/${storeSlug}` : null,
    });
  const external = openUrl && /^https?:\/\//i.test(openUrl);

  return (
    <div className="space-y-3">
      {layers.length > 0 && (
        <ol className="space-y-2">
          {layers.map((layer, i) => (
            <li key={i} className="flex gap-3 items-start text-sm">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {layer.kind === 'cashback' && `${layer.platform} cashback`}
                  {layer.kind === 'gift_card' && `${layer.platform} gift card`}
                  {layer.kind === 'points' &&
                    `${layer.platform || layer.airline || 'Points'}`}
                  {!['cashback', 'gift_card', 'points'].includes(layer.kind) &&
                    layer.platform}
                </div>
                {layer.gbpDisplay && (
                  <div className="text-xs text-muted-foreground">
                    {layer.gbpDisplay}
                  </div>
                )}
                {/* Per-layer age, for stacks only. The header already
                    shows the oldest of the layers, so repeating it on a
                    single-layer route would just say the same thing
                    twice. On a stack it says WHICH part is the old one:
                    a user looking at "Verified 143 days ago" can see
                    that the gift card was checked this week and only
                    the cashback rate is stale. */}
                {layers.length > 1 && (
                  <div className="mt-0.5">
                    <DataAge verifiedAt={layer.lastVerifiedAt} now={now} />
                  </div>
                )}
                {/* 2026-07-05 (Bárbara): breakdown was already threaded
                    from strategies.js but the render was missing here.
                    Show tiers when the layer has variance so users see
                    the actual rate for their purchase category, not
                    just an "Up to X%" ceiling. */}
                {Array.isArray(layer.rateBreakdown) && layer.rateBreakdown.length > 1 && (
                  <div className="mt-2">
                    <RateBreakdown breakdown={layer.rateBreakdown} compact />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {openUrl && (
          <a
            href={external ? openUrl : undefined}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex-1 min-w-[140px]"
          >
            <Button size="sm" className="w-full">
              {external && <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
              Open
            </Button>
          </a>
        )}
        {storeSlug && (
          <Link
            to={`/strategy?store=${encodeURIComponent(storeSlug)}&amount=${amount}&route=${encodeURIComponent(strategy.id || '')}`}
            className="shrink-0"
          >
            <Button size="sm" variant="ghost">
              See full
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Browse by category ───────────────────────────────────────────────
/**
 * BrowseByCategory — bottom-of-page discovery surface. For each
 * category we show ~5 stores + a "See all" link to /search pre-filtered.
 *
 * Category-string mapping: the DB stores category as text[] with strings
 * coming from various scrapers (Quidco uses "food-and-drink", others
 * use "groceries" + "supermarket" interchangeably). Each label has a
 * `matches` array so we coalesce synonyms into one user-facing bucket.
 * Verified against actual DB via `SELECT DISTINCT unnest(category)`.
 */
const CATEGORY_GROUPS = [
  { id: 'supermarket',  label: 'Supermarkets',     icon: '🛒',
    matches: ['groceries', 'supermarket'],
    searchCat: 'groceries' },
  { id: 'food-and-drink', label: 'Food & drink',   icon: '🍽️',
    matches: ['food-and-drink', 'food-delivery'],
    searchCat: 'food-and-drink' },
  { id: 'home',         label: 'Home & DIY',        icon: '🏠',
    matches: ['home'],
    searchCat: 'home' },
  { id: 'fashion',      label: 'Fashion',           icon: '👗',
    matches: ['fashion'],
    searchCat: 'fashion' },
  { id: 'beauty',       label: 'Beauty',            icon: '💄',
    matches: ['beauty', 'beauty-and-cosmetics', 'health'],
    searchCat: 'beauty' },
  { id: 'electronics',  label: 'Electronics & tech', icon: '💻',
    matches: ['electronics'],
    searchCat: 'electronics' },
  { id: 'travel',       label: 'Travel',            icon: '✈️',
    matches: ['travel-and-leisure', 'travel'],
    searchCat: 'travel-and-leisure' },
  { id: 'utilities',    label: 'Utilities',         icon: '📡',
    matches: ['telco', 'utilities'],
    searchCat: 'telco' },
  { id: 'gaming',       label: 'Gaming',            icon: '🎮',
    matches: ['gaming'],
    searchCat: 'gaming' },
  { id: 'sports',       label: 'Sport & outdoors',  icon: '⚽',
    matches: ['sports'],
    searchCat: 'sports' },
];

function BrowseByCategory({ onPickStore, amount }) {
  // Use the full active catalogue, not just featured (17 rows aren't
  // enough to populate 10 categories). useStores() pulls up to 20k.
  const { stores, loading } = useStores();

  const grouped = useMemo(() => {
    return CATEGORY_GROUPS.map((g) => {
      // Find every store that has ANY of the synonym categories.
      const items = stores
        .filter((s) =>
          Array.isArray(s.category) &&
          s.category.some((c) =>
            g.matches.includes(String(c).toLowerCase())
          )
        )
        // Prefer featured stores at the top, then alpha order.
        .sort((a, b) => {
          if (!!b.is_featured - !!a.is_featured !== 0)
            return !!b.is_featured - !!a.is_featured;
          return (a.name || '').localeCompare(b.name || '');
        });
      return { ...g, items: items.slice(0, 5), total: items.length };
    }).filter((g) => g.items.length > 0);
  }, [stores]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading featured stores…
        </CardContent>
      </Card>
    );
  }

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 pb-2 border-b-2 border-primary/20">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-2xl">🗂️</span>
            Browse the retailers
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Not sure which store to look up? Pick from popular UK retailers by category.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map((g) => (
          <Card
            key={g.id}
            className="border-2 border-primary/15 bg-light-pink/15 hover:border-primary/40 hover:bg-light-pink/25 hover:shadow-lg transition-all"
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base">{g.icon}</span>
                  {g.label}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({g.total})
                  </span>
                </h3>
                <Link
                  to={`/search?cat=${encodeURIComponent(g.searchCat)}${amount ? `&amount=${amount}` : ''}`}
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  See all →
                </Link>
              </div>
              <ul className="space-y-1">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => onPickStore(s)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-left transition-colors"
                    >
                      <StoreLogo store={s} size="xs" />
                      <span className="text-sm font-medium truncate">
                        {s.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/40 border-dashed">
        <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Looking for something else? Search all{' '}
              <span className="font-semibold text-foreground">12,000+ stores</span>{' '}
              in the catalogue.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/search">Browse all stores</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

function ComparePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Form state ───────────────────────────────────────────────────
  const initialSlug = searchParams.get('store') || '';
  const initialAmount = searchParams.get('amount') || '';
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [amountInput, setAmountInput] = useState(initialAmount || '100.00');
  const [submitted, setSubmitted] = useState(Boolean(initialSlug));
  // "Browse all" picker open state — modal-style full-catalog list.
  const [browseOpen, setBrowseOpen] = useState(false);

  // Bootstrap from URL — if ?store=tesco was passed, lazy-fetch that
  // store and auto-submit. ONE-SHOT only: once we've applied the URL
  // store the first time, never re-apply. Otherwise clearing the field
  // (X button or "Search another store") gets stomped on the next tick
  // because urlStore is still truthy and selected just went to null.
  const { store: urlStore } = useStoreBySlug(initialSlug || null);
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (urlStore && !selected && !bootstrappedRef.current) {
      bootstrappedRef.current = true;
      setSelected(urlStore);
      setQuery(urlStore.name);
    }
  }, [urlStore, selected]);

  const amountParsed = parseAmount(amountInput);
  const canCompare = Boolean(selected) && amountParsed.ok;

  const handleCompare = () => {
    if (!canCompare) return;
    scrollOnLoadRef.current = true; // arm the post-load scroll
    setSubmitted(true);
    setSearchParams({
      store: selected.slug,
      amount: amountParsed.value.toString(),
    });
  };

  /** Reset the form and scroll back up so the user can run a fresh
   * search without manually clearing the input. Triggered from the
   * "Search another store" button rendered above the results. */
  const handleNewSearch = () => {
    setSelected(null);
    setQuery('');
    setSubmitted(false);
    setSearchParams({});
    requestAnimationFrame(() => {
      document
        .getElementById('compare-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // ── Data for the selected store (only fetched when one is picked) ─
  const storeId = submitted ? selected?.id : null;
  const {
    cashbackOffers,
    pointOffers,
    giftCardOffers,
    loading: offersLoading,
  } = useStoreOffers(storeId);
  const { programs: milesPrograms } = useMilesPrograms();
  const { strategies: curatedStrategies } = useCuratedStrategies(
    storeId,
    selected?.category || null
  );
  const wallet = useUserWallet();
  const { walletOnly } = useWalletOnlyPref();
  const { isPremium } = useSubscription();

  const userWalletForStrategy = useMemo(
    () => buildWalletFilter({ walletOnly, wallet }),
    [walletOnly, wallet]
  );
  const walletFilterActive = userWalletForStrategy !== null;

  // Scroll to results AFTER data settles. Triggered by transition of
  // offersLoading from true → false while submitted. We use a ref flag
  // set by handleCompare so URL-bootstrap (?store=… in fresh load)
  // doesn't auto-scroll the user's view.
  const scrollOnLoadRef = useRef(false);
  useEffect(() => {
    if (!submitted || offersLoading) return;
    if (!scrollOnLoadRef.current) return;
    scrollOnLoadRef.current = false;
    // Two RAFs so layout fully settles before scroll position is read.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('compare-results');
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }, [submitted, offersLoading]);

  const autoStrategies = useMemo(() => {
    if (!submitted || !selected || !amountParsed.ok) return [];
    return computeStrategies({
      store: selected,
      amount: amountParsed.value,
      cashbackOffers,
      pointOffers,
      giftCardOffers,
      milesPrograms,
      userWallet: userWalletForStrategy,
      includeStacks: isPremium,
    });
  }, [
    submitted,
    selected,
    amountParsed.value,
    amountParsed.ok,
    cashbackOffers,
    pointOffers,
    giftCardOffers,
    milesPrograms,
    userWalletForStrategy,
    isPremium,
  ]);

  // Direct Avios eStore baseline for THIS store: max earn_rate among
  // BA Avios point offers × amount. Used by RouteBox so each cashback
  // route can show the Golden Rule comparison: "cashback you'd earn
  // here buys N Avios via Booster vs M Avios via the eStore directly".
  const bestDirectAvios = useMemo(() => {
    if (!submitted || !amountParsed.ok) return 0;
    const aviosOffer = (pointOffers || []).find(
      (p) => /avios|british airways/i.test(p.airline || '')
    );
    if (!aviosOffer) return 0;
    return Math.round(Number(aviosOffer.earn_rate || 0) * amountParsed.value);
  }, [submitted, pointOffers, amountParsed.value, amountParsed.ok]);

  // Unified ranked list (curated converted to £ value + auto items).
  // First box wins — usually curated, but if an auto stack beats it
  // we respect the £ ranking per Bárbara's spec ("best route, no
  // importa se é pro ou nao").
  const rankedRoutes = useMemo(() => {
    if (!submitted) return [];
    const curatedItems = curatedStrategies.map((c) =>
      curatedToItem(c, amountParsed.value || 0, milesPrograms)
    );
    const autoItems = autoStrategies.map(autoToItem);
    const combined = [...curatedItems, ...autoItems];
    combined.sort((a, b) => b.gbpReturn - a.gbpReturn);
    return combined;
  }, [
    submitted,
    curatedStrategies,
    autoStrategies,
    amountParsed.value,
    milesPrograms,
  ]);

  // One clock for every card in this result set. Without it each
  // DataAge would read Date.now() at its own mount, so two rates
  // verified on the same day could render as different ages if the list
  // re-rendered across midnight.
  const routesComputedAt = useMemo(() => Date.now(), [rankedRoutes]);

  // ── Browse → pick a store directly + scroll to the form ──────────
  const handlePickFromBrowse = (store) => {
    setSelected(store);
    setQuery(store.name);
    setSubmitted(false);
    // Don't auto-submit; let the user verify the amount first.
    setTimeout(() => {
      document
        .getElementById('compare-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  return (
    <>
      <Helmet>
        <title>Compare rewards — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <Link
          to="/home"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>

        {/* ─── Hero / Form ──────────────────────────────────────── */}
        <motion.section
          id="compare-form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="pb-2 border-b-2 border-primary/20">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-3xl">⚖️</span>
              Compare rewards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a store and the amount you plan to spend — we&rsquo;ll show
              the best route to earn back.
            </p>
          </div>

          {/* Form card — elevated with shadow + border-2 + visible pink
              tint to anchor it as the page's primary action surface.
              2026-07-05 (Bárbara): use the same inline SearchAutocomplete
              as the dashboard so the search-then-fill-amount-then-Search
              flow is identical wherever it appears. */}
          <Card className="border-2 border-primary/40 shadow-lg bg-light-pink/30">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Store &amp; amount</Label>
                <button
                  type="button"
                  onClick={() => setBrowseOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ChevronDown className="w-3 h-3" />
                  Browse all
                </button>
              </div>

              <SearchAutocomplete
                initialValue={query}
                placeholder="e.g. Sainsbury's"
                amount={amountInput}
                onAmountChange={setAmountInput}
                onPick={(store) => {
                  setSelected(store);
                  // Keep query in sync when the pick fires so the
                  // parent has both string + object aligned.
                  if (store) setQuery(store.name);
                }}
                onSubmit={() => handleCompare()}
              />

              {selected && (
                <p className="text-xs text-emerald-700 font-medium">
                  ✓ Selected: {selected.name}
                </p>
              )}
              {amountInput && !amountParsed.ok && (
                <p className="text-xs text-rose-600">
                  Enter a value of £1.00 or more.
                </p>
              )}
              {!canCompare && selected && amountInput && (
                <p className="text-xs text-muted-foreground">
                  Fill both fields, then press Search to compare.
                </p>
              )}
            </CardContent>
          </Card>

          {walletFilterActive && submitted && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                <span className="inline-flex items-center gap-2 text-foreground/80">
                  <Wallet className="w-4 h-4 text-primary" />
                  Showing only routes from your wallet.
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/settings">Change in Settings</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.section>

        {/* ─── Results ──────────────────────────────────────────── */}
        {submitted && selected && (
          <motion.section
            id="compare-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            {offersLoading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Calculating…
                </CardContent>
              </Card>
            ) : rankedRoutes.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center space-y-2">
                  <p className="text-muted-foreground">
                    No reward routes tracked for {selected.name} yet.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/store/${selected.slug}`}>
                      View store page
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-end justify-between gap-3 pb-2 border-b flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight">
                      Top {Math.min(rankedRoutes.length, 5)} route
                      {Math.min(rankedRoutes.length, 5) === 1 ? '' : 's'} for{' '}
                      {selected.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ranked by best £ return — tap any box to see the steps.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewSearch}
                    className="shrink-0"
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Search another store
                  </Button>
                </div>

                {/* TOP 5 only — all collapsed. User decides which to
                    open. No "see more" link: 5 is the cap, period.
                    `directAvios` = the BEST Avios eStore offer for this
                    store × amount, so each RouteBox can show the
                    Golden Rule comparison (cashback-via-Booster vs
                    direct-eStore). */}
                {rankedRoutes.slice(0, 5).map((item, i) => (
                  <RouteBox
                    key={item.id}
                    item={item}
                    rank={i + 1}
                    isBest={i === 0}
                    amount={amountParsed.value || 0}
                    storeSlug={selected.slug}
                    directAvios={bestDirectAvios}
                    defaultOpen={false}
                    now={routesComputedAt}
                  />
                ))}
              </>
            )}
          </motion.section>
        )}

        {/* ─── Divider: shown only on the initial state to signal
              "if you don't know the store, browse instead" ───────── */}
        {!submitted && (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        )}

        {/* ─── Browse by category (for users without a store in mind) ─ */}
        <section className="pt-2">
          <BrowseByCategory
            onPickStore={handlePickFromBrowse}
            amount={amountParsed.ok ? amountParsed.value : null}
          />
        </section>

        {/* ─── Footer: link to Compare Cards (moved from a tab) ─── */}
        <div className="text-center pt-2 pb-4 border-t">
          <p className="text-xs text-muted-foreground pt-4 flex items-center justify-center gap-3 flex-wrap">
            <span>Looking for cards instead of stores?</span>
            <Link
              to="/cards"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Compare credit cards
            </Link>
          </p>
        </div>
      </div>

      {/* Browse-all modal: opens when user clicks "Browse all" next to
          the autocomplete. Lets people scroll the full catalogue
          instead of typing. */}
      <AllStoresPicker
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={(s) => {
          setSelected(s);
          setQuery(s.name);
        }}
      />
    </>
  );
}

export default ComparePage;
