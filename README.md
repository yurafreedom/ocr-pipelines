# Document automation landing

Landing page for Yura Sachenko's independent document-automation service: invoices, delivery notes, quotes and tenders turned into verified data in the systems a team already uses. It has a savings calculator and a "book a free workflow audit" form.

Live: https://sachenkolabs.tech/ocr-pipelines/

## Stack

Plain HTML, CSS and JavaScript, built with Vite. No framework. The font (Inter Tight) and the Lucide icons are bundled locally.

- `index.html`: the page. `{{ PLACEHOLDER }}` tokens are filled at build time from `src/js/config.js`.
- `src/`: CSS blocks and JS modules (calculator, audit form, Calendly embed).
- `worker/`: `ocr-audit`, a Cloudflare Worker that receives the audit form and forwards it to Telegram.

## Build

Requires Node 22 or later.

```sh
npm ci
npm run dev      # local dev server
npm run build    # static site in dist/, served under /ocr-pipelines/
npm run check    # stylelint, eslint, build, html-validate
```

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Form Worker

```sh
npx wrangler secret put TELEGRAM_BOT_TOKEN --config worker/wrangler.toml
npx wrangler secret put TELEGRAM_CHAT_ID --config worker/wrangler.toml
npm run worker:deploy
```

It accepts posts only from `https://sachenkolabs.tech`. For local testing, copy `.dev.vars.example` to `worker/.dev.vars` (gitignored), set `DEV=1` to allow `http://localhost`, and run `npm run worker:dev`.

## Licence

Code © Yura Sachenko. Inter Tight is under the SIL Open Font License (`public/fonts/inter-tight-OFL.txt`).
