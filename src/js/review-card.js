const INITIAL_VALUE = '1,490.00';
const EXPECTED = 1440;
const TEXT = {
  pending: { status: 'Needs review', icon: '#i-circle-alert', reason: 'Total does not match line items.', arithmetic: 'failed', paths: 'disagree', confirm: 'Confirm correction' },
  confirmed: { status: 'Confirmed', icon: '#i-check', reason: 'Total matches line items.', arithmetic: 'passed', paths: 'reviewed', confirm: 'Confirmed' },
};
const DEFAULT_MESSAGE = 'Awaiting confirmation · Export blocked';

export function init() {
  const root = document.querySelector('[data-js="review-card"]');
  if (!root) return;

  const part = (name) => root.querySelector(`[data-js="review-${name}"]`);
  const input = part('input');
  const statusIcon = part('status').querySelector('use');

  function render(confirmed, message) {
    const text = confirmed ? TEXT.confirmed : TEXT.pending;
    root.classList.toggle('is-confirmed', confirmed);
    part('status-text').textContent = text.status;
    statusIcon.setAttribute('href', text.icon);
    part('reason').textContent = text.reason;
    part('arithmetic').textContent = text.arithmetic;
    part('paths').textContent = text.paths;
    part('confirm').textContent = text.confirm;
    part('message').textContent = message || DEFAULT_MESSAGE;
  }

  function confirm() {
    if (Number(input.value.replace(/[£, ]/g, '')) === EXPECTED) {
      render(true, 'Correction confirmed in this example. No business records were changed.');
    } else {
      render(false, 'Enter 1,440.00 to match the source, then confirm.');
      input.focus();
    }
  }

  input.addEventListener('input', () => render(false, ''));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  });
  part('confirm').addEventListener('click', confirm);
  part('reset').addEventListener('click', () => {
    input.value = INITIAL_VALUE;
    render(false, '');
  });
}
