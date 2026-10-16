/**
 * RateBreakdown — collapsible table that discloses the per-sub-category
 * cashback rate breakdown when a platform exposes one (Quidco, etc.).
 *
 * Why this exists: most aggregator sites only show the headline rate
 * (e.g. "30%"), which is the MAX across all sub-categories. The real
 * rate a user receives depends on what they buy:
 *   - SHEIN headline 16.8% — New Customer 16.8% / Existing Customer 2.4%
 *   - Hostinger headline 56% — Horizons 56% / Hosting 32% / Domain 16%
 *
 * Hiding that variance from the user is what loses trust over time.
 * SnapGain's edge is full disclosure.
 *
 * Props:
 *   breakdown: Array<{ name: string, rate: number, tag?: string }>
 *   defaultOpen?: boolean — start expanded (defaults to "expanded when there's variance")
 *   compact?: boolean — slightly tighter layout for in-route-card use
 */
import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

export function RateBreakdown({ breakdown, defaultOpen, compact = false }) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;

  const rates = breakdown.map((r) => r.rate).filter((v) => v != null);
  const maxRate = rates.length ? Math.max(...rates) : null;
  const minRate = rates.length ? Math.min(...rates) : null;
  const hasVariance = rates.length > 1 && maxRate !== minRate;

  const [expanded, setExpanded] = useState(
    defaultOpen != null ? defaultOpen : hasVariance
  );

  // Single-tier breakdown with no variance adds no info — show nothing.
  if (!hasVariance && breakdown.length <= 1) return null;

  return (
    <div className={`rounded-md border border-border/60 bg-muted/30 ${compact ? '' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} text-xs font-medium text-foreground/80 hover:text-foreground`}
        aria-expanded={expanded}
      >
        <span>
          Rate breakdown
          {hasVariance && (
            <span className="ml-1 text-muted-foreground">
              ({minRate}% – {maxRate}%)
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-border/60 divide-y divide-border/40">
          {breakdown.map((row, i) => (
            <div
              key={`${row.name}-${i}`}
              className={`flex items-center justify-between ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'} text-xs`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate text-foreground/80">{row.name}</span>
                {row.tag && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-light-green/60 text-accent-foreground">
                    {row.tag}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {row.rate}%
              </span>
            </div>
          ))}
          {hasVariance && (
            <div className={`${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} text-[11px] text-muted-foreground inline-flex items-start gap-1`}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Actual rate depends on which product or category you buy.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RateBreakdown;
