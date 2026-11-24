import { CONFIG } from './config.js';
import { ESTIMATE_EVENT, readStoredEstimate } from './events.js';

const ASSETS = 'https://assets.calendly.com/assets/external/widget';
const THEME = 'hide_gdpr_banner=1&background_color=161b1f&text_color=f3f5f4&primary_color=e6b55e';

export function init() {
  const root = document.querySelector('[data-js="calendly"]');
  if (!root || !('IntersectionObserver' in window)) return;

  const fallback = root.querySelector('[data-js="calendly-fallback"]');
  let summary = readStoredEstimate();
  let started = false;

  // An estimate chosen before the widget loads travels as Calendly's a1 answer.
  document.addEventListener(ESTIMATE_EVENT, (event) => {
    summary = event.detail.summary;
  });

  function widgetUrl() {
    const url = `${CONFIG.CALENDLY_URL}?${THEME}`;
    return summary ? `${url}&a1=${encodeURIComponent(summary)}` : url;
  }

  function load() {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${ASSETS}.css`;
    document.head.append(style);

    const script = document.createElement('script');
    script.src = `${ASSETS}.js`;
    script.async = true;
    script.addEventListener('load', () => {
      if (!window.Calendly) return; // keep the fallback link
      fallback.remove(); // not `hidden`: the block sets display, which wins over [hidden]
      window.Calendly.initInlineWidget({ url: widgetUrl(), parentElement: root });
    });
    // On error the fallback link simply stays.
    document.head.append(script);
  }

  const observer = new IntersectionObserver((entries) => {
    if (started || !entries.some((entry) => entry.isIntersecting)) return;
    started = true;
    observer.disconnect();
    load();
  }, { rootMargin: '600px' });
  observer.observe(root);
}
