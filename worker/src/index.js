// ocr-audit — Cloudflare Worker behind the "Book a free workflow audit" form on
// https://sachenkolabs.tech/ocr-pipelines/. POST → a Telegram message.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (wrangler secret put). Var: DEV ("1" allows http://localhost:*, local only).
// Validation and message format are unchanged from the former Pages Function functions/api/audit.js.

const MAX_BODY = 12000;
const MAX_MESSAGE = 3500;
const MIN_FILL_MS = 3000;
const TELEGRAM_TIMEOUT_MS = 8000;
const ALLOWED_ORIGIN = 'https://sachenkolabs.tech';
const SITE_URL = 'https://sachenkolabs.tech/ocr-pipelines/';
const SEGMENTS = ['Warehouse & logistics', 'Construction & trades', 'Finance & back office', 'Other'];
const CONTACT_METHODS = ['telegram', 'call'];

const ERRORS = {
  400: 'Please check your details and try again.',
  403: 'This form can only be sent from sachenkolabs.tech.',
  413: 'Your message is too long. Please shorten it and try again.',
  502: 'Couldn’t send right now.',
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    const cors = originAllowed(origin, env) ? corsHeaders(origin) : {};
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...cors } });
    const response = await handlePost(request, env);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function handlePost(request, env) {
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const fail = (status) => respond(wantsJson, status);

  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return fail(413);
  if (!originAllowed(request.headers.get('origin'), env)) return fail(403);

  let raw;
  try {
    raw = await request.text();
  } catch {
    return fail(400);
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY) return fail(413);

  const fields = await parseBody(raw, request.headers.get('content-type') || '');
  if (!fields) return fail(400);

  // Bots get the same answer as people, so they learn nothing from being filtered.
  // startedAt is set by JS on first focus; without JS it is empty and the timing check is skipped.
  const startedAt = Number(fields.startedAt) || 0;
  if (fields.company_website || (startedAt && Date.now() - startedAt < MIN_FILL_MS)) return respond(wantsJson, 200);

  const data = validate(fields);
  if (data.error) return respond(wantsJson, 400, data.error);

  const text = formatMessage(data, request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error('Telegram sendMessage failed', response.status, await response.text());
      return fail(502);
    }
  } catch (error) {
    console.error('Telegram sendMessage failed', error);
    return fail(502);
  } finally {
    clearTimeout(timer);
  }
  return respond(wantsJson, 200);
}

function originAllowed(origin, env) {
  if (!origin) return false;
  if (origin === ALLOWED_ORIGIN) return true;
  return env.DEV === '1' && /^http:\/\/localhost(:\d+)?$/.test(origin);
}

async function parseBody(raw, contentType) {
  try {
    if (contentType.includes('application/json')) {
      const body = JSON.parse(raw);
      return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(raw));
    }
    if (contentType.includes('multipart/form-data')) {
      const form = await new Response(raw, { headers: { 'Content-Type': contentType } }).formData();
      return Object.fromEntries([...form].filter(([, value]) => typeof value === 'string'));
    }
  } catch {
    // fall through
  }
  return null;
}

// Returns the cleaned fields, or { error } with a message the form can show as-is.
function validate(fields) {
  const { email, segment, paperwork, contactMethod } = fields;
  const telegram = fields.telegram ?? '';
  const calculatorSnapshot = fields.calculatorSnapshot ?? '';
  if (typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return { error: 'Please enter a valid email address.' };
  }
  if (!SEGMENTS.includes(segment)) return { error: 'Please choose your segment.' };
  if (!CONTACT_METHODS.includes(contactMethod)) return { error: 'Please choose how we should continue.' };
  if (typeof telegram !== 'string' || telegram.length > 80 || (contactMethod === 'telegram' && telegram.trim().length < 2)) {
    return { error: 'Please enter your Telegram username.' };
  }
  if (typeof paperwork !== 'string' || paperwork.trim().length < 10 || paperwork.length > 5000) {
    return { error: 'Please describe the workflow in 10 to 5,000 characters.' };
  }
  if (typeof calculatorSnapshot !== 'string' || calculatorSnapshot.length > 2000) return { error: ERRORS[400] };
  return {
    email: email.trim(),
    segment,
    paperwork: paperwork.trim(),
    contactMethod,
    telegram: telegram.trim().replace(/^@/, ''),
    calculatorSnapshot: calculatorSnapshot.trim(),
  };
}

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Escapes, then shortens to `max` characters without cutting an entity like "&amp;" in half.
function clip(value, max) {
  const escaped = escapeHtml(value);
  if (escaped.length <= max) return escaped;
  return escaped.slice(0, max - 1).replace(/&[a-z]*$/, '') + '…';
}

// Every value sits outside the <b> tags and is clipped on its own, so the HTML stays valid at
// any input size; the workflow text gets whatever room is left under MAX_MESSAGE.
function formatMessage(data, request) {
  const continueVia = data.contactMethod === 'telegram' ? `telegram @${data.telegram}` : 'call';
  const page = request.headers.get('referer') || SITE_URL;
  const ua = (request.headers.get('user-agent') || '').slice(0, 80);
  const head = [
    '<b>New audit request</b>',
    `<b>Email:</b> ${clip(data.email, 300)}`,
    `<b>Segment:</b> ${clip(data.segment, 60)}`,
    `<b>Continue via:</b> ${clip(continueVia, 120)}`,
    '<b>Workflow:</b>',
  ].join('\n');
  const calculator = data.calculatorSnapshot ? `<b>Calculator:</b> ${clip(data.calculatorSnapshot, 1000)}` : '';
  const footer = `<b>Page:</b> ${clip(page, 200)} · <b>UA:</b> ${clip(ua, 200)}`;
  const room = MAX_MESSAGE - [head, calculator, footer].filter(Boolean).join('\n').length - 1;
  return [head, clip(data.paperwork, room), calculator, footer].filter(Boolean).join('\n');
}

function respond(wantsJson, status, error = ERRORS[status]) {
  const ok = status === 200;
  if (wantsJson) {
    return Response.json(ok ? { ok: true } : { ok: false, error }, { status });
  }
  return new Response(null, { status: 303, headers: { Location: `${SITE_URL}?${ok ? 'sent' : 'error'}=1#book` } });
}
