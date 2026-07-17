import legacy from './index.js';
import { StudioStore } from './store-v3.js';
import { handlePublicRoute, enhanceHtml } from './public-router.js';
import { serveMedia } from './media-v3.js';
import { isSameOrigin, json, securityHeaders, timingSafeEqual } from './security.js';

export { StudioStore };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/media/')) return secure(await serveMedia(request, env));
      const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
      if (url.pathname === '/api/auth/setup-status' && request.method === 'GET') return secure(await studio.fetch('https://store/auth/setup-status'));
      if (url.pathname === '/api/auth/recover' && request.method === 'POST') {
        if (!isSameOrigin(request)) return secure(json({ error: 'origin_forbidden' }, 403));
        return secure(await proxyBody(request, studio, '/auth/recover'));
      }
      if (url.pathname === '/api/internal/media-import' && request.method === 'POST') {
        const secret = request.headers.get('X-Neptune-Import-Secret') || '';
        if (!env.BOOTSTRAP_TOKEN || !timingSafeEqual(secret, env.BOOTSTRAP_TOKEN)) return secure(json({ error: 'unauthorized' }, 401));
        return secure(await proxyBody(request, studio, '/internal/import-media'));
      }
      const publicResponse = await handlePublicRoute(request, env);
      if (publicResponse) return secure(publicResponse);
      const response = await legacy.fetch(request, env, ctx);
      const type = response.headers.get('Content-Type') || '';
      if (request.method === 'GET' && type.includes('text/html')) {
        if (url.pathname === '/' || url.pathname === '/index.html') return secure(await enhanceHtml(response, request, env, 'public'));
        if (url.pathname === '/studio' || url.pathname.startsWith('/studio/')) return secure(await enhanceHtml(response, request, env, 'studio'));
      }
      return response;
    } catch (error) {
      console.error('entry_v3_failed', error);
      return secure(json({ error: 'internal_error' }, 500));
    }
  },
};

async function proxyBody(request, studio, path) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
  });
}
function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
