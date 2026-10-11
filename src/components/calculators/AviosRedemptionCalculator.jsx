// "Vale a pena comprar essa passagem com Avios?" — the redemption-side
// decision, and the one the whole miles ledger exists to answer.
//
// 2026-09-14: Built from the maths in Nanda's course spreadsheet
// (cost per 1,000) plus the redemption arithmetic. The course lesson
// pages themselves could not be read from this environment, so the
// verdict threshold is YOUR cost per 1,000 rather than a fixed rule —
// which is robust whatever threshold the lesson quotes.

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Award, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberField, isInvalidNumber, num } from '@/components/calculators/NumberField';
import { redemptionOutcome, GBP_PER_AVIOS } from '@/lib/aviosMath';

const DEFAULT_COST_PER_THOUSAND = GBP_PER_AVIOS * 1000; // £9.20

const gbp = (n) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const avios = (n) => Math.round(n).toLocaleString('en-GB');

export function AviosRedemptionCalculator() {
  const [cashPrice, setCashPrice] = useState('');
  const [aviosUsed, setAviosUsed] = useState('');
  const [taxes, setTaxes] = useState('');
  const [costPerThousand, setCostPerThousand] = useState('');

  const fields = [cashPrice, aviosUsed, taxes, costPerThousand];
  const anyError = fields.some(isInvalidNumber);
  const hasInput = fields.some((f) => f !== '');

  const results = useMemo(() => {
    if (anyError) return null;
    const price = num(cashPrice);
    const used = num(aviosUsed);
    if (price <= 0 || used <= 0) return null;

    const cpt = costPerThousand === '' ? DEFAULT_COST_PER_THOUSAND : num(costPerThousand);
    return {
      ...redemptionOutcome({
        cashPrice: price,
        aviosUsed: used,
        cashPaid: num(taxes),
        costPerThousand: cpt,
      }),
      cashPrice: price,
      aviosUsed: used,
      taxes: num(taxes),
      usingDefaultCost: costPerThousand === '',
    };
  }, [cashPrice, aviosUsed, taxes, costPerThousand, anyError]);

  const reset = () => {
    setCashPrice('');
    setAviosUsed('');
    setTaxes('');
    setCostPerThousand('');
  };

  const worthIt = results?.verdict === 'worth-it';
  const feesSwallowFare = results && results.pencePerAvios === 0;

  return (
    <div className="bg-card border-2 border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground">
          <Plane className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Is this flight worth Avios?</h3>
          <p className="text-xs text-muted-foreground">
            What each Avios releases vs what it cost you
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="red-cash"
            label="Cash fare (£)"
            placeholder="e.g. 600"
            value={cashPrice}
            onChange={setCashPrice}
          />
          <NumberField
            id="red-avios"
            label="Avios required"
            step="1"
            placeholder="e.g. 25000"
            value={aviosUsed}
            onChange={setAviosUsed}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="red-taxes"
            label="Taxes & fees (£)"
            placeholder="e.g. 150"
            value={taxes}
            onChange={setTaxes}
          />
          <NumberField
            id="red-cpt"
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
              {avios(results.aviosUsed)} Avios on a {gbp(results.cashPrice)} fare
            </h4>

            {feesSwallowFare ? (
              <p className="text-[11px] text-center opacity-90">
                The {gbp(results.taxes)} in fees already costs more than the{' '}
                {gbp(results.cashPrice)} cash fare — paying cash wins outright.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                      Each Avios releases
                    </div>
                    <div className={`p-2 rounded-lg ${worthIt ? 'bg-secondary' : 'bg-white/15'}`}>
                      <div className="text-xl font-extrabold">
                        {results.pencePerAvios.toFixed(2)}p
                      </div>
                      <div className="text-[10px] opacity-80">value released</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">
                      Each Avios cost you
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
                      ? 'Worth the Avios'
                      : results.verdict === 'tie'
                        ? 'Line ball — no gain either way'
                        : 'Pay cash'}
                  </span>
                </p>

                <p className="text-[11px] text-center mt-2 pt-2 border-t border-white/20 opacity-90">
                  Avios route really costs {gbp(results.aviosRouteCost)} (Avios +{' '}
                  {gbp(results.taxes)} fees) vs {gbp(results.cashPrice)} cash —{' '}
                  <span className="font-bold">
                    {results.savingGbp >= 0
                      ? `${gbp(results.savingGbp)} ahead`
                      : `${gbp(Math.abs(results.savingGbp))} behind`}
                  </span>
                  .
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default AviosRedemptionCalculator;
