/**
 * AutoStrategyCard — single auto-generated strategy row (from the
 * computeStrategies engine). Used alongside CuratedStrategyCard inside
 * the unified Strategies tab on StoreDetailPage.
 *
 * Each row gets a one-word descriptive LABEL so the user can scan
 * quickly: "Easier", "Avios only", "Quick win", "Cashback only", etc.
 * Per Bárbara: "as pessoas não gostam de pensar, querem a resposta
 * pronta, só clicar nos botões".
 */
import { ExternalLink, ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RateBreakdown } from '@/components/RateBreakdown';
import { DataAge } from '@/components/DataAge';
import { oldestVerifiedAt } from '@/lib/dataFreshness';
import { cn } from '@/lib/utils';

/**
 * Pick a short human label for an auto-generated strategy so the user
 * understands its niche at a glance. Heuristic-based — falls back to
 * the type ("Stack", "Cashback") when nothing else fits.
 */
export function labelForStrategy(strategy) {
  if (!strategy) return null;
  const type = strategy.type || '';
  const layers = strategy.layers || [];
  const layerKinds = layers.map((l) => l.kind);

  if (type === 'points' || (layerKinds.length === 1 && layerKinds[0] === 'points')) {
    return 'Avios only';
  }
  if (type === 'gift_card' || (layerKinds.length === 1 && layerKinds[0] === 'gift_card')) {
    return 'Gift card';
  }
  if (type === 'cashback' || (layerKinds.length === 1 && layerKinds[0] === 'cashback')) {
    return 'Cashback only';
  }
  // Stacks
  if (type === 'stack') {
    if (layerKinds.includes('points')) return 'Stack + Avios';
    if (layers.length === 2) return 'Easier stack';
    return 'Stack';
  }
  return type ? type.replace('_', ' ') : 'Route';
}

export function AutoStrategyCard({
  strategy,
  rank,
  storeSlug,
  amount = 100,
  highlight = false,
}) {
  if (!strategy) return null;
  const label = labelForStrategy(strategy);
  const url = strategy.openUrl || null;
  const external = url && /^https?:\/\//i.test(url);
  const breakdown =
    strategy.rateBreakdown && strategy.rateBreakdown.length > 0
      ? strategy.rateBreakdown
      : strategy.layers?.find((l) => l.kind === 'cashback')?.rateBreakdown;

  return (
    <Card
      className={cn(
        'transition-shadow',
        highlight && 'border-primary/40'
      )}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {rank != null && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  #{rank}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70 bg-muted px-2 py-0.5 rounded-full">
                {label}
              </span>
            </div>
            <h4 className="text-sm font-semibold leading-snug">
              {strategy.title}
            </h4>
            {strategy.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {strategy.subtitle}
              </p>
            )}
            {/* When the figure above was last checked against the
                provider. For a stack this is the OLDEST of its layers:
                the route is only as current as its stalest part. */}
            <div className="mt-1">
              <DataAge verifiedAt={oldestVerifiedAt(strategy.layers)} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold gradient-text leading-none">
              {strategy.gbpReturnDisplay}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              on £{amount}
            </div>
          </div>
        </div>

        {breakdown && (
          <div className="mt-3">
            <RateBreakdown breakdown={breakdown} compact />
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {url && (
            <a
              href={external ? url : undefined}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex-1 min-w-[120px]"
            >
              <Button size="sm" className="w-full" variant={highlight ? 'default' : 'outline'}>
                {external ? <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> : null}
                Open
              </Button>
            </a>
          )}
          {storeSlug && (
            <a
              href={`/strategy?store=${encodeURIComponent(storeSlug)}&amount=${amount}&route=${encodeURIComponent(strategy.id || '')}`}
              className="shrink-0"
            >
              <Button size="sm" variant="ghost">
                Steps
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AutoStrategyCard;
