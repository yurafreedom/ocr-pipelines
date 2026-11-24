// Parity check: the old RoiCalculator formula (copied verbatim from _legacy/app/components/roi-calculator.tsx)
// against the new estimate() in USD, where the FX fix is a no-op. Usage: node scripts/compare-calculator.mjs
import { CONFIG } from '../src/js/config.js';
import { estimate, formatEstimate } from '../src/js/estimate.js';

const systems = CONFIG.PRICING;
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

function legacy({ systemKey, maturity, documents, minutes, hourlyCost, monthlyErrors, documentTypes, integrations, source, deployment, criticality }) {
  const system = systems[systemKey];
  const sourcePenalty = source === "handwriting" ? 0.16 : source === "mixed" ? 0.08 : -0.02;
  const automationRate = Math.max(0.42, Math.min(0.82, system.rate - sourcePenalty));
  const manualHours = documents * minutes / 60;
  const hoursSaved = Math.round(manualHours * automationRate);
  const recoveredErrors = monthlyErrors * (criticality === "high" ? 0.62 : criticality === "standard" ? 0.48 : 0.35);
  const operatingCost = Math.max(140, documents * 0.06 + integrations * 45 + (deployment === "private" ? 180 : 0));
  const monthlyNetBenefit = Math.max(0, hoursSaved * hourlyCost + recoveredErrors - operatingCost);
  const annualNetBenefit = monthlyNetBenefit * 12;
  let base;
  if (maturity === "mvp") base = system.mvp;
  else if (maturity === "full") base = system.full;
  else base = [system.mvp[1] * 1.05, system.full[0] * 0.9];
  const complexity = (1 + Math.min(documentTypes - 1, 9) * 0.035)
    * (1 + integrations * 0.09)
    * (source === "handwriting" ? 1.22 : source === "mixed" ? 1.08 : 1)
    * (deployment === "private" ? 1.24 : 1)
    * (criticality === "high" ? 1.16 : 1)
    * (documents > 10000 ? 1.18 : documents > 3000 ? 1.08 : 1);
  const investmentLow = Math.round(base[0] * complexity / 250) * 250;
  const investmentHigh = Math.max(investmentLow + 500, Math.round(base[1] * complexity / 250) * 250);
  const midpoint = (investmentLow + investmentHigh) / 2;
  const paybackMonths = monthlyNetBenefit ? midpoint / monthlyNetBenefit : 0;
  const firstYearRoi = midpoint ? Math.round((annualNetBenefit - midpoint) / midpoint * 100) : 0;
  return {
    price: `${money(investmentLow)}–${money(investmentHigh)}`,
    hours: `${hoursSaved.toLocaleString("en-US")} h/mo`,
    monthly: money(monthlyNetBenefit),
    annual: money(annualNetBenefit),
    payback: paybackMonths ? `${paybackMonths.toFixed(1)} mo` : "—",
    roi: firstYearRoi > 0 ? `${firstYearRoi}%` : "Validate first",
  };
}

const SETS = [
  { name: 'A · old defaults', systemKey: 'capture', maturity: 'workflow', documents: 1200, minutes: 7, hourlyCost: 28, monthlyErrors: 900, documentTypes: 4, integrations: 1, source: 'mixed', deployment: 'cloud', criticality: 'standard' },
  { name: 'B · 3PL, high volume', systemKey: 'delivery', maturity: 'full', documents: 12000, minutes: 12, hourlyCost: 35, monthlyErrors: 4000, documentTypes: 8, integrations: 3, source: 'handwriting', deployment: 'private', criticality: 'high' },
  { name: 'C · small MVP', systemKey: 'boq', maturity: 'mvp', documents: 300, minutes: 3, hourlyCost: 15, monthlyErrors: 0, documentTypes: 1, integrations: 0, source: 'digital', deployment: 'cloud', criticality: 'low' },
];

let failed = 0;
for (const set of SETS) {
  const old = legacy(set);
  const now = formatEstimate(estimate({
    system: set.systemKey, maturity: set.maturity, currency: 'USD', documents: set.documents, minutes: set.minutes,
    hourly: set.hourlyCost, errors: set.monthlyErrors, types: set.documentTypes, integrations: set.integrations,
    source: set.source, deployment: set.deployment, criticality: set.criticality,
  }, CONFIG.PRICING, CONFIG.FX_FROM_USD), 'USD');
  console.log(`\n${set.name}`);
  for (const key of Object.keys(old)) {
    const same = old[key] === now[key];
    if (!same) failed++;
    console.log(`  ${key.padEnd(8)} old ${old[key].padEnd(18)} new ${now[key].padEnd(18)} ${same ? '✓' : '✗'}`);
  }
}
process.exit(failed ? 1 : 0);
