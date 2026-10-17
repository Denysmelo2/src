/**
 * /learn/platforms — onboarding catalogue of every cashback / loyalty
 * platform we integrate. Two purposes:
 *   1. Help new users decide which 3-4 platforms to actually sign up
 *      for first (we recommend the featured ones).
 *   2. Drive referral signups via our affiliate links so SnapGain
 *      earns when the user joins NX / TC / Quidco / Avios.
 *
 * Content lives in `public.platforms_explained` and is editable in SQL
 * without needing a redeploy.
 */

import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Check,
  X,
  Star,
  GraduationCap,
  Sparkles,
  Filter,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/FilterChip';
import { usePlatformsExplained } from '@/hooks/useCatalog';

const CATEGORY_LABELS = {
  cashback: 'Cashback portals',
  'gift-card': 'Gift card discounts',
  bank: 'Banks & fintech',
  airline: 'Airline loyalty',
  rent: 'Rent rewards',
  loyalty: 'Supermarket loyalty',
  app: 'Apps & extras',
};

const CATEGORY_ORDER = [
  'gift-card',
  'cashback',
  'airline',
  'bank',
  'rent',
  'loyalty',
  'app',
];

function DifficultyBadge({ level }) {
  const styles = {
    easy: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    expert: 'bg-rose-100 text-rose-700',
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        styles[level] || styles.easy
      }`}
    >
      {level}
    </span>
  );
}

function PlatformCard({ platform }) {
  const url = platform.signup_url || platform.homepage_url;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{ backgroundColor: platform.brand_color || '#6366f1' }}
            >
              {platform.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg leading-tight flex items-center gap-2">
                {platform.name}
                {platform.is_featured && (
                  <Star className="w-4 h-4 fill-primary text-primary" />
                )}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1">
                <DifficultyBadge level={platform.difficulty} />
                {platform.typical_rate_label && (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {platform.typical_rate_label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2 leading-relaxed">
          {platform.one_liner}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          {platform.description}
        </p>

        {(platform.pros?.length > 0 || platform.cons?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {platform.pros?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                  Why use it
                </h4>
                <ul className="space-y-1">
                  {platform.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {platform.cons?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-1.5">
                  Watch out for
                </h4>
                <ul className="space-y-1">
                  {platform.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {(platform.payout_method || platform.min_payout || platform.approval_window) && (
          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            {platform.payout_method && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Payout
                </div>
                <div className="font-medium leading-tight">{platform.payout_method}</div>
              </div>
            )}
            {platform.min_payout && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Min
                </div>
                <div className="font-medium leading-tight">{platform.min_payout}</div>
              </div>
            )}
            {platform.approval_window && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Confirms in
                </div>
                <div className="font-medium leading-tight">{platform.approval_window}</div>
              </div>
            )}
          </div>
        )}

        {/* Subscription tiers (NX/Revolut/Monzo) — verified against the
            official sites on 2026-05-19. Shows a compact pill row that
            makes "this isn't free" obvious BEFORE the user signs up,
            and surfaces the verified £/month so we don't have to write
            it into the prose. */}
        {Array.isArray(platform.pricing_tiers) && platform.pricing_tiers.length > 0 && (
          <div className="pt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Plans
            </div>
            <div className="flex flex-wrap gap-1.5">
              {platform.pricing_tiers.map((tier, i) => {
                const isFree = Number(tier.monthly_gbp) === 0;
                return (
                  <span
                    key={i}
                    title={tier.note || ''}
                    className={
                      'inline-flex items-baseline gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ' +
                      (isFree
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-muted/40 border-border text-foreground/80')
                    }
                  >
                    <span className="font-semibold">{tier.name}</span>
                    <span className="text-muted-foreground">
                      {isFree
                        ? 'Free'
                        : `£${tier.monthly_gbp}/mo${
                            tier.annual_gbp ? ` · £${tier.annual_gbp}/yr` : ''
                          }`}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-4 pt-0">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="block"
          >
            <Button className="w-full" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Get started with SnapGain
            </Button>
          </a>
        ) : null}
      </div>
    </Card>
  );
}

function PlatformsLearnPage() {
  const { platforms, loading } = usePlatformsExplained();
  const [activeCategory, setActiveCategory] = useState('all');

  const grouped = useMemo(() => {
    const byCat = new Map();
    platforms.forEach((p) => {
      if (!byCat.has(p.category)) byCat.set(p.category, []);
      byCat.get(p.category).push(p);
    });
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      id: c,
      label: CATEGORY_LABELS[c] || c,
      items: byCat.get(c),
    }));
  }, [platforms]);

  const visible =
    activeCategory === 'all'
      ? grouped
      : grouped.filter((g) => g.id === activeCategory);

  const featured = platforms.filter((p) => p.is_featured);

  return (
    <>
      <Helmet>
        <title>Platform guide — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Home
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            Platform guide
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Every cashback portal, gift-card app, bank and airline loyalty
            programme that powers SnapGain&rsquo;s strategies. Read up, sign
            up, and start stacking.
          </p>
        </motion.section>

        {!loading && featured.length > 0 && (
          <Card className="bg-light-pink/30 border-primary/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Start here
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                If you&rsquo;re brand new, sign up for these 4-5 platforms
                first. They unlock the biggest curated strategies.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {featured.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs font-semibold px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: p.brand_color || '#6366f1' }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && grouped.length > 1 && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Category
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  label={`All (${platforms.length})`}
                  active={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                />
                {grouped.map((g) => (
                  <FilterChip
                    key={g.id}
                    label={`${g.label} (${g.items.length})`}
                    active={activeCategory === g.id}
                    onClick={() => setActiveCategory(g.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading platforms…
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No platforms in this category.
            </CardContent>
          </Card>
        ) : (
          visible.map((group) => (
            <section key={group.id} className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight">{group.label}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.items.map((p) => (
                  <PlatformCard key={p.id} platform={p} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

export default PlatformsLearnPage;
