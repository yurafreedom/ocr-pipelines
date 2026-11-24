import { CONFIG } from './config.js';
import { ESTIMATE_EVENT, ESTIMATE_STORAGE_KEY } from './events.js';
import { estimate, formatEstimate, money, moneyRange, number, roundToStep, tierPrices } from './estimate.js';

const SELECTS = ['system', 'currency', 'source', 'deployment', 'criticality'];
const RANGES = ['documents', 'minutes', 'hourly', 'errors', 'types', 'integrations'];
const OUTPUTS = ['price', 'hours', 'monthly', 'annual', 'payback', 'roi'];

export function init() {
  const root = document.querySelector('[data-js="calculator"]');
  if (!root) return;

  const field = (name) => root.querySelector(`[data-js="calc-${name}"]`);
  const tiers = [...root.querySelectorAll('[data-js="calc-tier"]')];
  let currency = field('currency').value;
  let maturity = tiers.find((tier) => tier.getAttribute('aria-pressed') === 'true')?.dataset.value || 'workflow';
  let latest;
  const bar = field('bar');

  const labelFor = {
    documents: (v) => number(v),
    minutes: (v) => `${v} min`,
    hourly: (v) => money(v, currency),
    errors: (v) => money(v, currency),
    types: (v) => String(v),
    integrations: (v) => String(v),
  };

  function read() {
    const input = { currency, maturity };
    for (const name of SELECTS) input[name] = field(name).value;
    for (const name of RANGES) input[name] = Number(field(name).value);
    return input;
  }

  function render() {
    const input = read();
    latest = estimate(input, CONFIG.PRICING, CONFIG.FX_FROM_USD);
    const text = formatEstimate(latest, currency);
    for (const name of OUTPUTS) field(name).value = text[name];
    if (bar) field('bar-summary').textContent = `${text.price} · ${text.hours}`;
    for (const name of RANGES) {
      const label = labelFor[name](input[name]);
      field(`${name}-value`).textContent = label;
      field(name).setAttribute('aria-valuetext', label);
    }
  }

  function renderTierPrices() {
    const prices = tierPrices(CONFIG.PRICING, CONFIG.FX_FROM_USD, currency);
    for (const [key, value] of Object.entries(prices)) {
      const node = document.querySelector(`[data-js="tier-price-${key}"]`);
      if (node) node.textContent = value;
    }
  }

  // Money sliders keep their meaning when the currency changes: value and range are converted.
  function convertMoneySliders(from, to) {
    const ratio = CONFIG.FX_FROM_USD[to] / CONFIG.FX_FROM_USD[from];
    for (const name of ['hourly', 'errors']) {
      const slider = field(name);
      const range = moneyRange(name, CONFIG.FX_FROM_USD[to]);
      const value = roundToStep(Number(slider.value) * ratio, range.step);
      slider.min = range.min;
      slider.max = range.max;
      slider.step = range.step;
      slider.value = Math.min(range.max, Math.max(range.min, value));
    }
  }

  function setMaturity(value) {
    maturity = value;
    for (const tier of tiers) {
      const active = tier.dataset.value === value;
      tier.classList.toggle('is-active', active);
      tier.setAttribute('aria-pressed', String(active));
    }
    render();
  }

  root.addEventListener('input', (event) => {
    if (event.target === field('currency')) {
      const next = field('currency').value;
      convertMoneySliders(currency, next);
      currency = next;
      renderTierPrices();
    }
    render();
  });

  for (const tier of tiers) tier.addEventListener('click', () => setMaturity(tier.dataset.value));

  // Segment cards: “Estimate this system” preselects the system before the anchor jump.
  for (const link of document.querySelectorAll('[data-calc-system]')) {
    link.addEventListener('click', () => {
      field('system').value = link.dataset.calcSystem;
      render();
    });
  }

  // “Book an audit with this estimate”: hand the estimate to the form and Calendly, then follow #book.
  field('use').addEventListener('click', () => {
    try {
      sessionStorage.setItem(ESTIMATE_STORAGE_KEY, latest.summary);
    } catch {
      // storage unavailable (private mode, blocked): the event below still carries the estimate
    }
    document.dispatchEvent(new CustomEvent(ESTIMATE_EVENT, {
      detail: { system: latest.system, hoursSaved: latest.hoursSaved, summary: latest.summary },
    }));
  });

  if (bar) watchBar(bar, field('controls'), field('results'));
  render();
}

// Phones: the fixed summary bar shows while the controls are on screen and the results are not.
// Visibility below 1024px only is handled in CSS; here it is purely intersection state, no scroll listeners.
function watchBar(bar, controls, results) {
  if (!('IntersectionObserver' in window)) return;
  const inView = new Map([[controls, false], [results, false]]);
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
    bar.classList.toggle('is-visible', inView.get(controls) && !inView.get(results));
  });
  observer.observe(controls);
  observer.observe(results);
}
