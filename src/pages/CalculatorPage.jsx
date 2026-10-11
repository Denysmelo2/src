// /calculator — Quick decision tools for Premium subscribers.
//
// 2026-05-20: Bárbara decided to drop the "Spend → flights" estimator
// (the sliders version) and ship ONLY the 4 micro-calculators imported
// from the snapgain-shop product. Each tool answers a specific
// per-purchase "should I take A or B?" question that /compare can't
// answer (compare needs a store; these are math-only).
//
// The old spend-estimator stays in git history (commit before
// 2026-05-20) in case we want to bring it back.
//
// 2026-09-14: Split into two halves. The original four answer "which
// way should I EARN on this purchase?". The three new ones answer the
// other half — "what are these points actually WORTH, and what did
// they cost me?" — which is where the real money is won or lost.

import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Calculator as CalcIcon, Plane, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CashbackVsAviosCalculator } from '@/components/calculators/CashbackVsAviosCalculator';
import { NectarVsAviosCalculator } from '@/components/calculators/NectarVsAviosCalculator';
import { NectarToAviosConverter } from '@/components/calculators/NectarToAviosConverter';
import { RevolutVsAviosCalculator } from '@/components/calculators/RevolutVsAviosCalculator';
import { AviosRedemptionCalculator } from '@/components/calculators/AviosRedemptionCalculator';
import { AviosBoosterCalculator } from '@/components/calculators/AviosBoosterCalculator';
import { PartPayWithAviosCalculator } from '@/components/calculators/PartPayWithAviosCalculator';
import { RentCashbackCalculator } from '@/components/calculators/RentCashbackCalculator';

function CalculatorPage() {
  return (
    <>
      <Helmet>
        <title>Calculators — SnapGain</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md mb-3">
            <CalcIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Quick decision tools
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 max-w-2xl mx-auto">
            Per-purchase comparisons — drop in real numbers, get a winner.
            Use these when /compare doesn't cover the situation (no
            specific store, or comparing point-conversion strategies).
          </p>
        </div>

        {/* Earning side — which route earns more on this purchase? */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Earning — which route wins on this purchase?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CashbackVsAviosCalculator />
            <NectarVsAviosCalculator />
            <NectarToAviosConverter />
            <RevolutVsAviosCalculator />
          </div>
        </div>

        {/* Rent — the biggest recurring payment most people make, and the
            one where the two earning routes are shaped least alike. Full
            width: it compares two strategies side by side. */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Rent — make your biggest bill earn
          </h2>
          <RentCashbackCalculator />
        </div>

        {/* Spending side — are these Avios worth spending here? */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Spending — are your Avios worth it here?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AviosRedemptionCalculator />
            <PartPayWithAviosCalculator />
            <AviosBoosterCalculator />
          </div>
        </div>

        {/* CTA to strategies for context */}
        <Card className="border-dashed">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Plane className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                See these calculations in real strategies?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                The Strategy Library applies these per-purchase comparisons
                to real merchants — Sainsbury's, Nectar→Avios converts,
                Revolut Shop boosts, the works.
              </p>
              <Button asChild>
                <Link to="/playbook">
                  Open Strategy Library
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground flex items-start gap-2 max-w-xl mx-auto text-center">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Avios value depends on how you redeem. Booster rate £0.0092
            is the BUY price; real worth on premium redemptions can be
            £0.015–0.02 each.
          </span>
        </p>
      </div>
    </>
  );
}

export default CalculatorPage;
