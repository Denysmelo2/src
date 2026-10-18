/**
 * CuratedStrategyCard — renders a multi-step strategy from
 * public.curated_strategies. Each step shows its action button
 * (affiliate link, store locator, etc.) so the user can execute the
 * plan tap-by-tap without leaving the flow.
 *
 * Steps with `is_online === false` (in-store steps) get a different
 * treatment — the action button opens the retailer's homepage / store
 * locator so the user can find the closest branch themselves.
 *
 * Props:
 *   strategy      — row from `curated_strategies`
 *   defaultOpen?  — start expanded (default true for hero card, false for list)
 *   compact?      — denser layout for the StrategyPage alternative-routes list
 *   onOpenStep?   — callback (step, idx) when an action is opened (for analytics)
 *   locked?       — show a paywall overlay instead of action buttons
 *   onLockedClick? — handler for the upgrade CTA
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gift,
  Wallet,
  ShoppingBag,
  Store,
  Phone,
  Plane,
  Link as LinkIcon,
  RefreshCcw,
  Calendar,
  Home as HomeIcon,
  Edit3,
  Star,
  MapPin,
  Banknote,
  Car,
  Lock,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { reviewedLabel } from '@/lib/dataFreshness';

const ICONS = {
  'gift-card': Gift,
  'credit-card': CreditCard,
  wallet: Wallet,
  'shopping-bag': ShoppingBag,
  store: Store,
  phone: Phone,
  plane: Plane,
  link: LinkIcon,
  refresh: RefreshCcw,
  calendar: Calendar,
  home: HomeIcon,
  edit: Edit3,
  star: Star,
  'map-pin': MapPin,
  banknote: Banknote,
  car: Car,
};

function stepIcon(name) {
  return ICONS[name] || ShoppingBag;
}

function DifficultyBadge({ level }) {
  const styles = {
    easy: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    expert: 'bg-rose-100 text-rose-700',
  };
  return (
    <span
      className={cn(
        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
        styles[level] || styles.medium
      )}
    >
      {level}
    </span>
  );
}

function Step({ step, idx, onOpen, locked }) {
  const Icon = stepIcon(step.icon);
  const hasAction = Boolean(step.action_url);
  const inStore = step.is_online === false;

  const handleClick = () => {
    if (locked || !hasAction) return;
    onOpen?.(step, idx);
  };

  return (
    <li className="flex gap-3">
      {/* Numbered marker */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {step.step ?? idx + 1}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold leading-snug flex items-center gap-1.5">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span>{step.title}</span>
            </h4>
            {step.detail && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {step.detail}
              </p>
            )}

            {/* Earnings line */}
            {(step.earn_pct != null || step.earn_points != null) && (
              <div className="flex flex-wrap gap-2 mt-1.5">
                {step.earn_pct != null && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    +{step.earn_pct}%
                  </span>
                )}
                {step.earn_points != null && (
                  <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                    +{step.earn_points.toLocaleString('en-GB')}{' '}
                    {step.earn_points_program?.split(' ').slice(-1)[0] || 'pts'}
                  </span>
                )}
                {step.platform && (
                  <span className="text-xs text-muted-foreground">
                    via {step.platform}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action button */}
          {hasAction ? (
            locked ? (
              <Button size="sm" variant="outline" disabled className="shrink-0">
                <Lock className="w-3.5 h-3.5 mr-1" />
                Unlock
              </Button>
            ) : (
              <a
                href={step.action_url}
                target="_blank"
                rel="sponsored noopener noreferrer"
                onClick={handleClick}
                className="shrink-0"
              >
                <Button size="sm" variant={inStore ? 'outline' : 'default'}>
                  {inStore ? (
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  )}
                  {step.action_label || (inStore ? 'Find store' : 'Open')}
                </Button>
              </a>
            )
          ) : inStore ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1 rounded bg-muted">
              In-store
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function CuratedStrategyCard({
  strategy,
  defaultOpen = true,
  compact = false,
  onOpenStep,
  locked = false,
  onLockedClick,
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!strategy) return null;
  const steps = Array.isArray(strategy.steps) ? strategy.steps : [];
  const heroLabel =
    strategy.hero_return_label ||
    (strategy.hero_return_pct != null
      ? `${strategy.hero_return_pct}% cashback`
      : 'Multi-step strategy');

  return (
    <Card
      className={cn(
        'overflow-hidden border-2 border-primary/30',
        compact ? 'border-primary/20' : 'shadow-lg'
      )}
    >
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="w-3 h-3" />
                Pro Strategy
              </span>
              <DifficultyBadge level={strategy.difficulty} />
              {strategy.is_premium === false && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Free in trial
                </span>
              )}
            </div>
            <CardTitle
              className={cn('leading-tight', compact ? 'text-base' : 'text-xl')}
            >
              {strategy.title}
            </CardTitle>
            {reviewedLabel(strategy.updated_at) && (
              <p className="mt-1 text-[11px] leading-none text-muted-foreground">
                {reviewedLabel(strategy.updated_at)}
              </p>
            )}
            {strategy.description && !compact && (
              <CardDescription className="mt-1.5 leading-relaxed">
                {strategy.description}
              </CardDescription>
            )}
          </div>

          {/* Hero return badge */}
          <div className="shrink-0 text-right">
            <div
              className={cn(
                'font-extrabold gradient-text leading-none',
                compact ? 'text-xl' : 'text-3xl'
              )}
            >
              {strategy.hero_return_pct != null
                ? `${strategy.hero_return_pct}%`
                : '★'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              {heroLabel}
            </div>
          </div>
        </div>

        {/* Tags chips */}
        {!compact && strategy.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {strategy.tags.slice(0, 5).map((t) => (
              <span
                key={t}
                className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'pb-3')}>
        {/* Toggle steps button (for compact) */}
        {compact && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary mb-2 hover:underline"
          >
            {open ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {open
              ? `Hide ${steps.length} steps`
              : `Show ${steps.length} steps`}
          </button>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ol className="space-y-0 pl-0">
                {steps.map((step, i) => (
                  <Step
                    key={i}
                    step={step}
                    idx={i}
                    onOpen={onOpenStep}
                    locked={locked}
                  />
                ))}
              </ol>

              {locked && (
                <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-semibold">Unlock the action links</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={onLockedClick}
                    className="shrink-0"
                  >
                    Upgrade
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bonus points footer (for compact cards collapsed) */}
        {!open && strategy.bonus_points != null && (
          <p className="text-xs text-sky-700 font-medium">
            + {strategy.bonus_points.toLocaleString('en-GB')}{' '}
            {strategy.bonus_points_program?.split(' ').slice(-1)[0] || 'pts'} per £100
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default CuratedStrategyCard;
