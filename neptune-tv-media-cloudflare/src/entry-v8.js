import base from './entry-v7.js';
import { StudioStore } from './store-v4.js';
import { sendCode } from './portal-email.js';
import { isSameOrigin, json, securityHeaders } from './security.js';

export { StudioStore };

const REQUEST_CODE_PATH = '/api/client/request-code';
const EMAIL_HEALTH_PATH = '/api/public/email-health';
const PROSPECT_START_PATH = '/api/public/prospect/start';
const PROSPECT_CONTEXT_PATH = '/api/public/prospect/context';
const RESEND_USER_AGENT = 'Neptune-Media-Worker/3.4.1';
const TUNNEL_ORIGINS = new Set([
  'https://media.neptunebusiness.com',
  'https://www.media.neptunebusiness.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS' && [PROSPECT_START_PATH, PROSPECT_CONTEXT_PATH].includes(url.pathname)) {
        return secure(corsResponse(request, new Response(null, { status: 204 })));
      }
      if (request.method === 'GET' && url.pathname === EMAIL_HEALTH_PATH) {
        return secure(await emailHealth(env));
      }
      if (request.method === 'POST' && url.pathname === REQUEST_CODE_PATH) {
        return secure(await requestClientCode(request, env));
      }
      if (request.method === 'POST' && url.pathname === PROSPECT_START_PATH) {
        return secure(await startPublicProspect(request, env));
      }
      if (request.method === 'GET' && url.pathname === PROSPECT_CONTEXT_PATH) {
        return secure(await getPublicProspectContext(request, env));
      }

      const response = await base.fetch(request, env, ctx);
      if (shouldInjectProspectCapture(request, response)) return secure(await injectProspectCapture(response));
      return response;
    } catch (error) {
      console.error('entry_v8_failed', safeError(error));
      return secure(json({ error: 'internal_error' }, 500));
    }
  },
  async scheduled(controller, env, ctx) {
    if (typeof base.scheduled === 'function') return base.scheduled(controller, env, ctx);
  },
};

async function startPublicProspect(request, env) {
  if (!allowedProspectOrigin(request)) return corsResponse(request, json({ error: 'origin_forbidden' }, 403));
  const payload = await request.json().catch(() => ({}));
  const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
  const response = await callStore(studio, '/portal/prospect-start', payload);
  const result = await response.json().catch(() => ({}));
  return corsResponse(request, json(result, response.status));
}

async function getPublicProspectContext(request, env) {
  if (!allowedProspectOrigin(request)) return corsResponse(request, json({ error: 'origin_forbidden' }, 403));
  const token = new URL(request.url).searchParams.get('token') || '';
  const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
  const response = await callStore(studio, '/portal/prospect-context', { token });
  const result = await response.json().catch(() => ({}));
  return corsResponse(request, json(result, response.status));
}

function allowedProspectOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  if (origin === new URL(request.url).origin) return true;
  return TUNNEL_ORIGINS.has(origin);
}

function corsResponse(request, response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin');
  if (origin && allowedProspectOrigin(request)) headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Vary', 'Origin');
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function shouldInjectProspectCapture(request, response) {
  if (request.method !== 'GET' || !response.ok) return false;
  const path = new URL(request.url).pathname;
  if (path.startsWith('/api/') || path.startsWith('/studio') || path.startsWith('/espace-client')) return false;
  return (response.headers.get('Content-Type') || '').includes('text/html');
}

async function injectProspectCapture(response) {
  let body = await response.text();
  const css = '/styles/prospect-capture-v1.css?v=1';
  const js = '/prospect-capture-v1.js?v=1';
  if (!body.includes(css)) body = body.replace('</head>', `<link rel="stylesheet" href="${css}"></head>`);
  if (!body.includes(js)) body = body.replace('</body>', `<script src="${js}" defer></script></body>`);
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

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
    return json({ error: result.reason === 'client_not_found' ? 'client_not_found' : 'email_send_failed', reason: result.reason || 'access_not_found' }, 404);
  }

  let sent;
  try {
    sent = await sendCode(env, request.url, email, result.code);
  } catch (error) {
    await revokeCode(studio, email);
    console.error('client_security_code_provider_exception', { to: email, ...safeError(error) });
    return json({ error: 'email_send_failed' }, 503);
  }

  if (!sent.ok) {
    await revokeCode(studio, email);
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

async function revokeCode(studio, email) {
  try {
    const response = await callStore(studio, '/portal/invalidate-code', { email });
    if (!response.ok) console.error('client_security_code_revoke_failed', { to: email, status: response.status });
  } catch (error) {
    console.error('client_security_code_revoke_exception', { to: email, ...safeError(error) });
  }
}

async function emailHealth(env) {
  const sender = String(env.AUTH_FROM_EMAIL || 'Neptune Media <onboarding@resend.dev>');
  const senderEmail = sender.match(/<([^>]+)>/u)?.[1] || sender;
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';

  if (!env.RESEND_API_KEY) {
    return noStore(json({
      configured: false,
      apiAuthenticated: false,
      providerKeyAccepted: false,
      sender,
      senderDomain,
      senderDomainVerified: null,
      error: 'email_service_not_configured',
    }, 503));
  }

  try {
    const authProbe = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': RESEND_USER_AGENT,
      },
      body: '{}',
    });
    const authRaw = await authProbe.text();
    const authResult = parseJson(authRaw);
    const providerKeyAccepted = authProbe.ok || [400, 422].includes(authProbe.status);

    let senderDomainVerified = senderDomain === 'resend.dev' ? true : null;
    let providerDomainStatus = senderDomain === 'resend.dev' ? 'provider_default' : 'not_checked';

    if (providerKeyAccepted && senderDomain !== 'resend.dev') {
      const domainProbe = await fetch('https://api.resend.com/domains', {
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'User-Agent': RESEND_USER_AGENT,
        },
      });
      if (domainProbe.ok) {
        const domainResult = parseJson(await domainProbe.text());
        const domains = Array.isArray(domainResult.data) ? domainResult.data : [];
        const record = domains.find((item) => String(item.name || '').toLowerCase() === senderDomain);
        providerDomainStatus = record?.status || 'not_found';
        senderDomainVerified = String(record?.status || '').toLowerCase() === 'verified';
      } else if (![401, 403].includes(domainProbe.status)) {
        providerDomainStatus = `http_${domainProbe.status}`;
      } else {
        providerDomainStatus = 'sending_access_key';
      }
    }

    const healthy = providerKeyAccepted && senderDomainVerified !== false;
    return noStore(json({
      configured: true,
      apiAuthenticated: providerKeyAccepted,
      providerKeyAccepted,
      sender,
      senderDomain,
      senderDomainVerified,
      providerStatus: authProbe.status,
      providerCode: authResult.name || authResult.code || '',
      providerDomainStatus,
    }, healthy ? 200 : 503));
  } catch (error) {
    console.error('resend_health_failed', safeError(error));
    return noStore(json({
      configured: true,
      apiAuthenticated: false,
      providerKeyAccepted: false,
      sender,
      senderDomain,
      senderDomainVerified: null,
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
