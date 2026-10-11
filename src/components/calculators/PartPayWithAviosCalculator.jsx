// "Calculadora Avios + dinheiro: qual a melhor opção?" — BA's Part Pay
// with Avios slider, priced properly.
//
// 2026-09-14: Mathematically the same question as a full redemption —
// cash you avoid, divided by the Avios it took to avoid it — so it
// shares redemptionOutcome with the flight calculator. Here the
// "cash still payable" is the reduced fare rather than taxes.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberField, isInvalidNumber, num } from '@/components/calculators/NumberField';
import { redemptionOutcome, GBP_PER_AVIOS } from '@/lib/aviosMath';

const DEFAULT_COST_PER_THOUSAND = GBP_PER_AVIOS * 1000; // £9.20

const gbp = (n) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const avios = (n) => Math.round(n).toLocaleString('en-GB');

export function PartPayWithAviosCalculator() {
  const [fullFare, setFullFare] = useState('');
  const [cashWithAvios, setCashWithAvios] = useState('');
  const [aviosUsed, setAviosUsed] = useState('');
  const [costPerThousand, setCostPerThousand] = useState('');

  const fields = [fullFare, cashWithAvios, aviosUsed, costPerThousand];
  const anyError = fields.some(isInvalidNumber);
  const hasInput = fields.some((f) => f !== '');

  const results = useMemo(() => {
    if (anyError) return null;
    const full = num(fullFare);
    const reduced = num(cashWithAvios);
    const used = num(aviosUsed);
    if (full <= 0 || used <= 0) return null;

    const cpt = costPerThousand === '' ? DEFAULT_COST_PER_THOUSAND : num(costPerThousand);
    return {
      ...redemptionOutcome({
        cashPrice: full,
        aviosUsed: used,
        cashPaid: reduced,
        costPerThousand: cpt,
      }),
      full,
      reduced,
      used,
      cashSaved: Math.max(full - reduced, 0),
      usingDefaultCost: costPerThousand === '',
    };
  }, [fullFare, cashWithAvios, aviosUsed, costPerThousand, anyError]);

  const reset = () => {
    setFullFare('');
    setCashWithAvios('');
    setAviosUsed('');
    setCostPerThousand('');
  };

  const worthIt = results?.verdict === 'worth-it';
  const noSaving = results && results.cashSaved <= 0;

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Avios + cash</h3>
          <p className="text-xs text-muted-foreground">
            Part-pay sliders: which step is actually good value?
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pp-full"
            label="Full cash fare (£)"
            placeholder="e.g. 300"
            value={fullFare}
            onChange={setFullFare}
          />
          <NumberField
            id="pp-reduced"
            label="Cash with Avios (£)"
            placeholder="e.g. 250"
            value={cashWithAvios}
            onChange={setCashWithAvios}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="pp-avios"
            label="Avios used"
            step="1"
            placeholder="e.g. 6000"
            value={aviosUsed}
            onChange={setAviosUsed}
          />
          <NumberField
            id="pp-cpt"
            label="Your £/1,000"
            hint="(optional)"
            placeholder="9.20"
            value={costPerThousand}
            onChange={setCostPerThousand}
          />
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
            className="mt-5 bg-primary text-primary-foreground rounded-xl p-4"
          >
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-secondary" />
              {avios(results.used)} Avios to knock {gbp(results.cashSaved)} off
            </h4>

            {noSaving ? (
              <p className="text-[11px] text-center opacity-90">
                That step saves no cash at all — the Avios buy you nothing here.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                      This step pays
                    </div>
                    <div className={`p-2 rounded-lg ${worthIt ? 'bg-secondary' : 'bg-white/15'}`}>
                      <div className="text-xl font-extrabold">
                        {results.pencePerAvios.toFixed(2)}p
                      </div>
                      <div className="text-[10px] opacity-80">per Avios</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                      Your Avios cost
                    </div>
                    <div className={`p-2 rounded-lg ${worthIt ? 'bg-white/15' : 'bg-secondary'}`}>
                      <div className="text-xl font-extrabold">
                        {results.yourCostPence.toFixed(2)}p
                      </div>
                      <div className="text-[10px] opacity-80">
                        {results.usingDefaultCost ? 'par £9.20/1,000' : 'your rate'}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-center mt-3 opacity-90">
                  {worthIt ? '🏆 ' : '⚠️ '}
                  <span className="font-bold">
                    {worthIt
                      ? 'Use the Avios on this step'
                      : results.verdict === 'tie'
                        ? 'Line ball — keep the Avios for flexibility'
                        : 'Keep the Avios, pay cash'}
                  </span>
                </p>

                <p className="text-[11px] text-center mt-2 pt-2 border-t border-white/20 opacity-90">
                  Part-pay steps rarely beat a full redemption — try the same Avios on a
                  reward seat before spending them here.
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default PartPayWithAviosCalculator;
