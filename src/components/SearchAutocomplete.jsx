import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStores, useLiveStoreIds } from '@/hooks/useCatalog';
import { rankStores, dedupeByName, hasNoOffers } from '@/lib/storeSearch';
import { StoreLogo } from '@/components/StoreLogo';
import { cn } from '@/lib/utils';

/**
 * SearchAutocomplete — search input with a live store dropdown.
 *
 * Behaviour:
 *   - As user types, shows up to 8 matching stores (substring on name).
 *   - ↑ / ↓ navigate the list, Enter opens the highlighted store.
 *   - Submitting without highlighting any item calls onSubmit(query)
 *     so the caller can still navigate to a search results page.
 *   - Esc / outside-click closes the dropdown.
 *
 * @param {object} props
 * @param {string} [props.initialValue]  prefill text in the input
 * @param {(query: string, amount?: string) => void} [props.onSubmit]
 *   free-form submit handler; receives the current amount too when
 *   the parent passed one via the `amount` prop
 * @param {string} [props.placeholder]
 * @param {boolean} [props.autoFocus]
 * @param {string} [props.size]   'lg' renders larger inputs (home hero)
 * @param {string} [props.amount] optional purchase amount. When set,
 *   picking a store from the dropdown goes straight into the compare
 *   flow with `?store=<slug>&amount=<amount>` instead of the plain
 *   /store page — one tap from dashboard to a real comparison.
 * @param {(next: string) => void} [props.onAmountChange] if provided,
 *   an inline £ amount input renders between the search field and
 *   the submit button. The parent owns the state.
 * @param {(store: object | null) => void} [props.onPick] fires when the
 *   user picks a store from the dropdown OR clears it by editing the
 *   text. `store` is the full store record on pick, `null` on clear.
 *   When provided, the parent owns the "selected store" state — the
 *   component stops tracking it internally and lets the parent decide
 *   what submit does (e.g. compare page validates + fires its own
 *   handleCompare instead of navigating). Dashboard-style callers can
 *   ignore this and keep the default navigate-on-submit behaviour.
 */
export function SearchAutocomplete({
  initialValue = '',
  onSubmit,
  placeholder = 'Search a store…',
  autoFocus = false,
  size = 'lg',
  amount,
  onAmountChange,
  onPick,
}) {
  const navigate = useNavigate();
  const { stores } = useStores();
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  // Slug of the store the user picked from the dropdown. Held here
  // (not navigated to immediately) so the parent-owned amount input
  // gets a chance to be filled in before Search is pressed.
  // Cleared as soon as the user edits the input text after picking,
  // so we don't end up submitting a stale slug.
  // (Bárbara 2026-07-05.)
  const [pickedSlug, setPickedSlug] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  // "Pick-then-submit" mode: dropdown selection only fills the input
  // and remembers the slug; navigation waits for form submit. We
  // enable it when the parent hands us an amount handler — that
  // signals a hero-style form where the user is meant to fill the £
  // amount before continuing. Other callers (e.g. SearchPage) keep
  // the older click-to-navigate behaviour.
  const pickMode = typeof onAmountChange === 'function';

  // Sync controlled value with prop changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Candidates: exact, then starts-with, then contains (the first 40).
  // Then stores with a live offer move to the top (lib/storeSearch.js,
  // handover 14/11/2026, task E: "John Lewis" listed an empty store next
  // to "John Lewis & Partners").
  const candidates = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return rankStores(stores, q, null).slice(0, 40);
  }, [value, stores]);
  const live = useLiveStoreIds(candidates.map((s) => s.id));

  const matches = useMemo(() => {
    if (!candidates.length) return [];
    // 2026-07-05 (Bárbara): the stores catalogue has near-duplicate rows
    // from scraper slug drift ("adidas" vs "adidas-shop", "Sainsbury's
    // Groceries" vs "Sainsbury's Grocery"). Keep the first row per
    // normalised name; after the live-first order that is the row with
    // offers.
    return dedupeByName(rankStores(candidates, value.trim(), live)).slice(0, 8);
  }, [candidates, value, live]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = open && matches.length > 0;

  // Build the target for a picked store. When the parent passed an
  // `amount`, we jump directly into the compare flow with the value
  // pre-filled — that's one tap from dashboard search to a real
  // comparison, which is what Bárbara asked for (2026-07-05).
  const storeHref = (slug) => {
    if (amount && String(amount).trim()) {
      return `/compare?store=${encodeURIComponent(slug)}&amount=${encodeURIComponent(String(amount).trim())}`;
    }
    return `/store/${slug}`;
  };

  // Picking a store from the dropdown. In pickMode, we ONLY fill the
  // input and remember the slug — no navigation. The user then fills
  // in the amount and presses Search to actually go. In default mode
  // we behave like before and navigate immediately.
  const pickStore = (store) => {
    if (!store) return;
    if (pickMode) {
      setValue(store.name);
      setOpen(false);
      setHighlighted(-1);
      // Ownership split:
      //   - onPick present: the parent tracks selection. We just
      //     hand it the row and stay silent internally.
      //   - onPick absent: we track pickedSlug ourselves so the
      //     next submit knows where to navigate (dashboard default).
      if (typeof onPick === 'function') onPick(store);
      else setPickedSlug(store.slug);
      // Move focus to the amount field so the user can type right away.
      requestAnimationFrame(() => {
        const amountEl = containerRef.current?.querySelector('input[type="number"]');
        (amountEl || inputRef.current)?.focus();
      });
      return;
    }
    navigate(storeHref(store.slug));
    setOpen(false);
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (pickMode) {
      // Parent-owned selection (Compare page): notify onPick if the
      // typed text is an exact store name AND nothing was picked yet
      // (covers the "user typed the whole name and hit Enter" flow),
      // then hand off to onSubmit and let the parent do whatever it
      // needs (usually its own validated compare submit).
      if (typeof onPick === 'function') {
        const q = value.trim().toLowerCase();
        if (q) {
          const exact = stores.find((s) => s.name.toLowerCase() === q);
          if (exact) onPick(exact);
        }
        if (onSubmit) onSubmit(value.trim(), amount);
        setOpen(false);
        return;
      }
      // Dashboard-style: we own selection via pickedSlug and navigate
      // ourselves. Fall through if there's no slug and no exact match
      // → hand off to onSubmit for free-text search.
      let slug = pickedSlug;
      if (!slug) {
        const q = value.trim().toLowerCase();
        const exact = stores.find((s) => s.name.toLowerCase() === q);
        if (exact) slug = exact.slug;
      }
      if (slug) {
        navigate(storeHref(slug));
        setOpen(false);
        return;
      }
      if (onSubmit) onSubmit(value.trim(), amount);
      return;
    }
    // Legacy behaviour for callers that didn't opt into pick mode:
    // arrow-key highlight = immediate navigate.
    if (highlighted >= 0 && matches[highlighted]) {
      navigate(storeHref(matches[highlighted].slug));
      setOpen(false);
      return;
    }
    if (onSubmit) onSubmit(value.trim(), amount);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    } else if (e.key === 'Enter') {
      // In pickMode, if the user has a dropdown row highlighted,
      // pressing Enter should PICK it (fill the input) rather than
      // submit the form. That matches the "type → pick → fill amount
      // → Search" flow Bárbara asked for. Without a highlight, the
      // event falls through and the form submit runs normally.
      if (pickMode && highlighted >= 0 && matches[highlighted]) {
        e.preventDefault();
        pickStore(matches[highlighted]);
      }
    }
  };

  const inputHeight = size === 'lg' ? 'h-12' : 'h-10';

  return (
    <form
      ref={containerRef}
      onSubmit={submit}
      className="relative flex flex-row gap-2 md:gap-3 max-w-3xl items-center"
      role="search"
    >
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setHighlighted(-1);
            // User edited after picking → any previous selection is
            // now stale. Clear both the internal slug (dashboard-style
            // callers) AND notify onPick(null) so parents like Compare
            // that own the selection can drop it.
            if (pickedSlug) setPickedSlug('');
            if (typeof onPick === 'function') onPick(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn('pl-10 text-base', inputHeight)}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="search-suggestions"
        />

        {showDropdown && (
          <ul
            id="search-suggestions"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-xl shadow-lg z-50 max-h-80 overflow-auto py-1"
          >
            {matches.map((store, i) => {
              const rowClasses = cn(
                'flex items-center gap-3 px-3 py-2.5 transition-colors w-full text-left',
                i === highlighted ? 'bg-muted' : 'hover:bg-muted/60'
              );
              const rowInner = (
                <>
                  <StoreLogo store={store} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{store.name}</div>
                    {hasNoOffers(store, live) && (
                      <div className="text-xs text-muted-foreground">No offers yet</div>
                    )}
                    {(() => {
                      // Sainsbury's has category=[gift-card, groceries] so the
                      // dropdown was rendering "Gift-Card", which makes users
                      // think the store is gift-cards-only. "gift-card" is a
                      // product-type marker, not a real category — prefer any
                      // real category (Groceries, Fashion, etc.) and fall back
                      // to gift-card only when there's genuinely nothing else.
                      const cats = Array.isArray(store.category) ? store.category : [];
                      const primary = cats.find((c) => c !== 'gift-card') || cats[0];
                      if (!primary) return null;
                      return (
                        <div className="text-xs text-muted-foreground capitalize truncate">
                          {String(primary).replace(/-/g, ' ')}
                        </div>
                      );
                    })()}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </>
              );
              return (
                <li key={store.id} role="option" aria-selected={i === highlighted}>
                  {pickMode ? (
                    <button
                      type="button"
                      onMouseEnter={() => setHighlighted(i)}
                      onMouseDown={(e) => {
                        // Prevent the input from losing focus before we
                        // process the pick, which would close the dropdown
                        // before onClick fires reliably on mobile Safari.
                        e.preventDefault();
                      }}
                      onClick={() => pickStore(store)}
                      className={rowClasses}
                    >
                      {rowInner}
                    </button>
                  ) : (
                    <Link
                      to={storeHref(store.slug)}
                      onMouseEnter={() => setHighlighted(i)}
                      onClick={() => setOpen(false)}
                      className={rowClasses}
                    >
                      {rowInner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Inline £ amount input — rendered only when the parent wired
          up onAmountChange. Sits between the store field and the
          submit button so the user reads left → right: store → value →
          go. Compact width (w-24) keeps the row fitting a 375px phone. */}
      {onAmountChange && (
        <div className="relative shrink-0 w-24 md:w-32">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base pointer-events-none"
            aria-hidden="true"
          >
            £
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            placeholder="100"
            value={amount ?? ''}
            onChange={(e) => onAmountChange(e.target.value)}
            aria-label="Purchase amount in pounds"
            className={cn('pl-7 text-base', inputHeight)}
          />
        </div>
      )}
      <Button
        type="submit"
        size={size === 'lg' ? 'lg' : 'default'}
        className={cn('shrink-0', size === 'lg' ? 'h-12 px-4 md:px-6' : '')}
      >
        <Search className="w-4 h-4 md:hidden" />
        <span className="hidden md:inline">Search</span>
      </Button>
    </form>
  );
}

export default SearchAutocomplete;
