import { StudioStore } from './store.js';
import {
  clearSessionCookie,
  isSameOrigin,
  json,
  parseCookies,
  securityHeaders,
  sessionCookie,
  sha256,
  timingSafeEqual,
} from './security.js';

export { StudioStore };

const MODEL = '@cf/openai/gpt-oss-120b';
const COOKIE_NAME = '__Host-neptune_session';
const MAX_JSON_BODY_BYTES = 16 * 1024;
const MUTATING_ADMIN_PATHS = new Set([
  '/api/admin/apply',
  '/api/admin/ai',
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const objectId = env.STUDIO.idFromName('neptune-media-main');
    const studio = env.STUDIO.get(objectId);

    try {
      if (url.pathname === '/api/health') {
        return withSecurity(json({ ok: true, platform: 'cloudflare', database: 'durable-object-sqlite', ai: Boolean(env.AI) }));
      }

      if (url.pathname === '/api/public/catalog' && request.method === 'GET') {
        const response = await studio.fetch('https://store/public/catalog');
        if (!response.ok) return withSecurity(response);
        const catalog = await response.json();
        const activeProgramIds = new Set((catalog.programs || []).map((program) => program.id));
        catalog.episodes = (catalog.episodes || []).filter((episode) => (
          activeProgramIds.has(episode.programId)
          && episode.status === 'published'
          && Boolean(episode.slug && episode.videoUrl && episode.posterUrl)
        ));
        return withSecurity(json(catalog, 200, {
          'Cache-Control': response.headers.get('Cache-Control') || 'public, max-age=30',
        }));
      }

      if (url.pathname === '/api/track' && request.method === 'POST') {
        if (!isAllowedPublicOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        return withSecurity(await proxyJson(request, studio, '/public/track'));
      }

      if (url.pathname === '/api/ad-track' && request.method === 'POST') {
        if (!isAllowedPublicOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        return withSecurity(await proxyJson(request, studio, '/public/ad-track'));
      }

      if (url.pathname === '/api/auth/bootstrap' && request.method === 'POST') {
        if (!isSameOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        const payload = await request.json().catch(() => ({}));
        const suppliedToken = String(payload.token || '');
        if (!env.BOOTSTRAP_TOKEN || !timingSafeEqual(suppliedToken, env.BOOTSTRAP_TOKEN)) {
          return withSecurity(json({ error: 'invalid_bootstrap_token' }, 403));
        }
        return withSecurity(await callStore(studio, '/auth/bootstrap', payload));
      }

      if (url.pathname === '/api/auth/request-reset' && request.method === 'POST') {
        if (!isSameOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        const payload = await request.json().catch(() => ({}));
        const email = String(payload.email || '').trim().toLowerCase();
        const resultResponse = await callStore(studio, '/auth/request-reset', { email });
        const result = await resultResponse.json().catch(() => ({}));
        if (result.token && email === 'contact@neptunebusiness.com') {
          const sent = await sendResetEmail(env, request.url, result.token);
          if (!sent.ok) return withSecurity(json({ error: sent.error }, 503));
        }
        return withSecurity(json({ ok: true }));
      }

      if (url.pathname === '/api/auth/reset-password' && request.method === 'POST') {
        if (!isSameOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        const payload = await request.json().catch(() => ({}));
        return withSecurity(await callStore(studio, '/auth/reset-password', payload));
      }

      if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        if (!isSameOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        const payload = await request.json().catch(() => ({}));
        payload.attemptKey = await loginAttemptKey(request);
        const response = await studio.fetch('https://store/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return withSecurity(json(data, response.status));
        const headers = {
          'Set-Cookie': sessionCookie(data.token, request.url, data.expiresIn),
        };
        return withSecurity(json({ ok: true, csrfToken: data.csrfToken, user: data.user }, 200, headers));
      }

      if (url.pathname === '/api/auth/status' && request.method === 'GET') {
        const token = sessionToken(request);
        if (!token) return withSecurity(json({ authenticated: false }, 401));
        const response = await callStore(studio, '/auth/session', { token });
        return withSecurity(response);
      }

      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        if (!isSameOrigin(request)) return withSecurity(json({ error: 'origin_forbidden' }, 403));
        const token = sessionToken(request);
        if (token) await callStore(studio, '/auth/logout', { token });
        return withSecurity(json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request.url) }));
      }

      if (url.pathname === '/api/admin/state' && request.method === 'GET') {
        const auth = await authenticatedRequest(request, studio, false);
        if (!auth.ok) return withSecurity(auth.response);
        return withSecurity(await callStore(studio, '/admin/state', { token: auth.token }));
      }

      if (url.pathname === '/api/admin/apply' && request.method === 'POST') {
        const auth = await authenticatedRequest(request, studio, true);
        if (!auth.ok) return withSecurity(auth.response);
        const payload = await request.json().catch(() => ({}));
        return withSecurity(await callStore(studio, '/admin/apply', {
          token: auth.token,
          csrfToken: auth.csrfToken,
          action: payload.action,
          payload: payload.payload,
        }));
      }

      if (url.pathname === '/api/admin/ai' && request.method === 'POST') {
        const auth = await authenticatedRequest(request, studio, true);
        if (!auth.ok) return withSecurity(auth.response);
        const payload = await request.json().catch(() => ({}));
        const prompt = String(payload.prompt ?? '').trim().slice(0, 3000);
        if (!prompt) return withSecurity(json({ error: 'prompt_required' }, 400));
        const contextResponse = await callStore(studio, '/admin/ai-context', {
          token: auth.token,
          csrfToken: auth.csrfToken,
        });
        if (!contextResponse.ok) return withSecurity(contextResponse);
        const context = await contextResponse.json();
        const plan = await runCopilot(env, prompt, context);
        const logResponse = await callStore(studio, '/admin/ai-log', {
          token: auth.token,
          csrfToken: auth.csrfToken,
          prompt,
          plan,
        });
        const log = await logResponse.json().catch(() => ({}));
        return withSecurity(json({ plan, actionLogId: log.id || null }));
      }

      if (url.pathname === '/api/webhooks/conversion' && request.method === 'POST') {
        const signature = request.headers.get('X-Neptune-Webhook-Secret') || '';
        if (!env.CONVERSION_WEBHOOK_SECRET || !timingSafeEqual(signature, env.CONVERSION_WEBHOOK_SECRET)) {
          return withSecurity(json({ error: 'unauthorized' }, 401));
        }
        return withSecurity(await proxyJson(request, studio, '/webhook/conversion'));
      }

      if (url.pathname.startsWith('/api/')) return withSecurity(json({ error: 'not_found' }, 404));

      const assetResponse = await env.ASSETS.fetch(request);
      return withSecurity(assetResponse);
    } catch (error) {
      console.error('request_failed', error);
      return withSecurity(json({ error: 'internal_error' }, 500));
    }
  },
};

async function sendResetEmail(env, requestUrl, token) {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'email_service_not_configured' };
  const origin = new URL(requestUrl).origin;
  const resetUrl = `${origin}/studio/?reset=${encodeURIComponent(token)}`;
  const from = env.AUTH_FROM_EMAIL || 'Neptune Media <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: ['contact@neptunebusiness.com'],
      subject: 'Accès sécurisé au Studio Neptune Media',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px"><h1>Studio Neptune Media</h1><p>Utilisez ce lien pour créer ou réinitialiser votre mot de passe.</p><p><a href="${resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#5b42ff;color:#fff;text-decoration:none;font-weight:700">Choisir mon mot de passe</a></p><p>Ce lien expire dans 20 minutes et ne peut être utilisé qu’une fois.</p></div>`,
      text: `Créez ou réinitialisez votre mot de passe Studio Neptune Media : ${resetUrl}
Ce lien expire dans 20 minutes.`,
    }),
  });
  if (!response.ok) {
    console.error('resend_failed', response.status, await response.text());
    return { ok: false, error: 'email_send_failed' };
  }
  return { ok: true };
}

async function runCopilot(env, prompt, context) {
  if (!env.AI) throw new Error('workers_ai_binding_missing');
  const system = `Tu es Neptune Copilot, assistant d'exploitation d'une WebTV entrepreneuriale.
Tu analyses uniquement les données fournies. Tu ne dois jamais inventer des chiffres.
Tu proposes un plan, mais aucune action n'est exécutée automatiquement.
Réponds en JSON strict avec cette structure :
{"summary":"...","recommendations":["..."],"actions":[{"action":"...","label":"...","payload":{}}]}
Actions autorisées : save_program, save_episode, reorder_episodes, save_ad.
Pour reorder_episodes, payload doit être {"ids":["id1","id2"]}.
Pour save_episode, utilise uniquement les identifiants existants sauf demande explicite de création.
N'inclus jamais de mot de passe, secret ou donnée personnelle.`;
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify({ prompt, context }) },
    ],
    temperature: 0.1,
    max_tokens: 1400,
    response_format: { type: 'json_object' },
  });
  const content = result?.response || result?.result?.response || result?.choices?.[0]?.message?.content || '';
  const plan = parsePlan(content);
  validatePlan(plan);
  return plan;
}

function parsePlan(content) {
  if (content && typeof content === 'object') return content;
  const text = String(content || '').trim();
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/u);
    if (!match) throw new Error('ai_invalid_json');
    return JSON.parse(match[0]);
  }
}

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('ai_invalid_plan');
  plan.summary = String(plan.summary || '').slice(0, 4000);
  plan.recommendations = Array.isArray(plan.recommendations)
    ? plan.recommendations.slice(0, 12).map((item) => String(item).slice(0, 800))
    : [];
  const allowed = new Set(['save_program', 'save_episode', 'reorder_episodes', 'save_ad']);
  plan.actions = Array.isArray(plan.actions)
    ? plan.actions.slice(0, 10).filter((item) => item && allowed.has(item.action)).map((item) => ({
      action: item.action,
      label: String(item.label || item.action).slice(0, 200),
      payload: item.payload && typeof item.payload === 'object' ? item.payload : {},
    }))
    : [];
}

async function authenticatedRequest(request, studio, requireCsrf) {
  const token = sessionToken(request);
  if (!token) return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  if (requireCsrf && MUTATING_ADMIN_PATHS.has(new URL(request.url).pathname) && !isSameOrigin(request)) {
    return { ok: false, response: json({ error: 'origin_forbidden' }, 403) };
  }
  const sessionResponse = await callStore(studio, '/auth/session', { token });
  if (!sessionResponse.ok) return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  const session = await sessionResponse.json();
  const csrfToken = request.headers.get('X-CSRF-Token') || '';
  if (requireCsrf && !timingSafeEqual(csrfToken, session.csrfToken)) {
    return { ok: false, response: json({ error: 'csrf_failed' }, 403) };
  }
  return { ok: true, token, csrfToken, user: session.user };
}

function sessionToken(request) {
  return parseCookies(request.headers.get('Cookie') || '')[COOKIE_NAME] || '';
}

async function loginAttemptKey(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const userAgent = request.headers.get('User-Agent') || '';
  return sha256(`${ip}|${userAgent.slice(0, 160)}`);
}

function isAllowedPublicOrigin(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (!origin) return ['localhost', '127.0.0.1'].includes(requestUrl.hostname);
  if (origin === requestUrl.origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

async function proxyJson(request, studio, path) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    return json({ error: 'unsupported_media_type' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413);
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_JSON_BODY_BYTES) {
    return json({ error: 'payload_too_large' }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function callStore(studio, path, payload) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function withSecurity(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
