// /deals/supermarket — "Highest Supermarket Deal"
//
// Lists the best active cashback rate for each UK grocery chain today,
// sorted highest first. Each row links straight to the offer (platform
// affiliate URL), opening in a new tab.
//
// Data flow: fetch all grocery stores → fetch all active cashback
// offers for those stores in one query → pick the best (highest rate)
// offer per store on the client. Two queries total, no N+1.

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { hiddenBeforeIso } from '@/lib/dataFreshness';
import { StoreLogo } from '@/components/StoreLogo';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { RateBreakdown } from '@/components/RateBreakdown';
import { cn } from '@/lib/utils';

const isExternal = (url) => /^https?:\/\//i.test(url || '');

function SupermarketDealsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetch = async () => {
      setLoading(true);
      // `category` is a text[] column — must use `cs` (contains) on an
      // array literal. The actual DB string is "groceries" (plural).
      // Old version had `.eq('category', 'grocery')` which returned
      // zero rows on a non-text column, breaking the page entirely.
      // We also include "supermarket" as a synonym since some scrapers
      // tag stores with that string instead.
      const { data: stores, error: sErr } = await supabase
        .from('stores')
        .select('id, slug, name, category, logo_url, domain')
        .or('category.cs.{groceries},category.cs.{supermarket}')
        .eq('is_active', true);
      if (sErr) console.warn('[SupermarketDealsPage] stores error:', sErr.message);
      if (!alive) return;
      if (!stores?.length) {
        setRows([]);
        setLoading(false);
        return;
      }
      const ids = stores.map((s) => s.id);
      const { data: offers, error: oErr } = await supabase
        .from('cashback_offers')
        .select('id, store_id, platform, rate, affiliate_link, conditions, rate_breakdown')
        .eq('is_active', true)
        .gte('last_verified_at', hiddenBeforeIso())
        .in('store_id', ids);
      if (oErr) console.warn('[SupermarketDealsPage] offers error:', oErr.message);
      if (!alive) return;

      // Pick the highest-rate active offer per store.
      const bestByStore = new Map();
      (offers || []).forEach((o) => {
        const cur = bestByStore.get(o.store_id);
        if (!cur || Number(o.rate) > Number(cur.rate)) bestByStore.set(o.store_id, o);
      });

      // Sort by rate desc, then cap at TOP 10. Nobody scrolls past
      // the third row; ten is generous.
      const out = stores
        .map((s) => ({ store: s, offer: bestByStore.get(s.id) }))
        .filter((r) => r.offer)
        .sort((a, b) => Number(b.offer.rate) - Number(a.offer.rate))
        .slice(0, 10);

      setRows(out);
      setLoading(false);
    };
    fetch();
    return () => {
      alive = false;
    };
  }, []);

  const platforms = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => r.offer?.platform && s.add(r.offer.platform));
    return Array.from(s);
  }, [rows]);

  return (
    <>
      <Helmet>
        <title>Highest Supermarket Deal — SnapGain</title>
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center shadow-md">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Highest Supermarket Deal
              </h1>
              <p className="text-sm text-muted-foreground">
                Today&rsquo;s biggest cashback rates across the UK&rsquo;s
                major grocery chains. Tap any row to go straight to the
                offer.
              </p>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading supermarket deals…
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active supermarket deals right now — check back soon.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {rows.length} {rows.length === 1 ? 'store' : 'stores'}
              </h2>
              {platforms.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Across {platforms.length} platform
                  {platforms.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {rows.map((row, idx) => (
                <DealRow key={row.store.id} row={row} idx={idx} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DealRow({ row, idx }) {
  const { store, offer } = row;
  const href = resolveOpenUrl({
    rowUrl: offer.affiliate_link,
    platform: offer.platform,
  });
  const external = isExternal(href);
  const isBest = idx === 0;

  const inner = (
    <Card
      className={cn(
        'card-hover',
        isBest && 'border-primary/40 bg-gradient-to-br from-light-pink/30 to-card'
      )}
    >
      <CardContent className="py-4 space-y-2">
        <div className="flex items-center gap-3">
          <StoreLogo store={store} size="md" />
          <div className="flex-1 min-w-0">
            {isBest && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary uppercase tracking-wide">
                <Trophy className="w-3 h-3" />
                Best today
              </span>
            )}
            <div className="font-semibold truncate text-base">{store.name}</div>
            <div className="text-xs text-muted-foreground">
              via {offer.platform}
              {offer.conditions && offer.conditions !== 'Up to'
                ? ` · ${offer.conditions}`
                : ''}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
            <div className="text-2xl md:text-3xl font-bold gradient-text leading-none">
              {offer.conditions === 'Up to' ? 'Up to ' : ''}
              {offer.rate}%
            </div>
            {external && (
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        {/* 2026-07-05 (Bárbara): show the per-category breakdown when it
            exists so "Up to 60%" doesn't hide the fact that most tiers
            are 37.5%. Same treatment as the Hot Deals and Store Detail
            cards — no expanding click, tiers visible at a glance. */}
        {Array.isArray(offer.rate_breakdown) && offer.rate_breakdown.length > 1 && (
          <RateBreakdown breakdown={offer.rate_breakdown} compact />
        )}
      </CardContent>
    </Card>
  );

  if (!href) return <div>{inner}</div>;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return (
    <Link to={href} className="block">
      {inner}
    </Link>
  );
}

export default SupermarketDealsPage;
