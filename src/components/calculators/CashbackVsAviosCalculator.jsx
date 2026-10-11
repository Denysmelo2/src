// 2026-05-20: Imported from snapgain-shop (calculator product
// integration). Adapted to use main app's theme tokens (--primary,
// --secondary) and gbpToAviosBooster from lib/aviosMath.js so the
// Booster rate is in ONE place across the codebase.
//
// 2026-09-14: Reworked. The inline maths duplicated (and silently
// disagreed with) lib/aviosMath.js — a draw was reported as an Avios
// win, and a missing rate on one side was reported as a loss for that
// side. Now it delegates to compareCashbackVsAvios, the same helper
// /compare uses, and adds what the ebook's Golden Rule actually needs:
// the break-even cashback %, the size of the gap, and support for a
// live Booster promo. Results update as you type.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Percent, Award, Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  aviosToGbp,
  breakEvenCashbackPct,
  compareCashbackVsAvios,
} from '@/lib/aviosMath';

const gbp = (n) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const avios = (n) => n.toLocaleString('en-GB');

/**
 * Compare two earning strategies for a single purchase:
 *   Strategy A: take cashback (£) and convert to Avios via Booster
 *   Strategy B: earn Avios directly from the merchant
 *
 * Useful when both options are available — e.g. "Tesco gives me 10%
 * via NX vs 4 Avios/£ via the Avios eStore — which yields more
 * Avios?"
 */
export function CashbackVsAviosCalculator() {
  const [cashbackRate, setCashbackRate] = useState('');
  const [aviosRate, setAviosRate] = useState('');
  const [amount, setAmount] = useState('');
  const [boosterBonus, setBoosterBonus] = useState('');
  const [showBooster, setShowBooster] = useState(false);

  const hasInput =
    cashbackRate !== '' || aviosRate !== '' || amount !== '' || boosterBonus !== '';

  // A field is invalid only once it holds something that isn't a
  // usable number — an empty field is "not filled in yet", not an error.
  const invalid = (raw) => {
    if (raw === '') return false;
    const n = Number(raw);
    return !Number.isFinite(n) || n < 0;
  };
  const errors = {
    cashbackRate: invalid(cashbackRate),
    aviosRate: invalid(aviosRate),
    amount: invalid(amount),
    boosterBonus: invalid(boosterBonus),
  };
  const anyError = Object.values(errors).some(Boolean);

  const results = useMemo(() => {
    if (anyError) return null;

    const cb = parseFloat(cashbackRate) || 0;
    const av = parseFloat(aviosRate) || 0;
    const amt = parseFloat(amount) || 0;
    const bonus = parseFloat(boosterBonus) || 0;
    // Need a spend and at least one earning side to say anything.
    if (amt <= 0 || (cb <= 0 && av <= 0)) return null;

    const cashbackValue = (cb / 100) * amt;
    const directAvios = Math.round(av * amt);
    const outcome = compareCashbackVsAvios({
      cashbackGbp: cashbackValue,
      directAvios,
      boosterBonusPct: bonus,
    });

    return {
      ...outcome,
      amount: amt,
      cashbackValue,
      boosterBonus: bonus,
      // Only meaningful when there is an eStore rate to beat.
      breakEvenPct: av > 0 ? breakEvenCashbackPct(av, bonus) : null,
      aviosRate: av,
    };
  }, [cashbackRate, aviosRate, amount, boosterBonus, anyError]);

  const reset = () => {
    setCashbackRate('');
    setAviosRate('');
    setAmount('');
    setBoosterBonus('');
  };

  const cashbackWins =
    results?.winner === 'cashback' || results?.winner === 'cashback-only';
  const aviosWins =
    results?.winner === 'avios' || results?.winner === 'avios-only';
  const tied = results?.winner === 'tie';

  const verdict = () => {
    if (!results) return null;
    if (tied) return 'Dead heat — take whichever tracks more reliably.';
    if (results.winner === 'cashback-only') return 'Only the cashback route earns here.';
    if (results.winner === 'avios-only') return 'Only the eStore route earns here.';
    const gap = Math.abs(results.deltaAvios);
    return `${cashbackWins ? 'Cashback → Booster' : 'Avios eStore'} wins by ${avios(gap)} Avios (≈ ${gbp(aviosToGbp(gap))})`;
  };

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground">
          <Percent className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Cashback vs Avios eStore</h3>
          <p className="text-xs text-muted-foreground">
            Per-purchase: which gives more Avios?
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cb-rate" className="text-xs">Cashback %</Label>
            <Input
              id="cb-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="e.g. 10"
              value={cashbackRate}
              onChange={(e) => setCashbackRate(e.target.value)}
              aria-invalid={errors.cashbackRate}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="av-rate" className="text-xs">Avios per £1</Label>
            <Input
              id="av-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="e.g. 4"
              value={aviosRate}
              onChange={(e) => setAviosRate(e.target.value)}
              aria-invalid={errors.aviosRate}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="cb-amount" className="text-xs">Amount spent (£)</Label>
          <Input
            id="cb-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={errors.amount}
            className="mt-1"
          />
        </div>

        {showBooster ? (
          <div>
            <Label htmlFor="cb-booster" className="text-xs">
              Booster bonus % <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="cb-booster"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="e.g. 30 during a promo"
              value={boosterBonus}
              onChange={(e) => setBoosterBonus(e.target.value)}
              aria-invalid={errors.boosterBonus}
              className="mt-1"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowBooster(true)}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Booster promo live? Add the bonus %
          </button>
        )}

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
            className="mt-5 bg-primary text-primary-foreground rounded-xl p-4"
          >
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-secondary" />
              Avios outcome on {gbp(results.amount)}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                  Via cashback
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    cashbackWins || tied ? 'bg-secondary' : 'bg-white/15'
                  }`}
                >
                  <div className="text-xl font-extrabold">
                    {avios(results.cashbackAvios)}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {gbp(results.cashbackValue)} → Booster
                    {results.boosterBonus > 0 ? ` +${results.boosterBonus}%` : ''}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                  Via Avios eStore
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    aviosWins || tied ? 'bg-secondary' : 'bg-white/15'
                  }`}
                >
                  <div className="text-xl font-extrabold">
                    {avios(results.directAvios)}
                  </div>
                  <div className="text-[10px] opacity-80">direct</div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center mt-3 opacity-90">
              🏆 <span className="font-bold">{verdict()}</span>
            </p>

            {results.breakEvenPct !== null && (
              <p className="text-[11px] text-center mt-2 pt-2 border-t border-white/20 opacity-90">
                Break-even: you need{' '}
                <span className="font-bold">
                  {results.breakEvenPct.toFixed(2)}% cashback
                </span>{' '}
                to match {results.aviosRate} Avios/£
                {results.boosterBonus > 0 ? ' at this Booster promo' : ''}.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default CashbackVsAviosCalculator;
