// /deals/gift-cards — "Top Gift Cards"
//
// Lists the best active gift-card discount for each store today,
// sorted highest first. Unlike the cashback page, gift cards rarely
// have meaningful platform overlap per brand, so we show ONE row per
// store (the best discount available right now) and put the platform
// inline in the meta line.
//
// Each row links straight to the offer (platform affiliate URL),
// opening in a new tab.

import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gift,
  ArrowLeft,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { hiddenBeforeIso } from '@/lib/dataFreshness';
import { StoreLogo } from '@/components/StoreLogo';
import { resolveOpenUrl } from '@/lib/affiliateLinks';
import { cn } from '@/lib/utils';

const isExternal = (url) => /^https?:\/\//i.test(url || '');

function GiftCardDealsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetch = async () => {
      setLoading(true);
      // One query: pull active gift-card offers with the joined store.
      // We don't pre-filter by category — any store with a gift card
      // offer qualifies (Amazon, John Lewis, Apple, etc.).
      const { data, error } = await supabase
        .from('gift_card_offers')
        .select(
          'id, store_id, platform, discount_pct, affiliate_link, conditions, store:stores(id, slug, name, category, logo_url, domain, is_active)'
        )
        .eq('is_active', true)
        .gte('last_verified_at', hiddenBeforeIso())
        .range(0, 999);
      if (error) console.warn('[GiftCardDealsPage] error:', error.message);
      if (!alive) return;

      // Drop rows whose store is inactive or missing, then pick the
      // best (highest discount_pct) offer per store.
      const bestByStore = new Map();
      (data || []).forEach((o) => {
        if (!o.store || o.store.is_active === false) return;
        const cur = bestByStore.get(o.store_id);
        if (!cur || Number(o.discount_pct) > Number(cur.discount_pct)) {
          bestByStore.set(o.store_id, o);
        }
      });

      // Sort by discount desc, cap at TOP 10 — keeps the page tight
      // and matches the rest of the deals pages.
      const out = Array.from(bestByStore.values())
        .sort((a, b) => Number(b.discount_pct) - Number(a.discount_pct))
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
    rows.forEach((r) => r.platform && s.add(r.platform));
    return Array.from(s);
  }, [rows]);

  return (
    <>
      <Helmet>
        <title>Top Gift Cards — SnapGain</title>
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-md">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Top Gift Cards
              </h1>
              <p className="text-sm text-muted-foreground">
                Today&rsquo;s biggest discounts on gift cards across every
                tracked platform. Tap any row to go straight to the offer.
              </p>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading gift card deals…
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No active gift card deals right now — check back soon.
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
              {rows.map((offer, idx) => (
                <DealRow key={offer.id} offer={offer} idx={idx} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function DealRow({ offer, idx }) {
  const { store } = offer;
  const href = resolveOpenUrl({
    rowUrl: offer.affiliate_link,
    platform: offer.platform,
    storeDomain: store?.domain,
    fallback: store?.slug ? `/store/${store.slug}` : null,
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
      <CardContent className="py-4 flex items-center gap-3">
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
            {offer.conditions ? ` · ${offer.conditions}` : ''}
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
          <div className="text-2xl md:text-3xl font-bold gradient-text leading-none">
            {offer.discount_pct}%
          </div>
          {external && (
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
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

export default GiftCardDealsPage;
