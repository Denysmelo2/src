/**
 * Miles acquisition maths — the cost side of the ledger.
 *
 * 2026-09-14: Reverse-engineered from Nanda Pelos Ayres' course
 * template "Planilha De Controle de Milhas" (VERSÃO DE TESTES,
 * shared read-only). The export gives computed values rather than
 * formulas, so each rule below was derived from the sheet's columns
 * and then checked against its own numbers — see milesMath.test-ish
 * notes in the PR. 8 of the 9 program tabs reconcile exactly; the
 * AA/Aeroplan tab does not reconcile with its own inputs (its
 * transfer row has a £0.00 source cost), which looks like a gap in
 * the test template rather than a different rule.
 *
 * The sheet's ledger columns map to these four primitives:
 *
 *   Milhas Finais                  → milesAfterBonus()
 *   Investimento (transferências)  → transferInvestment()
 *   Custo final (do milheiro)      → costPerThousand()
 *   Custo Médio do Milheiro        → averageCostPerThousand()
 *
 * "Milheiro" = 1,000 miles/points, the unit the whole hobby prices
 * in. Everything here is currency-agnostic: feed it £ and you get £
 * per 1,000, feed it R$ and you get R$ per 1,000.
 */

/** Points after a transfer/purchase bonus: 600 + 50% → 900. */
export function milesAfterBonus(miles, bonusPct = 0) {
  const m = Number(miles);
  if (!Number.isFinite(m) || m <= 0) return 0;
  const b = Number(bonusPct);
  const bonus = Number.isFinite(b) && b > 0 ? b : 0;
  return Math.round(m * (1 + bonus / 100));
}

/**
 * What 1,000 of these points cost you: £35 for 1,200 points → £29.17
 * per 1,000. This is the number every "is it worth it?" decision
 * compares against.
 */
export function costPerThousand(investment, miles) {
  const inv = Number(investment);
  const m = Number(miles);
  if (!Number.isFinite(inv) || inv < 0) return 0;
  if (!Number.isFinite(m) || m <= 0) return 0;
  return (inv / m) * 1000;
}

/**
 * What a transfer really costs: points moved out of a source program
 * are not free — they cost whatever you paid to get them. 500
 * RevPoints at £10.00/1,000 → £5.00 of value spent.
 */
export function transferInvestment(sourceMiles, sourceCostPerThousand) {
  const m = Number(sourceMiles);
  const c = Number(sourceCostPerThousand);
  if (!Number.isFinite(m) || m <= 0) return 0;
  if (!Number.isFinite(c) || c <= 0) return 0;
  return (m / 1000) * c;
}

/**
 * A program's blended cost per 1,000, across every way you acquired
 * its points. Weighted by volume — NOT the mean of the individual
 * per-1,000 costs, which would let a 50-point bonus outweigh a
 * 75,000-point purchase.
 *
 * @param {Array<{investment: number, miles: number}>} entries — ledger rows
 */
export function averageCostPerThousand(entries) {
  if (!Array.isArray(entries)) return 0;
  let totalInvestment = 0;
  let totalMiles = 0;
  for (const entry of entries) {
    const inv = Number(entry?.investment);
    const m = Number(entry?.miles);
    if (Number.isFinite(inv) && inv > 0) totalInvestment += inv;
    if (Number.isFinite(m) && m > 0) totalMiles += m;
  }
  return costPerThousand(totalInvestment, totalMiles);
}

/**
 * One full ledger row, the way the sheet computes it: apply the
 * bonus, work out what the points cost (directly, or as value spent
 * from a source program), then price the result per 1,000.
 *
 * @param {object} args
 * @param {number} args.investment — cash paid directly (0 for a pure transfer)
 * @param {number} args.miles — points before the bonus
 * @param {number} [args.bonusPct] — transfer/purchase bonus
 * @param {number} [args.sourceCostPerThousand] — set for a transfer: what the
 *   source program's points cost you per 1,000
 */
export function ledgerRow({ investment = 0, miles = 0, bonusPct = 0, sourceCostPerThousand = 0 }) {
  const finalMiles = milesAfterBonus(miles, bonusPct);
  const transferred = transferInvestment(miles, sourceCostPerThousand);
  const totalInvestment = (Number(investment) || 0) + transferred;
  return {
    finalMiles,
    transferInvestment: transferred,
    totalInvestment,
    costPerThousand: costPerThousand(totalInvestment, finalMiles),
  };
}
