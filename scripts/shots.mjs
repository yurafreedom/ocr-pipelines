// Full-page screenshots of the built site (dist/) at the reference widths.
// Usage: npm run build && npm run shots
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const WIDTHS = (process.env.WIDTHS || "375,768,1280,1920").split(",").map(Number);
const OUT = 'screenshots';

const server = await preview({ preview: { port: 4173, strictPort: false } });
const url = server.resolvedUrls.local[0];
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await page.screenshot({ path: `${OUT}/${width}.png`, fullPage: true });
    console.log(`${width}px → ${OUT}/${width}.png${overflow > 0 ? `  ⚠ horizontal overflow ${overflow}px` : ''}`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
