// "Calculadora Avios Booster" — is this Avios purchase priced well?
//
// 2026-09-14: Same engine as the course spreadsheet's ledger row:
// apply the bonus, then price the result per 1,000 (milheiro).
// Derived from the sheet, which reconciles exactly on its own rows;
// the lesson page itself was unreachable from this environment.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberField, isInvalidNumber, num } from '@/components/calculators/NumberField';
import { milesAfterBonus, costPerThousand } from '@/lib/milesMath';
import { GBP_PER_AVIOS } from '@/lib/aviosMath';

const PAR_PER_THOUSAND = GBP_PER_AVIOS * 1000; // £9.20

const gbp = (n) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const avios = (n) => Math.round(n).toLocaleString('en-GB');

export function AviosBoosterCalculator() {
  const [aviosOffered, setAviosOffered] = useState('');
  const [price, setPrice] = useState('');
  const [bonusPct, setBonusPct] = useState('');

  const fields = [aviosOffered, price, bonusPct];
  const anyError = fields.some(isInvalidNumber);
  const hasInput = fields.some((f) => f !== '');

  const results = useMemo(() => {
    if (anyError) return null;
    const offered = num(aviosOffered);
    const paid = num(price);
    if (offered <= 0 || paid <= 0) return null;

    const bonus = num(bonusPct);
    const finalAvios = milesAfterBonus(offered, bonus);
    const perThousand = costPerThousand(paid, finalAvios);
    return {
      offered,
      paid,
      bonus,
      finalAvios,
      perThousand,
      pencePerAvios: perThousand / 10,
      // A purchase only pays off on redemptions that release more than
      // it cost — that break-even IS the price per Avios.
      cheaperThanPar: perThousand < PAR_PER_THOUSAND,
    };
  }, [aviosOffered, price, bonusPct, anyError]);

  const reset = () => {
    setAviosOffered('');
    setPrice('');
    setBonusPct('');
  };

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Avios Booster price check</h3>
          <p className="text-xs text-muted-foreground">
            What this offer really costs per 1,000
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="bst-avios"
            label="Avios offered"
            step="1"
            placeholder="e.g. 10000"
            value={aviosOffered}
            onChange={setAviosOffered}
          />
          <NumberField
            id="bst-price"
            label="Price (£)"
            placeholder="e.g. 150"
            value={price}
            onChange={setPrice}
          />
        </div>
        <NumberField
          id="bst-bonus"
          label="Bonus %"
          hint="(optional)"
          step="1"
          placeholder="e.g. 30"
          value={bonusPct}
          onChange={setBonusPct}
        />

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
              {gbp(results.paid)} for {avios(results.finalAvios)} Avios
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                  You receive
                </div>
                <div className="p-2 rounded-lg bg-white/15">
                  <div className="text-xl font-extrabold">{avios(results.finalAvios)}</div>
                  <div className="text-[10px] opacity-80">
                    {avios(results.offered)}
                    {results.bonus > 0 ? ` +${results.bonus}%` : ' (no bonus)'}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                  Cost per 1,000
                </div>
                <div
                  className={`p-2 rounded-lg ${
                    results.cheaperThanPar ? 'bg-secondary' : 'bg-white/15'
                  }`}
                >
                  <div className="text-xl font-extrabold">{gbp(results.perThousand)}</div>
                  <div className="text-[10px] opacity-80">
                    {results.pencePerAvios.toFixed(2)}p each
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center mt-3 opacity-90">
              {results.cheaperThanPar ? '🏆 ' : '⚠️ '}
              <span className="font-bold">
                {results.cheaperThanPar
                  ? `Below the ${gbp(PAR_PER_THOUSAND)}/1,000 par price`
                  : `Above the ${gbp(PAR_PER_THOUSAND)}/1,000 par price`}
              </span>
            </p>

            <p className="text-[11px] text-center mt-2 pt-2 border-t border-white/20 opacity-90">
              Only pays off on redemptions releasing more than{' '}
              <span className="font-bold">{results.pencePerAvios.toFixed(2)}p per Avios</span> —
              check the flight in the calculator above.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AviosBoosterCalculator;
