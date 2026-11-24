import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { CONFIG } from './src/js/config.js';
import { estimate, formatEstimate, money, moneyRange, number, tierPrices } from './src/js/estimate.js';

// Lucide icons used on the page. The sprite is injected at <!-- icon-sprite -->.
const ICONS = [
  'arrow-down',
  'arrow-right',
  'arrow-up-right',
  'calendar-days',
  'camera',
  'check',
  'chevron-down',
  'circle-alert',
  'clock-3',
  'coins',
  'file-text',
  'flask-conical',
  'gauge',
  'git-branch',
  'hard-hat',
  'phone-call',
  'receipt',
  'rocket',
  'rotate-ccw',
  'scan-text',
  'send',
  'server',
  'trending-up',
  'user-round',
  'warehouse',
];

function iconSprite() {
  const symbols = ICONS.map((name) => {
    const file = fileURLToPath(import.meta.resolve(`lucide-static/icons/${name}.svg`));
    const svg = readFileSync(file, 'utf8');
    const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
    const body = inner.replace(/\s*\n\s*/g, '').trim();
    return `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`;
  }).join('');
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" hidden>${symbols}</svg>`;

  return {
    name: 'icon-sprite',
    transformIndexHtml: (html) => html.replace('<!-- icon-sprite -->', sprite),
  };
}

// Values available to {{ PLACEHOLDER }} tokens in HTML. Everything comes from config.js,
// so links, durations and prices change in one place; the calculator's no-JS results are
// computed by the same estimate() the runtime uses.
function templateContext() {
  const currency = CONFIG.CURRENCY_DEFAULT;
  const rate = CONFIG.FX_FROM_USD[currency];
  const input = {
    ...CONFIG.CALC_DEFAULTS,
    currency,
    hourly: CONFIG.HOURLY_DEFAULT[currency],
    errors: CONFIG.ERROR_COST_DEFAULT[currency],
  };
  const result = estimate(input, CONFIG.PRICING, CONFIG.FX_FROM_USD);
  return {
    ...CONFIG,
    TIER_PRICE: tierPrices(CONFIG.PRICING, CONFIG.FX_FROM_USD, currency),
    CALC: formatEstimate(result, currency),
    CALC_INPUT: input,
    CALC_LABEL: {
      documents: number(input.documents),
      minutes: `${input.minutes} min`,
      hourly: money(input.hourly, currency),
      errors: money(input.errors, currency),
      types: String(input.types),
      integrations: String(input.integrations),
    },
    RANGE: { hourly: moneyRange('hourly', rate), errors: moneyRange('errors', rate) },
  };
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// <!-- if:demo --> … <!-- /if:demo --> is kept only when CONFIG.DEMO_URL is set;
// <!-- if:no-demo --> … <!-- /if:no-demo --> only when it is empty. Decided at build time.
function configHtml() {
  return {
    name: 'config-html',
    transformIndexHtml(html) {
      const demo = Boolean(CONFIG.DEMO_URL);
      const context = templateContext();
      return html
        .replace(
          /^([ \t]*)<!-- if:(no-)?demo -->([\s\S]*?)<!-- \/if:\2demo -->(\n?)/gm,
          (_, indent, no, body, eol) => {
            if (demo === Boolean(no)) return '';
            // Markers on their own lines (multi-line blocks) disappear together with those lines.
            const multiline = body.startsWith('\n');
            return multiline ? body.slice(1).replace(/\n[ \t]*$/, '') + eol : indent + body + eol;
          },
        )
        .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
          const value = path.split('.').reduce((obj, key) => obj?.[key], context);
          if (value === undefined || typeof value === 'object') throw new Error(`Unknown HTML placeholder {{ ${path} }}`);
          return escapeHtml(value);
        });
    },
  };
}

export default defineConfig({
  // Served as a GitHub Pages project site: https://sachenkolabs.tech/ocr-pipelines/
  base: '/ocr-pipelines/',
  plugins: [configHtml(), iconSprite()],
  build: {
    target: 'es2022',
    cssTarget: ['chrome120', 'safari17', 'firefox120'],
  },
});
