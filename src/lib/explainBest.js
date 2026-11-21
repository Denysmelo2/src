// explainBest — "Why it's the best option" on /compare (owner's tests
// 21/11/2026, B6; handover docs/HANDOVER_CLAUDE_CODE_2026-11-21-testes-do-dono.md).
//
// The first route gets a "Best option" badge and, under it, the sum done
// with the numbers on the screen:
//   NX Rewards: 10% of £100 = £10.00
//   Next best, Avios eStore: 6 Avios × £100 = 600 Avios ≈ £5.52
//   You get £4.48 more with NX Rewards.
// The other routes lose their "#2", "#3" and say how far behind they are
// ("£4.48 less than the best option"). The order does not change.
//
// Items are the /compare route items (pages/ComparePage.jsx): auto ones
// carry `strategy` (lib/strategies.js), curated ones `curated.live`
// (lib/curatedReturn.js); both may carry the user's card (lib/cardEarn.js:
// cardGbp, cardName). Points use the same £ value the app shows ("≈ £5.52").
//
// Pure, no imports from '@/': tests/explainBest.test.js runs it under Node.

const TIE_GBP = 0.005;
const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const r2 = (v) => Math.round(n(v) * 100) / 100;
const gbp = (v) => `£${r2(v).toFixed(2)}`;
const amt = (v) => (Number.isInteger(n(v)) ? `£${n(v)}` : gbp(v));
const pct = (v) => `${r2(v)}%`;
const int = (v) => Math.round(n(v)).toLocaleString('en-GB');

function layerParts(layer, amount, paid) {
  if (!layer) return [];
  if (layer.kind === 'cashback') {
    const on = paid != null ? `on ${gbp(paid)}` : `of ${amt(amount)}`;
    return [`${pct(layer.ratePct)} ${paid != null ? 'cashback ' : ''}${on} = ${gbp(layer.gbpReturn)}`];
  }
  if (layer.kind === 'points') {
    const unit = layer.pointUnit || 'points';
    if (layer.fixedBonus || !(n(layer.earnRate) > 0)) return [`${int(layer.points)} ${unit} ≈ ${gbp(layer.gbpReturn)}`];
    const base = paid != null ? gbp(paid) : amt(amount);
    return [`${r2(layer.earnRate)} ${unit} × ${base} = ${int(layer.points)} ${unit} ≈ ${gbp(layer.gbpReturn)}`];
  }
  if (layer.kind === 'gift_card') {
    return [
      paid != null
        ? `${pct(layer.discountPct)} off a ${gbp(paid)} gift card = ${gbp(layer.gbpReturn)}`
        : `${pct(layer.discountPct)} off the gift card = ${gbp(layer.gbpReturn)}`,
    ];
  }
  if (layer.kind === 'student') return [`${pct(layer.discountPct)} student code = ${gbp(layer.gbpReturn)}`];
  return [];
}

/** The parts of one route's total: ["10% of £100 = £10.00", "£1.00 from your Amex"]. */
export function routeParts(item, amount) {
  const parts = [];
  if (item?.source === 'curated') {
    const live = item.curated?.live;
    const base = n(item.baseGbpReturn ?? item.gbpReturn);
    parts.push(`${live?.label || item.subtitle || 'Today’s rates'} = ${gbp(base)}`);
  } else {
    const s = item?.strategy;
    const layers = Array.isArray(s?.layers) ? s.layers : [];
    if (s?.type === 'student') {
      const paid = n(s.paidAmount);
      for (const l of layers) parts.push(...layerParts(l, amount, l.kind === 'student' ? null : paid));
    } else {
      for (const l of layers) parts.push(...layerParts(l, amount, null));
    }
  }
  if (n(item?.cardGbp) > 0) parts.push(`${gbp(item.cardGbp)} from your ${item.cardName || 'card'}`);
  return parts;
}

/** "NX Rewards: 10% of £100 = £10.00", or with several parts "…: a + b = £x". */
export function routeLine(item, amount) {
  const parts = routeParts(item, amount);
  const name = item?.title || 'This route';
  if (parts.length === 0) return `${name}: ${gbp(item?.gbpReturn)}`;
  if (parts.length === 1) return `${name}: ${parts[0]}`;
  return `${name}: ${parts.join(' + ')} = ${gbp(item.gbpReturn)}`;
}

/**
 * For ranked items (best first) and the amount typed:
 *   { lines: [best, next?, verdict?], behind: Map<id, "£4.48 less than the best option"> }
 * or null when there is no route.
 */
export function explainBest(items, amount) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  const [best, next] = list;
  const lines = [routeLine(best, amount)];
  if (next) {
    lines.push(`Next best, ${routeLine(next, amount)}`);
    const diff = n(best.gbpReturn) - n(next.gbpReturn);
    lines.push(
      diff >= TIE_GBP
        ? `You get ${gbp(diff)} more with ${best.title}.`
        : `Both pay ${gbp(best.gbpReturn)}; ${best.title} is the simpler one.`
    );
  }
  const behind = new Map();
  for (const it of list.slice(1)) {
    const d = n(best.gbpReturn) - n(it.gbpReturn);
    behind.set(it.id, d >= TIE_GBP ? `${gbp(d)} less than the best option` : 'Same as the best option');
  }
  return { lines, behind };
}
