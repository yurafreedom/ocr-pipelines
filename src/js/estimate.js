// Pure calculator maths, shared by calculator.js (runtime) and vite.config.js (static no-JS values).
// Formulas are a 1:1 port of the old roi-calculator.tsx, except that USD prices and operating
// costs are converted with the FX rate before rounding (the old version only swapped the symbol).

const LOCALES = { USD: 'en-US', GBP: 'en-GB', EUR: 'en-IE' };

// Slider ranges in USD; converted per currency.
export const MONEY_RANGES_USD = {
  hourly: { min: 12, max: 100, step: 1 },
  errors: { min: 0, max: 10000, step: 100 },
};

export function money(value, currency) {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function number(value) {
  return Math.round(value).toLocaleString('en-GB');
}

export function currencySymbol(currency) {
  return new Intl.NumberFormat(LOCALES[currency], { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency').value;
}

export function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

export function moneyRange(key, rate) {
  const { min, max, step } = MONEY_RANGES_USD[key];
  return { min: roundToStep(min * rate, step), max: roundToStep(max * rate, step), step };
}

export function estimate(input, pricing, fx) {
  const system = pricing[input.system];
  const rate = fx[input.currency];
  const { documents, minutes, hourly, errors, types, integrations, source, deployment, criticality, maturity } = input;

  const sourcePenalty = source === 'handwriting' ? 0.16 : source === 'mixed' ? 0.08 : -0.02;
  const automationRate = Math.max(0.42, Math.min(0.82, system.rate - sourcePenalty));
  const manualHours = (documents * minutes) / 60;
  const hoursSaved = Math.round(manualHours * automationRate);
  const recoveredErrors = errors * (criticality === 'high' ? 0.62 : criticality === 'standard' ? 0.48 : 0.35);
  const operatingCost = Math.max(140, documents * 0.06 + integrations * 45 + (deployment === 'private' ? 180 : 0)) * rate;
  const monthlyNetBenefit = Math.max(0, hoursSaved * hourly + recoveredErrors - operatingCost);
  const annualNetBenefit = monthlyNetBenefit * 12;

  let base;
  if (maturity === 'mvp') base = system.mvp;
  else if (maturity === 'full') base = system.full;
  else base = [system.mvp[1] * 1.05, system.full[0] * 0.9];
  const complexity = (1 + Math.min(types - 1, 9) * 0.035)
    * (1 + integrations * 0.09)
    * (source === 'handwriting' ? 1.22 : source === 'mixed' ? 1.08 : 1)
    * (deployment === 'private' ? 1.24 : 1)
    * (criticality === 'high' ? 1.16 : 1)
    * (documents > 10000 ? 1.18 : documents > 3000 ? 1.08 : 1);
  const investmentLow = roundToStep(base[0] * complexity * rate, 250);
  const investmentHigh = Math.max(investmentLow + 500, roundToStep(base[1] * complexity * rate, 250));
  const midpoint = (investmentLow + investmentHigh) / 2;
  const paybackMonths = monthlyNetBenefit ? midpoint / monthlyNetBenefit : 0;
  const firstYearRoi = midpoint ? Math.round(((annualNetBenefit - midpoint) / midpoint) * 100) : 0;
  const summary = `${system.name}; ${maturity}; ${documents} documents/month; ${types} document types; ${integrations} integrations; estimated build ${money(investmentLow, input.currency)}–${money(investmentHigh, input.currency)}; ${hoursSaved} hours/month potentially saved; ${money(monthlyNetBenefit, input.currency)} estimated net monthly benefit.`;

  return {
    system: system.name,
    investmentLow,
    investmentHigh,
    hoursSaved,
    monthlyNetBenefit,
    annualNetBenefit,
    paybackMonths,
    firstYearRoi,
    summary,
  };
}

// Display strings for the results panel.
export function formatEstimate(result, currency) {
  return {
    price: `${money(result.investmentLow, currency)}–${money(result.investmentHigh, currency)}`,
    hours: `${number(result.hoursSaved)} h/mo`,
    monthly: money(result.monthlyNetBenefit, currency),
    annual: money(result.annualNetBenefit, currency),
    payback: result.paybackMonths ? `${result.paybackMonths.toFixed(1)} mo` : '—',
    roi: result.firstYearRoi > 0 ? `${result.firstYearRoi}%` : 'Validate first',
  };
}

// “from £1.5k” strip: minimum over systems, converted, rounded down to 500.
export function tierPrices(pricing, fx, currency) {
  const systems = Object.values(pricing);
  const rate = fx[currency];
  const from = (usd) => {
    const value = Math.floor((usd * rate) / 500) * 500;
    return `from ${currencySymbol(currency)}${value / 1000}k`;
  };
  return {
    mvp: from(Math.min(...systems.map((s) => s.mvp[0]))),
    workflow: from(Math.min(...systems.map((s) => s.mvp[1] * 1.05))),
    full: from(Math.min(...systems.map((s) => s.full[0]))),
  };
}
