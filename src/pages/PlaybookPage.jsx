/**
 * /playbook — full library of curated Pro Strategies, including the
 * lifestyle ones (Ribbon Rewards, Revolut Ultra, BP & Esso, Monzo +
 * PayPoint) that don't tie to a single store but stand on their own.
 *
 * Strategies are grouped by category. Each category collapses by
 * default after the first one so the page doesn't overwhelm on first
 * load. Filter chips up top jump straight to a category.
 */

import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Filter, GraduationCap, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCuratedPlaybook } from '@/hooks/useCatalog';
import { CuratedStrategyCard } from '@/components/CuratedStrategyCard';
import { FilterChip } from '@/components/FilterChip';

// Human-readable labels + ordering for the category groups.
const CATEGORY_ORDER = [
  ['supermarket',    'Supermarkets'],
  ['food-delivery',  'Food delivery'],
  ['transport',      'Transport'],
  ['beauty',         'Beauty & grooming'],
  ['gift-card',      'Gift cards (everywhere)'],
  ['fuel',           'Fuel'],
  ['rent',           'Rent'],
  ['banking',        'Banking & cards'],
  ['general',        'General / multi-store'],
];

function PlaybookPage() {
  const { strategies, loading } = useCuratedPlaybook();
  const [activeCategory, setActiveCategory] = useState('all');

  const groups = useMemo(() => {
    const byCat = new Map();
    strategies.forEach((s) => {
      const key = s.category || 'general';
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key).push(s);
    });
    // Return categories in our preferred order, plus any unknowns at end.
    const known = CATEGORY_ORDER.filter(([id]) => byCat.has(id)).map(
      ([id, label]) => ({ id, label, items: byCat.get(id) })
    );
    const unknown = Array.from(byCat.keys())
      .filter((k) => !CATEGORY_ORDER.some(([id]) => id === k))
      .map((id) => ({ id, label: id, items: byCat.get(id) }));
    return [...known, ...unknown];
  }, [strategies]);

  const visibleGroups =
    activeCategory === 'all'
      ? groups
      : groups.filter((g) => g.id === activeCategory);

  return (
    <>
      <Helmet>
        <title>The Playbook — SnapGain</title>
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
            <BookOpen className="w-8 h-8 text-primary" />
            The Playbook
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Every curated multi-step strategy we&rsquo;ve built into SnapGain
            &mdash; from the 21% Deliveroo triple stack to lifestyle
            plays like earning Avios on your rent. Each step opens the right
            platform with one tap.
          </p>
        </motion.section>

        <Card className="bg-light-green/30 border-accent/30">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">
                  New to UK cashback?
                </p>
                <p className="text-xs text-muted-foreground">
                  Read the platform guide — what each one does, sign-up links, payout details.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/learn/platforms">
                Read the guide
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Category chips */}
        {!loading && groups.length > 1 && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Category
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  label="All"
                  active={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                />
                {groups.map((g) => (
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
              Loading playbook…
            </CardContent>
          </Card>
        ) : visibleGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No strategies in this category yet.
            </CardContent>
          </Card>
        ) : (
          visibleGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.items.map((s) => (
                  <CuratedStrategyCard
                    key={s.id}
                    strategy={s}
                    defaultOpen={false}
                    compact
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

export default PlaybookPage;
