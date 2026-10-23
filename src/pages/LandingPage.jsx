// LandingPage — conversion-focused, family/immigrant angle.
//
// Audience: UK residents (especially immigrant families) who want to
// turn their everyday spending into flights home and visits abroad.
// Pain point: separation from family + the math nobody taught you.
//
// Structure (top to bottom):
//   1. Hero            promise: spend smart, fly your family home
//   2. SocialProofBar  what we compare (no unverifiable counts)
//   3. OriginStory     Tesco April 2017 founder moment (trust builder)
//   4. PainSection     5-apps-fatigue + missed-money anxiety
//   5. HowItWorks      3 concrete steps
//   6. TravelAngle     3 example reward flights (not rendered)
//   7. HouseholdAccount  household miles pooling (generic)
//   8. ComparisonTable Without vs With SnapGain (visual table)
//   9. RealNumbers     the founder's own results, labelled not typical
//  10. Calculator      interactive spend to flights estimator
//  11. FAQ             objection killers
//  12. PricingCTA      single plan
//
// Style notes:
//   - All CTAs go to /pricing (single click to purchase).
//   - No em-dashes in any UI string.
//   - No scroll-triggered animations (static for speed).
//   - Never name partner cashback platforms publicly, and don't name
//     airline programmes in marketing copy (say "airline miles
//     programme", "household miles account", "airline rewards").
//   - Claims must be substantiated (CAP Code 3.7 / CPUTR). 2026-10-17
//     (legal package C) removed: "Trusted by 100+ UK families",
//     "ranks every cashback platform", "2 to 4 free flights a year",
//     "typical 15%/25%" rates, fixed store/platform counts, and
//     unlabelled personal results. Personal results stay only as
//     "the founder's own results, not typical".
//   - "Rankings aren't affected by commission" is true for /compare and
//     store strategies: lib/strategies.js and ComparePage sort routes by
//     estimated GBP value (gbpReturn) and commission is not an input.
//     Featured stores and hot deals are editorial; don't overclaim.

import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { FaqSection } from '@/components/sections/FaqSection';
import { MONTHLY, YEARLY } from '@/config/pricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search,
  Layers,
  Plane,
  Clock,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Sparkles,
  Wallet,
  ArrowRight,
  Users,
  Calculator as CalcIcon,
  Coffee,
  Heart,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────
// Section 1 — Hero
// ────────────────────────────────────────────────────────────────────
function Hero({ onPrimary, onSecondary }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-light-pink/30 via-background to-light-green/20">
      <div className="container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <Sparkles className="w-4 h-4" />
          Built in the UK, for UK shoppers
        </div>

        {/* Headline — Option B: outcome promise (grounded range).
            pb-2 on the gradient span: -webkit-background-clip:text combined
            with leading-[1.05] clips descenders (g, y) — the padding gives
            them room without loosening the overall headline. */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6">
          Get more back on every shop.
          <span className="block gradient-text pb-2">From spending you'd do anyway.</span>
        </h1>

        {/* Subheadline: what the product does, scoped to the platforms
            we actually cover. Personal results live in RealNumbers,
            labelled as the founder's own and not typical. */}
        <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
          SnapGain compares cashback, gift-card discounts and airline
          rewards across the UK platforms listed on our site, and works
          out the best way to combine them for each store. You shop
          normally. We do the maths.
        </p>

        {/* Single CTA — focused funnel, no secondary distractor */}
        <div className="flex justify-center items-center mb-6">
          <Button
            onClick={onPrimary}
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
          >
            Start your 7-day trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Free 7-day trial · No card needed · Thousands of UK stores · The trial ends on its own
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 2 — What we compare (no user counts or fixed store counts:
// they were unverifiable or out of date)
// ────────────────────────────────────────────────────────────────────
function SocialProofBar() {
  const stats = [
    { value: 'Thousands', label: 'of UK stores tracked' },
    { value: '3 in 1', label: 'cashback, gift cards and miles' },
    { value: 'Dated', label: 'each rate shows when it was checked' },
    { value: 'By value', label: 'routes ranked by what you get' },
  ];
  return (
    <section className="border-y border-border bg-muted/40 py-8">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm uppercase tracking-wider text-muted-foreground mb-4">
          One place to compare UK cashback, gift cards and miles
        </p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl md:text-3xl font-extrabold text-primary">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 3 — Origin Story (Tesco April 2017)
// ────────────────────────────────────────────────────────────────────
function OriginStory({ onPrimary }) {
  return (
    <section className="container mx-auto px-4 py-20 md:py-28">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
            <Coffee className="w-7 h-7" />
          </div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
            The founder&rsquo;s story
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            It started in a Tesco queue.
          </h2>
        </div>

        <div className="space-y-5 text-lg text-foreground/80 leading-relaxed">
          <p>
            <strong>London, April 2017.</strong> The person ahead in line
            tapped a card the cashier called premium. As they walked out
            the cashier said, "thanks for those extra points this week,
            should cover Barcelona."
          </p>
          <p>
            On the way home, the same question kept repeating. <em>"How
            much have we left on the table?"</em>
          </p>
          <p>
            The math, that night, was brutal. <strong>Six years living in
            the UK. £200,000 spent. £0 returned.</strong> Even at a modest
            5 percent back, that would have been <strong className="text-primary">
            about £10,000</strong>. That is a lot of flights home.
          </p>
          <p>
            SnapGain is what we built so that nobody else has to live the
            same six years.
          </p>
        </div>

        <div className="text-center mt-10">
          <Button onClick={onPrimary} size="lg" className="px-8 py-6 text-lg">
            Stop missing yours
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 4 — Pain
// ────────────────────────────────────────────────────────────────────
function PainSection() {
  const pains = [
    {
      icon: <Clock className="w-7 h-7" />,
      title: '4 minutes per purchase, lost',
      body: 'Open one cashback app. Then another. Then a gift-card discounter. Then check your points balance. Every. Single. Time.',
    },
    {
      icon: <AlertTriangle className="w-7 h-7" />,
      title: 'You pick the wrong app',
      body: 'One app shows 2 percent on Boots, but another runs 5 percent this week, and you missed it because you stopped checking.',
    },
    {
      icon: <TrendingDown className="w-7 h-7" />,
      title: 'You never stack',
      body: 'Buying a discounted gift card first, layering a bonus rewards programme on top, then paying with a miles card. Nobody has time to figure that out manually.',
    },
  ];
  return (
    <section className="bg-muted/20 py-20 md:py-28 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            The combinations a single app won&rsquo;t show you
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Each app shows you its own rates. We put the platforms we cover
            side by side and show combinations that can pay more than any
            one app alone, including smaller apps that sometimes beat the
            big names.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pains.map((p) => (
            <Card key={p.title} className="h-full border-2">
              <CardContent className="pt-6">
                <div className="text-destructive mb-4">{p.icon}</div>
                <h3 className="text-xl font-bold mb-2">{p.title}</h3>
                <p className="text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 5 — How it works
// ────────────────────────────────────────────────────────────────────
function HowItWorks({ onPrimary }) {
  const steps = [
    {
      icon: <Search className="w-8 h-8" />,
      title: 'Type the store',
      body: 'Tesco, Boots, ASOS, Booking.com. Thousands of UK stores.',
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'See the best stack',
      body: 'Cashback, gift cards and points. We calculate the combinations we find for that store and rank them by estimated value to you.',
    },
    {
      icon: <Plane className="w-8 h-8" />,
      title: 'Cash out or fly out',
      body: 'Take the pounds to your bank, or route the same shopping through travel-rewarding platforms for your next flight.',
    },
  ];
  return (
    <section id="how-it-works" className="container mx-auto px-4 py-20 md:py-28 scroll-mt-20">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          How SnapGain works
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground">
          Three taps. The math is already done.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
        {steps.map((s, i) => (
          <div key={s.title} className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground mb-5">
              {s.icon}
            </div>
            <div className="text-sm font-bold text-primary mb-2">
              STEP {i + 1}
            </div>
            <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
            <p className="text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Button onClick={onPrimary} size="lg" className="px-8 py-6 text-lg">
          Start your 7-day trial
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 6 — Travel angle
//
// Verified data:
//   - MAN→DUB return: 16,000 miles + £133 (off-peak Sep 2026)
//   - LHR→LIS return: 42,000 miles + £50 (off-peak Sep 2026)
//   - LHR→GRU one-way: APPROXIMATE 60,000 miles + £250 (typical
//     off-peak Economy; replace with verified screenshot when ready)
// Not rendered. If re-enabled, keep it generic (no airline names) and
// label the spend estimates as illustrative.
// ────────────────────────────────────────────────────────────────────
function TravelAngle() {
  const examples = [
    {
      route: 'Manchester → Dublin',
      type: 'return',
      price: '16,000 miles + £133',
      spend: '~2 to 3 months of £500/mo routed',
    },
    {
      route: 'London → Lisbon',
      type: 'return',
      price: '42,000 miles + £50',
      spend: '~3 to 4 months of £500/mo routed',
    },
    {
      route: 'London → São Paulo',
      type: 'one-way (off-peak)',
      price: '55,000 miles + £330',
      spend: '~7 months of £500/mo routed',
    },
  ];
  return (
    <section id="travel" className="bg-muted/30 py-20 md:py-28 border-y border-border scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Plane className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Your weekly shop. Your next flight home.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Routing your everyday shopping through travel-rewarding platforms
            turns pounds into miles. SnapGain shows you which retailers are
            part of that path, plus the cashback you stack on top. The cash
            co-pay on each flight is covered by the cashback you earn along
            the way.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {examples.map((e) => (
            <Card
              key={e.route}
              className="text-center h-full bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
            >
              <CardContent className="pt-6 pb-6">
                <div className="text-xl md:text-2xl font-bold mb-1">
                  {e.route}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {e.type}
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-primary mb-2">
                  {e.price}
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Airline reward seat (example)
                </div>
                <div className="text-sm font-medium border-t border-primary/10 pt-3">
                  {e.spend}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
          Illustrative only, not a typical result. Spend estimates assume a
          high-return stacking strategy converted to miles at an example
          rate. Actual months vary by retailer mix, dates and the airline
          programme&rsquo;s pricing. SnapGain does not issue miles or track
          balances. You earn directly with the programmes.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 7 — Household miles account (generic, no airline named)
// ────────────────────────────────────────────────────────────────────
function HouseholdAccount() {
  return (
    <section className="container mx-auto px-4 py-20 md:py-28">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Your family points, combined.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Some airline miles programmes let people who live at the
            same address <strong>pool their miles into one household
            miles account</strong>. Mum&rsquo;s grocery shop, Dad&rsquo;s
            commute, the kids&rsquo; online orders, all counting toward
            one shared reward.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-primary mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">The whole household</h3>
              <p className="text-sm text-muted-foreground">
                Where the programme allows it, adults and children at the
                same address can link their accounts. Each programme sets
                its own limits and rules.
              </p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-primary mb-4">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">One shared balance</h3>
              <p className="text-sm text-muted-foreground">
                Miles any linked member earns can count toward one
                combined balance, ready to redeem under the
                programme&rsquo;s rules.
              </p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="text-primary mb-4">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">Fly together, faster</h3>
              <p className="text-sm text-muted-foreground">
                Several people earning together fill a shared balance
                faster than one person alone. SnapGain shows strategies
                for everyday UK spending.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 max-w-2xl mx-auto">
          Household accounts are run by the airline programmes, not by
          SnapGain, and their rules apply. Our guide explains how to set
          one up.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 8 — Comparison Table (without vs with SnapGain)
// ────────────────────────────────────────────────────────────────────
function ComparisonTable({ onPrimary }) {
  // Qualitative on purpose (2026-10-17): the old £ / miles / flights
  // figures were unsubstantiated averages and personal results.
  const rows = [
    {
      metric: 'Comparing platforms for one shop',
      without: 'App by app',
      with: 'One ranked list',
      withoutNote: 'open each app and check',
      withNote: 'for the platforms we cover',
    },
    {
      metric: 'Stacking gift cards, cashback and points',
      without: 'DIY maths',
      with: 'Calculated',
      withoutNote: 'spreadsheets and guesswork',
      withNote: 'combined return shown per route',
    },
    {
      metric: 'Knowing if a rate is current',
      without: 'Hard to tell',
      with: 'Dated',
      withoutNote: 'old screenshots and forums',
      withNote: 'each rate shows when it was checked',
    },
    {
      metric: 'Miles value of each option',
      without: 'Unknown',
      with: 'Estimated',
      withoutNote: 'no common unit',
      withNote: 'converted at the value we show',
    },
    {
      metric: 'Strategy guides included',
      without: '0',
      with: '9',
      withoutNote: 'figure it out alone',
      withNote: 'beginner to advanced stacks',
    },
  ];

  return (
    <section className="bg-foreground text-background py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Doing it alone vs doing it with SnapGain
          </h2>
          <p className="text-lg md:text-xl opacity-80">
            Same shopping, less guesswork.
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-background/20">
                <th className="py-4 px-3 text-sm uppercase tracking-wider opacity-70 font-medium"></th>
                <th className="py-4 px-3 text-center">
                  <div className="text-sm uppercase tracking-wider opacity-70 font-medium">Without</div>
                  <div className="text-lg font-bold">SnapGain</div>
                </th>
                <th className="py-4 px-3 text-center bg-primary/20 rounded-t-lg">
                  <div className="text-sm uppercase tracking-wider text-primary font-medium">With</div>
                  <div className="text-lg font-bold">SnapGain</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric} className="border-b border-background/10">
                  <td className="py-5 px-3 font-medium">{r.metric}</td>
                  <td className="py-5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <span className="text-lg font-bold">{r.without}</span>
                    </div>
                    <div className="text-xs opacity-50 mt-1">{r.withoutNote}</div>
                  </td>
                  <td className="py-5 px-3 text-center bg-primary/10">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-lg font-bold text-primary">{r.with}</span>
                    </div>
                    <div className="text-xs opacity-70 mt-1">{r.withNote}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center mt-10">
          <Button
            onClick={onPrimary}
            size="lg"
            className="px-8 py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Pick your side
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 9 — The founder's own results. Must stay labelled as personal
// and not typical (CAP Code 3.7 / 3.45 on testimonials and results).
// ────────────────────────────────────────────────────────────────────
function RealNumbers() {
  const stats = [
    {
      icon: <Wallet className="w-6 h-6" />,
      value: '£900+',
      label: 'cashback earned in 9 months',
      detail: "The founder's own accounts, Aug 2025 to May 2026, across several platforms.",
    },
    {
      icon: <Plane className="w-6 h-6" />,
      value: '5,500+',
      label: 'airline miles earned in 1 month',
      detail: "The founder's own airline miles statement, April to May 2026.",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      value: '9',
      label: 'strategy guides',
      detail: 'The same stacks the founder uses, from beginner to advanced.',
    },
  ];
  return (
    <section className="container mx-auto px-4 py-20 md:py-28">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          The founder&rsquo;s own results
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground">
          SnapGain started as the founder&rsquo;s own system. These are his
          personal results. <strong>They are not typical</strong> and are not
          a promise of what you will earn.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              {s.icon}
            </div>
            <div className="text-5xl md:text-6xl font-extrabold mb-2 gradient-text">
              {s.value}
            </div>
            <div className="text-base font-medium">{s.label}</div>
            <div className="text-sm text-muted-foreground mt-2">{s.detail}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
        The founder&rsquo;s own results, not typical. They depend on how much
        and where he spends, which cards he holds and which offers were
        available at the time. Your results will be different and may be
        much lower.
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Section 10 — Interactive Calculator (real-spend based, no flights)
//
// Calibrated against the SnapGain beta profile (Denys & Bárbara, May 2026):
//   £3,064/month total spend → £129/month cashback + 724 Avios/month
//   That's 4.2% effective cashback rate and 0.24 Avios/£.
//
// Three tiers reflect the realistic spread (full breakdown lives in
// the Obsidian note "Família UK - cálculo base"). Tier descriptions
// MUST NOT name partner platforms — see top of STRATEGY_TIERS object.
//
// Flight examples removed per internal review (2026-05-14): the
// methodology leak made readers think SnapGain sells flights inside
// the app.
// ────────────────────────────────────────────────────────────────────
// Strategy tiers calibrated against the SnapGain beta profile:
//   £3,064/month spend → £129 cashback + 724 Avios/month
//   = 4.2% cashback + 0.24 Avios/£
// "Smart" sits at that baseline. Beginner is rough-stack only; Advanced
// adds full stacking, promos, welcome bonuses, Nectar boosts, etc.
// IMPORTANT — never name partner platforms here (NX, Amex, Nectar,
// Ribbon, One4all, etc.). The landing is public and naming platforms
// lets visitors bypass our affiliate flow by Googling the names.
// Descriptions must stay generic. Names are revealed only INSIDE the
// app, after signup, in the Strategy Library cards.
// No tier descriptions in the public Calculator — users learn what's
// inside each tier only after signing up (Strategy Library). Keeps the
// landing intriguing without giving the playbook away.
const STRATEGY_TIERS = {
  beginner: {
    label: 'Beginner',
    cashbackPct: 2,
    aviosPerPound: 0.1,
  },
  smart: {
    label: 'Smart',
    cashbackPct: 5,
    aviosPerPound: 0.25,
  },
  advanced: {
    label: 'Advanced',
    cashbackPct: 10,
    aviosPerPound: 0.5,
  },
};

function Calculator({ onPrimary }) {
  const [spend, setSpend] = useState(3000);
  const [tier, setTier] = useState('smart');

  const { cashbackPct, aviosPerPound } = STRATEGY_TIERS[tier];
  const monthlyCashback = (spend * cashbackPct) / 100;
  const monthlyAvios = Math.round(spend * aviosPerPound);
  const annualCashback = monthlyCashback * 12;
  const annualAvios = monthlyAvios * 12;

  return (
    <section
      id="calculator"
      className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20 md:py-28 scroll-mt-20"
    >
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4">
            <CalcIcon className="w-7 h-7" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Run your numbers
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Tell us what your household spends. We will show an
            illustration of the cashback and airline miles you could
            earn at each strategy level.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="border-2">
            <CardContent className="p-6 md:p-10 space-y-8">
              {/* Spend slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Monthly household spend
                  </label>
                  <div className="text-3xl font-extrabold text-primary">
                    £{spend.toLocaleString()}
                  </div>
                </div>
                <input
                  type="range"
                  min="500"
                  max="8000"
                  step="100"
                  value={spend}
                  onChange={(e) => setSpend(Number(e.target.value))}
                  className="w-full h-2 bg-primary/20 rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>£500</span>
                  <span>single</span>
                  <span>family of 4</span>
                  <span>£8,000</span>
                </div>
              </div>

              {/* Strategy tier selector (3 radio cards) */}
              <div>
                <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
                  Strategy level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(STRATEGY_TIERS).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTier(key)}
                      className={`rounded-lg border-2 px-4 py-4 text-center font-bold transition-all ${
                        tier === key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live output — monthly + annual, no flight examples */}
              <div className="bg-primary/5 rounded-xl p-6 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Monthly return
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Cashback
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold">
                        £{monthlyCashback.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Airline miles
                      </div>
                      <div className="text-2xl md:text-3xl font-extrabold text-primary">
                        {monthlyAvios.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Year-end stack (12 months)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Annual cashback
                      </div>
                      <div className="text-3xl md:text-4xl font-extrabold gradient-text">
                        £{annualCashback.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Annual miles
                      </div>
                      <div className="text-3xl md:text-4xl font-extrabold gradient-text">
                        {annualAvios.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={onPrimary}
                size="lg"
                className="w-full py-6 text-lg font-semibold"
              >
                Lock in this strategy
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Illustration only, not a typical result or a promise. The
                levels use example rates (Beginner 2%, Smart 5%, Advanced
                10% back, plus example miles per pound). Actual returns
                depend on where you shop, your payment cards, the offers
                available and each platform&rsquo;s terms.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// Section 11 — FAQ: components/sections/FaqSection.jsx (also /faq).

// ────────────────────────────────────────────────────────────────────
// Section 12 — Final pricing CTA
// ────────────────────────────────────────────────────────────────────
function PricingCTA({ onSubscribe }) {
  const perks = [
    'Unlimited store comparisons',
    'Rates for thousands of UK retailers, each dated',
    '9 stacking strategies, beginner to advanced',
    'Household miles account setup guide',
    'Spend to miles calculator',
    'Minimum-rate offers flagged when available',
    'Travel-miles value estimated for each option',
    'Cancel online anytime',
  ];
  return (
    <section id="pricing" className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20 md:py-28 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
          Stop guessing. Start stacking.
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          Free for 7 days with no card, and the trial ends on its own. To
          keep going, subscribe for {MONTHLY}/month or {YEARLY}/year; it renews
          until you cancel, and you can cancel online anytime.
        </p>

        <ul className="text-left max-w-md mx-auto space-y-3 mb-10">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onSubscribe}
          size="lg"
          className="px-10 py-6 text-lg font-semibold"
        >
          Start your free trial
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          One plan, paid monthly or yearly. See our Terms and Refund Policy
          for renewal, cancellation and your 14-day right to cancel.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Page composition
// ────────────────────────────────────────────────────────────────────
function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Handle anchor scroll if the URL carries a hash on mount. Declared
  // before the early return below so the hook order never changes.
  React.useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  // 2026-07-05 (Bárbara): signed-in users clicking the footer/header
  // logo were briefly seeing the visitor landing before the effect
  // redirected them. Switching to <Navigate> as the first return
  // means the landing content is never mounted for authed users
  // (no flash, no risk of them starting a duplicate signup).
  // Wait for auth to resolve so we don't bounce out mid-signout.
  if (!authLoading && user) {
    return <Navigate to="/home" replace />;
  }

  // All "Start your 7-day trial" CTAs go straight to /pricing.
  const goPricing = () => navigate('/pricing');

  const goHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>SnapGain, spend smart in the UK and fly your family home</title>
        <meta
          name="description"
          content="SnapGain compares cashback, gift-card discounts and airline miles across the UK platforms listed on our site, and shows the best way to combine them for each store. Free 7-day trial, no card needed."
        />
      </Helmet>

      <Hero onPrimary={goPricing} onSecondary={goHowItWorks} />
      <SocialProofBar />
      <OriginStory onPrimary={goPricing} />
      <PainSection />
      <HowItWorks onPrimary={goPricing} />
      {/* TravelAngle removed per internal review (2026-05-14):
          (1) exposes our calculation methodology, (2) made Denys
          assume SnapGain sells flights inside the app. Function
          kept defined below so it's easy to re-enable. */}
      <HouseholdAccount />
      <ComparisonTable onPrimary={goPricing} />
      <RealNumbers />
      <Calculator onPrimary={goPricing} />
      <FaqSection />
      <PricingCTA onSubscribe={goPricing} />
    </>
  );
}

export default LandingPage;
