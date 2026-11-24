import { CONFIG } from './config.js';
import { ESTIMATE_EVENT } from './events.js';

const MESSAGES = {
  sending: 'Sending…',
  sent: {
    telegram: 'Sent. I’ll reply in Telegram within one working day.',
    call: 'Sent. I’ll email you within one working day to arrange the call.',
  },
  sentAfterRedirect: 'Sent. I’ll reply within one working day.',
  // Delivery failed (Telegram down, network error, or the no-JS redirect): offer the direct channel.
  unavailable: 'Couldn’t send — ',
  unavailableLink: 'message me on Telegram instead',
};
const SUBMIT_LABEL = { idle: 'Send my workflow', busy: 'Sending…', done: 'Sent' };

export function init() {
  const form = document.querySelector('[data-js="audit-form"]');
  if (!form) return;

  const part = (name) => form.querySelector(`[data-js="audit-${name}"]`);
  const status = part('status');
  const submit = part('submit');
  const telegramField = part('telegram-field');
  const telegramInput = part('telegram');

  function showStatus(text, kind, telegramLink = false) {
    status.textContent = text;
    if (telegramLink) {
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = CONFIG.TELEGRAM_URL;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = MESSAGES.unavailableLink;
      status.append(link, '.');
    }
    status.classList.toggle('audit-form__status--ok', kind === 'ok');
    status.classList.toggle('audit-form__status--error', kind === 'error');
  }

  function contactMethod() {
    return form.elements.contactMethod.value || 'call';
  }

  // Telegram username: shown (CSS :has) and required only when Telegram is chosen.
  function syncContact() {
    const telegram = contactMethod() === 'telegram';
    telegramField.hidden = !telegram;
    telegramInput.required = telegram;
  }
  form.addEventListener('change', (event) => {
    if (event.target.name === 'contactMethod') syncContact();
  });
  syncContact();

  form.addEventListener('focusin', () => {
    part('started').value = String(Date.now());
  }, { once: true });

  document.addEventListener(ESTIMATE_EVENT, (event) => {
    const { system, hoursSaved, summary } = event.detail;
    part('snapshot').value = summary.slice(0, 2000);
    const note = part('estimate');
    note.textContent = `Calculator estimate attached — ${system} · ${hoursSaved.toLocaleString('en-GB')} h/month`;
    note.hidden = false;
  });

  // Field values are left untouched so the visitor can retry.
  function failed(message) {
    submit.disabled = false;
    submit.textContent = SUBMIT_LABEL.idle;
    if (message) showStatus(message, 'error');
    else showStatus(MESSAGES.unavailable, 'error', true);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = SUBMIT_LABEL.busy;
    showStatus(MESSAGES.sending);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) {
        submit.textContent = SUBMIT_LABEL.done;
        showStatus(MESSAGES.sent[contactMethod()], 'ok');
        return;
      }
      // 400/403/413 carry a message the visitor can act on; anything else is a delivery failure.
      if ([400, 403, 413].includes(response.status) && data.error) failed(data.error);
      else failed();
    } catch {
      failed(); // network error
    }
  });

  // No-JS round trip: the ocr-audit Worker redirects back to ?sent=1#book or ?error=1#book.
  const params = new URLSearchParams(window.location.search);
  if (params.has('sent') || params.has('error')) {
    if (params.has('sent')) showStatus(MESSAGES.sentAfterRedirect, 'ok');
    else showStatus(MESSAGES.unavailable, 'error', true);
    params.delete('sent');
    params.delete('error');
    const query = params.toString();
    history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  }
}
