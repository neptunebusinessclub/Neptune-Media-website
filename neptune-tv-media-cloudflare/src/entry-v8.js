import base from './entry-v7.js';
import { StudioStore } from './store-v4.js';
import { emailHealthResponse } from './email-service.js';
import { handleClientCodeRequest } from './portal-code-login.js';
import { json, securityHeaders } from './security.js';

export { StudioStore };

const REQUEST_CODE_PATH = '/api/client/request-code';
const EMAIL_HEALTH_PATH = '/api/public/email-health';
const PROSPECT_START_PATH = '/api/public/prospect/start';
const PROSPECT_CONTEXT_PATH = '/api/public/prospect/context';
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
        return secure(await emailHealthResponse(env));
      }
      if (request.method === 'POST' && url.pathname === REQUEST_CODE_PATH) {
        return secure(await handleClientCodeRequest(request, env));
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

function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
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

function safeError(error) {
  return {
    name: error?.name || 'Error',
    message: String(error?.message || error || 'unknown').slice(0, 500),
  };
}
