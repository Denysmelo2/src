// platformLabel — how a platform's name is shown to a user.
//
// The scrapers store platforms as lowercase keys ('quidco', 'everup'),
// and those keys are also what affiliateLinks.js and the wallet match
// on, so the database keeps them. Only the label changes: Cowork found
// "quidco", "cheddar", "everup", "jamdoughnut" and "picodi" printed as
// is on the cards (docs/DECISAO_VALOR_PONTOS_2026-10-18.md, section 3,
// item 4). Names already written properly ('NX Rewards') pass through.

const LABELS = {
  quidco: 'Quidco',
  cheddar: 'Cheddar',
  everup: 'EverUp',
  jamdoughnut: 'JamDoughnut',
  picodi: 'Picodi',
  airtime: 'Airtime',
  topcashback: 'TopCashback',
  avios: 'Avios',
};

export function platformLabel(name) {
  if (!name) return name;
  const s = String(name);
  const hit = LABELS[s.trim().toLowerCase()];
  if (hit) return hit;
  // An unknown all-lowercase key still reads better capitalised.
  return s === s.toLowerCase() ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
