/**
 * LiveCompare — "which route pays most today" for one store, inside a
 * curated strategy card.
 *
 * Owner's decision of 18/10/2026 (docs/DECISAO_NX_ESTRATEGIAS_2026-10-18.md,
 * afternoon version): every NX strategy becomes a comparison. For the
 * amount the customer types, list the single routes that exist today
 * (NX, Avios eStore, cashback sites, gift card discount), the sum for
 * each, and the best one on top. Nothing is added together: NX does not
 * pay when the order is paid with a gift card, so each route stands
 * alone. Uses the same live offers and maths as the store page
 * (computeStrategies with includeStacks off), so the numbers agree.
 */

import { useMemo, useState } from 'react';
import { Trophy, Info } from 'lucide-react';
import { useStoreOffers, useMilesPrograms } from '@/hooks/useCatalog';
import { computeStrategies, isNxPlatform } from '@/lib/strategies';
import { cn } from '@/lib/utils';

const DEFAULT_AMOUNT = 100;

// NX Rewards rules the customer needs before choosing it: from the NX
// home page and its Special Terms (Deliveroo, Boots), read 18/10/2026.
const NX_NOTES = [
  'NX Rewards is a paid membership (monthly fee, 30-day free trial).',
  'No cashback if you pay with a gift card, or order in the store’s own app.',
  'Some products are excluded, and cashback is on the price before delivery.',
];

function routeValue(route) {
  if (route.type === 'points') {
    return `${route.gbpReturnDisplay} (≈ £${route.gbpReturn.toFixed(2)})`;
  }
  return route.gbpReturnDisplay;
}

export function LiveCompare({ storeId, storeName }) {
  const [amountText, setAmountText] = useState(String(DEFAULT_AMOUNT));
  const amount = Math.max(0, Number(amountText) || 0);
  const { cashbackOffers, pointOffers, giftCardOffers, loading } = useStoreOffers(storeId);
  const { programs: milesPrograms } = useMilesPrograms();

  const routes = useMemo(
    () =>
      computeStrategies({
        amount,
        cashbackOffers,
        pointOffers,
        giftCardOffers,
        milesPrograms,
        includeStacks: false,
      }).filter((r) => r.gbpReturn > 0),
    [amount, cashbackOffers, pointOffers, giftCardOffers, milesPrograms]
  );

  const best = routes[0];
  const hasNx = routes.some((r) => r.layers?.some((l) => isNxPlatform(l.platform)));

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold">
          Compare today{storeName ? ` at ${storeName}` : ''}
        </p>
        <label className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Order £</span>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
            aria-label="Order amount in pounds"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading today’s offers…</p>
      ) : routes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No checked offers for this store right now.</p>
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2">
            <Trophy className="w-4 h-4" />
            Best for you: {best.title} — {routeValue(best)}
          </p>
          <ul className="space-y-1">
            {routes.map((r) => (
              <li
                key={r.id}
                className={cn(
                  'flex items-baseline justify-between gap-3 text-sm',
                  r === best ? 'font-semibold' : 'text-muted-foreground'
                )}
              >
                <span className="min-w-0">
                  {r.title} <span className="text-xs">· {r.subtitle}</span>
                </span>
                <span className="shrink-0 tabular-nums">{routeValue(r)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            One route per order: these don’t add up. Avios valued at £0.0092 each, as an estimate.
          </p>
        </>
      )}

      {hasNx && (
        <ul className="mt-2 space-y-0.5 border-t border-primary/10 pt-2">
          {NX_NOTES.map((note) => (
            <li key={note} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LiveCompare;
