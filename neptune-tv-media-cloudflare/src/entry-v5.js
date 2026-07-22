import base from './entry-v4.js';
import { StudioStore } from './store-v4.js';
import { adminAuth } from './portal-http-utils.js';
import { sendStatusUpdate } from './portal-email.js';
import { isSameOrigin, json, securityHeaders } from './security.js';

export { StudioStore };

const CONTROL_PATHS = new Set([
  '/api/admin/control-room',
  '/api/admin/autopilot/reconcile',
  '/api/admin/autopilot/action',
  '/api/admin/autopilot/undo',
]);
const VIDEO_STUDIO_URL = 'https://neptune-video-clean.neptunebusinessclub.workers.dev/';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && ['/studio/', '/studio/index.html'].includes(url.pathname)) {
        const assetUrl = new URL('/studio/index.html', request.url);
        const response = await env.ASSETS.fetch(new Request(assetUrl, request));
        return secure(noStore(response));
      }
      if (CONTROL_PATHS.has(url.pathname)) return secure(await handleControlApi(request, env));
      return base.fetch(request, env, ctx);
    } catch (error) {
      console.error('entry_v5_failed', error);
      return secure(json({ error: 'internal_error' }, 500));
    }
  },

  async scheduled(controller, env, ctx) {
    if (typeof base.scheduled === 'function') await base.scheduled(controller, env, ctx);
    ctx.waitUntil(runAutopilotScheduled(env).catch((error) => console.error('autopilot_scheduled_failed', error)));
  },
};

async function handleControlApi(request, env) {
  const url = new URL(request.url);
  const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));

  if (url.pathname === '/api/admin/control-room' && request.method === 'GET') {
    const response = await callStore(studio, '/portal/autopilot-snapshot', adminAuth(request));
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json(result, response.status);
    const health = await buildHealth(env, result.runtimeHealth || {});
    return json({
      ...result,
      health,
      summary: {
        ...(result.summary || {}),
        systemIssues: health.filter((item) => item.level !== 'ok').length,
      },
    });
  }

  if (!isSameOrigin(request)) return json({ error: 'origin_forbidden' }, 403);
  const payload = await request.json().catch(() => ({}));

  if (url.pathname === '/api/admin/autopilot/reconcile' && request.method === 'POST') {
    const response = await callStore(studio, '/portal/autopilot-reconcile', adminAuth(request));
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json(result, response.status);
    const warnings = await notifyTransitions(env, request.url, result.transitions || []);
    return json(warnings.length ? { ...result, warnings } : result);
  }

  if (url.pathname === '/api/admin/autopilot/action' && request.method === 'POST') {
    const response = await callStore(studio, '/portal/autopilot-action', { ...adminAuth(request), payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json(result, response.status);
    const warning = await notifyTransition(env, request.url, result);
    return json(warning ? { ...result, warning } : result);
  }

  if (url.pathname === '/api/admin/autopilot/undo' && request.method === 'POST') {
    const response = await callStore(studio, '/portal/autopilot-undo', { ...adminAuth(request), payload });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json(result, response.status);
    const warning = await notifyTransition(env, request.url, result);
    return json(warning ? { ...result, warning } : result);
  }

  return json({ error: 'not_found' }, 404);
}

async function runAutopilotScheduled(env) {
  const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
  await callStore(studio, '/portal/autopilot-pulse', { key: 'scheduler', status: 'running', detail: 'Vérification en cours' });
  try {
    const response = await callStore(studio, '/portal/autopilot-reconcile', { system: true });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `http_${response.status}`);
    await notifyTransitions(env, env.PUBLIC_ORIGIN || 'https://tv.neptunebusiness.com', result.transitions || []);
    await callStore(studio, '/portal/autopilot-pulse', {
      key: 'scheduler',
      status: 'ok',
      detail: `${(result.transitions || []).length} transition(s) automatique(s)`,
    });
  } catch (error) {
    await callStore(studio, '/portal/autopilot-pulse', {
      key: 'scheduler',
      status: 'error',
      detail: String(error?.message || 'Erreur inconnue').slice(0, 300),
    }).catch(() => {});
    throw error;
  }
}

async function notifyTransitions(env, requestUrl, transitions) {
  const warnings = [];
  for (const transition of transitions) {
    const warning = await notifyTransition(env, requestUrl, transition);
    if (warning) warnings.push({ orderId: transition.orderId, error: warning });
  }
  return warnings;
}

async function notifyTransition(env, requestUrl, transition) {
  if (!transition?.email) return '';
  const sent = await sendStatusUpdate(env, requestUrl, transition.email, transition);
  return sent.ok ? '' : sent.error || 'email_send_failed';
}

async function buildHealth(env, runtimeHealth) {
  const scheduler = runtimeHealth.scheduler || {};
  const schedulerAt = new Date(scheduler.checkedAt || '');
  const schedulerAge = Number.isNaN(schedulerAt.getTime()) ? Infinity : Date.now() - schedulerAt.getTime();
  const storage = await probeStorage(env.MEDIA);
  const videoStudio = await probeRemote(VIDEO_STUDIO_URL);
  return [
    healthItem('database', 'Base clients', 'ok', 'Les données du Studio répondent normalement.'),
    healthItem('email', 'E-mails Resend', env.RESEND_API_KEY ? 'ok' : 'error', env.RESEND_API_KEY ? 'Configuration active.' : 'Clé RESEND_API_KEY absente.'),
    healthItem('storage', 'Stockage médias', storage ? 'ok' : 'error', storage ? 'Le bucket R2 est accessible.' : 'Le stockage R2 ne répond pas.'),
    healthItem(
      'scheduler',
      'Automatisations horaires',
      scheduler.status === 'error' || schedulerAge > 3 * 60 * 60 * 1000 ? 'error' : schedulerAge > 90 * 60 * 1000 ? 'warning' : 'ok',
      scheduler.checkedAt ? `Dernière exécution ${relativeTime(scheduler.checkedAt)}${scheduler.detail ? ` · ${scheduler.detail}` : ''}` : 'Aucune exécution enregistrée depuis ce déploiement.',
    ),
    healthItem('ai', 'Neptune IA', env.AI ? 'ok' : 'warning', env.AI ? 'Binding Workers AI actif.' : 'Workers AI n’est pas configuré.'),
    healthItem('video', 'Neptune Video Studio', videoStudio ? 'ok' : 'warning', videoStudio ? 'L’outil vidéo répond.' : 'L’outil vidéo n’a pas répondu au contrôle.'),
  ];
}

function healthItem(id, label, level, detail) { return { id, label, level, detail }; }

async function probeStorage(bucket) {
  if (!bucket) return false;
  try { await bucket.head('__neptune_health_probe__'); return true; } catch { return false; }
}

async function probeRemote(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: controller.signal });
    return response.status < 500;
  } catch { return false; } finally { clearTimeout(timer); }
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'à une date inconnue';
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 2) return 'il y a moins de 2 min';
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}

async function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
}

function noStore(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
