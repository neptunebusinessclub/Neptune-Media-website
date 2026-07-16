import legacy, { StudioStore } from './index.js';
import { handlePublicRoute, enhanceHtml } from './public-router.js';

export { StudioStore };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const publicResponse = await handlePublicRoute(request, env);
    if (publicResponse) return publicResponse;
    const response = await legacy.fetch(request, env, ctx);
    const type = response.headers.get('Content-Type') || '';
    if (request.method === 'GET' && type.includes('text/html')) {
      if (url.pathname === '/' || url.pathname === '/index.html') return enhanceHtml(response, request, env, 'public');
      if (url.pathname === '/studio' || url.pathname.startsWith('/studio/')) return enhanceHtml(response, request, env, 'studio');
    }
    return response;
  },
};
