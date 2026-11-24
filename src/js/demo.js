import { CONFIG } from './config.js';

const MIN_HEIGHT = 480;
const MAX_HEIGHT = 2000;

// The #demo section is only built when CONFIG.DEMO_URL is set (see vite.config.js).
// Without JS, or if the demo server is down, the static fallback inside the stage remains.
export function init() {
  const root = document.querySelector('[data-js="demo"]');
  if (!root || !CONFIG.DEMO_URL) return;

  const stage = root.querySelector('[data-js="demo-stage"]');
  const origin = new URL(CONFIG.DEMO_URL).origin;

  const frame = document.createElement('iframe');
  frame.className = 'demo__frame';
  frame.src = `${CONFIG.DEMO_URL}/embed`;
  frame.title = 'Document extraction demo';
  frame.loading = 'lazy';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-downloads allow-forms');

  root.querySelector('[data-js="demo-fallback"]').remove();
  root.querySelector('[data-js="demo-privacy"]').hidden = false;
  stage.append(frame);

  window.addEventListener('message', (event) => {
    if (event.origin !== origin || event.data?.type !== 'demo:height') return;
    const height = Number(event.data.value);
    if (!Number.isFinite(height)) return;
    frame.style.height = `${Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, height))}px`;
  });
}
