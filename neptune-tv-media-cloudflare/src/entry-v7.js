import base from './entry-v5.js';
import { StudioStore } from './store-v4.js';
import { buildFallbackSnapshot } from './control-fallback.js';
import { adminAuth } from './portal-http-utils.js';
import { json, securityHeaders } from './security.js';

export { StudioStore };

const CONTROL_ROOM_PATH = '/api/admin/control-room';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === CONTROL_ROOM_PATH) return resilientControlRoom(request, env, ctx);
    return base.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof base.scheduled === 'function') return base.scheduled(controller, env, ctx);
  },
};

async function resilientControlRoom(request, env, ctx) {
  let primary;
  try {
    primary = await base.fetch(request, env, ctx);
    if (primary.ok || primary.status < 500) return primary;
  } catch (error) {
    console.error('control_room_primary_exception', safeError(error));
  }
  const primaryStatus = primary?.status || 500;
  const primaryBody = primary ? await primary.clone().json().catch(() => ({})) : {};
  console.error('control_room_primary_failed', { status: primaryStatus, error: primaryBody.error || 'unknown' });
  try {
    const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
    const response = await callStore(studio, '/portal/autopilot-safe-list', adminAuth(request));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return secure(json({ error: data.error || 'control_room_unavailable', stage: data.stage || 'fallback_safe_list', primaryStatus }, response.status));
    return secure(json(buildFallbackSnapshot(data, env, primaryStatus, primaryBody.error || 'internal_error')));
  } catch (error) {
    console.error('control_room_fallback_failed', safeError(error));
    return secure(json({ error: 'control_room_unavailable', stage: 'fallback_exception', primaryStatus }, 503));
  }
}

async function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}
function safeError(error) { return { name: error?.name || 'Error', message: String(error?.message || error || 'unknown').slice(0, 500) }; }
function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
