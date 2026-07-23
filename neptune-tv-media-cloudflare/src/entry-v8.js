import base from './entry-v7.js';
import { StudioStore } from './store-v4.js';
import { sendCode } from './portal-email.js';
import { isSameOrigin, json, securityHeaders } from './security.js';

export { StudioStore };

const REQUEST_CODE_PATH = '/api/client/request-code';
const EMAIL_HEALTH_PATH = '/api/public/email-health';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === EMAIL_HEALTH_PATH) {
        return secure(await emailHealth(env));
      }
      if (request.method === 'POST' && url.pathname === REQUEST_CODE_PATH) {
        return secure(await requestClientCode(request, env));
      }
      return base.fetch(request, env, ctx);
    } catch (error) {
      console.error('entry_v8_failed', safeError(error));
      return secure(json({ error: 'internal_error' }, 500));
    }
  },
  async scheduled(controller, env, ctx) {
    if (typeof base.scheduled === 'function') return base.scheduled(controller, env, ctx);
  },
};

async function requestClientCode(request, env) {
  if (!isSameOrigin(request)) return json({ error: 'origin_forbidden' }, 403);

  const payload = await request.json().catch(() => ({}));
  const email = String(payload.email || '').trim().toLowerCase();
  const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
  const storeResponse = await callStore(studio, '/portal/request-code', { email });
  const result = await storeResponse.json().catch(() => ({}));

  if (!storeResponse.ok) return json(result, storeResponse.status);

  if (!result.deliver || !result.code) {
    if (result.retryAfter || result.throttled) {
      return json({
        ok: true,
        delivered: false,
        codeExpected: true,
        retryAfter: Number(result.retryAfter || 0),
        throttled: Boolean(result.throttled),
      });
    }
    console.warn('client_security_code_not_created', {
      to: email,
      reason: result.reason || 'access_not_found',
    });
    return json({ error: 'email_send_failed', reason: result.reason || 'access_not_found' }, 404);
  }

  let sent;
  try {
    sent = await sendCode(env, request.url, email, result.code);
  } catch (error) {
    console.error('client_security_code_provider_exception', { to: email, ...safeError(error) });
    return json({ error: 'email_send_failed' }, 503);
  }

  if (!sent.ok) {
    console.error('client_security_code_delivery_failed', {
      to: email,
      error: sent.error || 'email_send_failed',
      providerStatus: sent.providerStatus || 0,
      providerCode: sent.providerCode || '',
    });
    return json({ error: sent.error || 'email_send_failed' }, 503);
  }

  console.log('client_security_code_sent', { emailId: sent.id || null, to: email });
  return json({
    ok: true,
    delivered: true,
    codeExpected: true,
    emailId: sent.id || null,
    retryAfter: 0,
    throttled: false,
  });
}

async function emailHealth(env) {
  const sender = String(env.AUTH_FROM_EMAIL || 'Neptune Media <onboarding@resend.dev>');
  const senderEmail = sender.match(/<([^>]+)>/u)?.[1] || sender;
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';

  if (!env.RESEND_API_KEY) {
    return noStore(json({
      configured: false,
      apiAuthenticated: false,
      sender,
      senderDomain,
      senderDomainVerified: false,
      error: 'email_service_not_configured',
    }, 503));
  }

  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    const raw = await response.text();
    const data = parseJson(raw);
    const domains = Array.isArray(data.data) ? data.data : [];
    const record = domains.find((item) => String(item.name || '').toLowerCase() === senderDomain);
    const senderDomainVerified = senderDomain === 'resend.dev' || String(record?.status || '').toLowerCase() === 'verified';

    return noStore(json({
      configured: true,
      apiAuthenticated: response.ok,
      sender,
      senderDomain,
      senderDomainVerified,
      providerStatus: response.status,
      providerDomainStatus: record?.status || (senderDomain === 'resend.dev' ? 'provider_default' : 'not_found'),
    }, response.ok && senderDomainVerified ? 200 : 503));
  } catch (error) {
    console.error('resend_health_failed', safeError(error));
    return noStore(json({
      configured: true,
      apiAuthenticated: false,
      sender,
      senderDomain,
      senderDomainVerified: false,
      error: 'email_provider_unreachable',
    }, 503));
  }
}

async function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function parseJson(value) {
  try { return JSON.parse(String(value || '{}')); } catch { return {}; }
}

function safeError(error) {
  return {
    name: error?.name || 'Error',
    message: String(error?.message || error || 'unknown').slice(0, 500),
  };
}
