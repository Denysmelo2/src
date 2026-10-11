// "Calculadora de Cashback no Aluguel" — ported from Bárbara's
// standalone HTML tool (2026-09-14) into the /calculator page.
//
// Rent is most people's largest recurring payment, and the two ways to
// make it earn are shaped differently: Ribbon Rewards charges nothing
// and pays in gift-card points, while Payr charges a percentage and
// lets a credit card do the earning. The tool prices both.
//
// Two rules carried over from the original deliberately:
//
//   1. The Payr fee is shown as its own line and is NOT subtracted
//      from the points value. The two are different currencies — cash
//      out vs points in — and the original nets them only in the
//      reader's head, on purpose.
//   2. Points are valued at a FIXED 0.92p each (1,000 = £9.20). That
//      is the same par price as GBP_PER_AVIOS in lib/aviosMath.js, so
//      this imports it rather than hard-coding 0.92 a second time.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { NumberField, isInvalidNumber, num } from '@/components/calculators/NumberField';
import { aviosToGbp, GBP_PER_AVIOS } from '@/lib/aviosMath';

const PENCE_PER_POINT = GBP_PER_AVIOS * 100; // 0.92p

const gbp = (n) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const pts = (n) => Math.round(n).toLocaleString('en-GB');

export function RentCashbackCalculator() {
  const [rent, setRent] = useState('');
  const [months, setMonths] = useState('12');
  const [ribbonRate, setRibbonRate] = useState('1');
  const [ribbonPer100, setRibbonPer100] = useState('1');
  const [payrFee, setPayrFee] = useState('1.99');
  const [cardPoints, setCardPoints] = useState('');
  const [pointsBase, setPointsBase] = useState('total');

  const fields = [rent, ribbonRate, ribbonPer100, payrFee, cardPoints];
  const anyError = fields.some(isInvalidNumber);
  const hasInput =
    rent !== '' ||
    cardPoints !== '' ||
    months !== '12' ||
    ribbonRate !== '1' ||
    ribbonPer100 !== '1' ||
    payrFee !== '1.99' ||
    pointsBase !== 'total';

  const results = useMemo(() => {
    if (anyError) return null;
    const monthly = num(rent);
    if (monthly <= 0) return null;

    const period = num(months) || 1;
    const rentTotal = monthly * period;

    // Ribbon: no fee, points priced by whatever 100 of them redeem for.
    const ribbonPoints = rentTotal * num(ribbonRate);
    const ribbonValue = (ribbonPoints / 100) * num(ribbonPer100);

    // Payr: a percentage fee, and the card earns on the charged amount
    // (or on the rent alone, if the card excludes the fee).
    const fee = (rentTotal * num(payrFee)) / 100;
    const charge = rentTotal + fee;
    const base = pointsBase === 'total' ? charge : rentTotal;
    const payrPoints = base * num(cardPoints);
    const payrValue = aviosToGbp(payrPoints);

    return {
      period,
      rentTotal,
      ribbonPoints,
      ribbonValue,
      fee,
      charge,
      payrPoints,
      payrValue,
      feeOnRent: pointsBase === 'total',
    };
  }, [rent, months, ribbonRate, ribbonPer100, payrFee, cardPoints, pointsBase, anyError]);

  const reset = () => {
    setRent('');
    setMonths('12');
    setRibbonRate('1');
    setRibbonPer100('1');
    setPayrFee('1.99');
    setCardPoints('');
    setPointsBase('total');
  };

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground">
          <Home className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Cashback on your rent</h3>
          <p className="text-xs text-muted-foreground">
            Ribbon Rewards vs Payr + credit card — same rent, different rewards
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Rent & Ribbon Rewards
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField
              id="rent-amount"
              label="Monthly rent (£)"
              placeholder="e.g. 2050"
              value={rent}
              onChange={setRent}
            />
            <div>
              <Label htmlFor="rent-months" className="text-xs">Comparison period</Label>
              <div className="mt-1">
                <Select
                  id="rent-months"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                >
                  <option value="1">1 month</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </Select>
              </div>
            </div>
            <NumberField
              id="rent-ribbon-rate"
              label="Ribbon points per £1"
              hint="(usually 1)"
              step="0.1"
              placeholder="1"
              value={ribbonRate}
              onChange={setRibbonRate}
            />
            <NumberField
              id="rent-ribbon-100"
              label="Value of 100 Ribbon points (£)"
              placeholder="1"
              value={ribbonPer100}
              onChange={setRibbonPer100}
            />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Payr & your card
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumberField
              id="rent-payr-fee"
              label="Payr fee (%)"
              placeholder="1.99"
              value={payrFee}
              onChange={setPayrFee}
            />
            <NumberField
              id="rent-card-points"
              label="Card points per £1"
              step="0.01"
              placeholder="e.g. 1.5"
              value={cardPoints}
              onChange={setCardPoints}
            />
            <div className="sm:col-span-2">
              <Label htmlFor="rent-points-base" className="text-xs">Card earns on</Label>
              <div className="mt-1">
                <Select
                  id="rent-points-base"
                  value={pointsBase}
                  onChange={(e) => setPointsBase(e.target.value)}
                >
                  <option value="total">Rent + Payr fee</option>
                  <option value="rent">Rent only</option>
                </Select>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 bg-muted/50 border border-border rounded-lg p-3 leading-relaxed">
            📌 Points are valued at the fixed par price used across SnapGain:{' '}
            <span className="font-semibold">1,000 points = {gbp(GBP_PER_AVIOS * 1000)}</span>, so each
            point is worth <span className="font-semibold">{PENCE_PER_POINT.toFixed(2)}p</span>. What you
            actually get depends on how you redeem.
          </p>
        </div>

        {anyError && (
          <p role="alert" className="text-xs text-destructive">
            Enter positive numbers only.
          </p>
        )}

        {hasInput && (
          <Button onClick={reset} variant="ghost" size="sm" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      <div aria-live="polite">
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-2 border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  🟢 Ribbon Rewards
                </h4>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent paid</dt>
                    <dd className="font-semibold">{gbp(results.rentTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Fees</dt>
                    <dd className="font-semibold">{gbp(0)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Points earned</dt>
                    <dd className="font-semibold">{pts(results.ribbonPoints)}</dd>
                  </div>
                </dl>
                <p className="mt-3 pt-3 border-t border-emerald-500/20 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  {gbp(results.ribbonValue)}
                </p>
                <p className="text-[10px] text-muted-foreground">in gift cards</p>
              </div>

              <div className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                  🟣 Payr + card
                </h4>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-semibold">{gbp(results.rentTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Payr fee</dt>
                    <dd className="font-semibold">{gbp(results.fee)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Charged to card</dt>
                    <dd className="font-semibold">{gbp(results.charge)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Points earned</dt>
                    <dd className="font-semibold">{pts(results.payrPoints)}</dd>
                  </div>
                </dl>
                <p className="mt-3 pt-3 border-t border-primary/20 text-lg font-extrabold text-primary">
                  {gbp(results.payrValue)}
                </p>
                <p className="text-[10px] text-muted-foreground">in points, at par</p>
              </div>
            </div>

            <div className="bg-primary text-primary-foreground rounded-xl p-4">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-secondary" />
                Over {results.period} {results.period === 1 ? 'month' : 'months'}
              </h4>
              <p className="text-[11px] leading-relaxed opacity-90">
                Ribbon earns <span className="font-bold">{pts(results.ribbonPoints)} points</span> ≈{' '}
                <span className="font-bold">{gbp(results.ribbonValue)}</span> in gift cards, at no fee.
                Payr charges <span className="font-bold">{gbp(results.fee)}</span> and the card earns{' '}
                <span className="font-bold">{pts(results.payrPoints)} points</span> on{' '}
                {results.feeOnRent ? 'the rent plus the fee' : 'the rent alone'} ≈{' '}
                <span className="font-bold">{gbp(results.payrValue)}</span> at par.
              </p>
              <p className="text-[11px] mt-2 pt-2 border-t border-white/20 font-bold">
                The Payr fee is listed on its own and is not deducted from the points value — cash out
                and points in are different currencies.
              </p>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Check that your card actually earns on Payr payments, and whether any caps, exclusions or
              extra fees apply. {PENCE_PER_POINT.toFixed(2)}p per point is this tool's fixed reference,
              not a universal conversion rate.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default RentCashbackCalculator;
