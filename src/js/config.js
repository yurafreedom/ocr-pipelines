// Single source for links, prices, FX rates, durations and flags.
// Read at build time by vite.config.js (HTML placeholders, demo gating) and at runtime by the modules.
export const CONFIG = {
  SITE_URL: 'https://sachenkolabs.tech/ocr-pipelines/',
  AUDIT_URL: 'https://ocr-audit.sachenkolabs-site.workers.dev', // the ocr-audit Cloudflare Worker (worker/)
  CALENDLY_URL: 'https://calendly.com/yura-sachenkolabs/30min',
  TELEGRAM_URL: 'https://t.me/yurii_sachenko',
  DEMO_URL: '', // 'https://demo.sachenkolabs.tech' once the demo is live; empty = no demo markup is built

  CURRENCY_DEFAULT: 'GBP',
  FX_FROM_USD: { USD: 1, GBP: 0.79, EUR: 0.92 }, // TODO: update manually each quarter
  HOURLY_DEFAULT: { USD: 28, GBP: 22, EUR: 26 },
  ERROR_COST_DEFAULT: { USD: 900, GBP: 700, EUR: 800 },

  // Build prices in USD — the `systems` object from the old roi-calculator.tsx, unchanged.
  PRICING: {
    capture: { name: 'Document capture & review', rate: 0.72, mvp: [2500, 5000], full: [9000, 18000] },
    delivery: { name: 'Delivery-note & order matching', rate: 0.74, mvp: [3500, 7000], full: [12000, 28000] },
    boq: { name: 'Quote & BOQ intelligence', rate: 0.62, mvp: [4500, 9000], full: [16000, 36000] },
    finance: { name: 'Invoice & finance automation', rate: 0.72, mvp: [3500, 7500], full: [12000, 26000] },
    search: { name: 'Document search with evidence', rate: 0.64, mvp: [5000, 10000], full: [18000, 42000] },
    operations: { name: 'End-to-end document operations', rate: 0.76, mvp: [7500, 15000], full: [28000, 65000] },
  },

  // Pricing strip durations. TODO: not yet confirmed by the owner.
  PRICING_TIERS: {
    mvp: { title: 'Focused MVP', time: '2–4 weeks' },
    workflow: { title: 'Working workflow', time: '4–8 weeks' },
    full: { title: 'Full production system', time: '8–14 weeks' },
  },

  // Process step durations (section “How I work”). TODO: not yet confirmed by the owner.
  PROCESS: {
    audit: 'Free, 30 minutes',
    scope: 'Within 3 working days',
    mvp: '2–4 weeks, fixed price',
    production: '6–12 weeks',
  },

  // Calculator defaults, in CURRENCY_DEFAULT. Select/tier defaults are also marked `selected` in index.html.
  CALC_DEFAULTS: {
    system: 'capture',
    maturity: 'workflow',
    documents: 1200,
    minutes: 7,
    types: 4,
    integrations: 1,
    source: 'mixed',
    deployment: 'cloud',
    criticality: 'standard',
  },
};
