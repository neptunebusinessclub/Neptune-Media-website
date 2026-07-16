import application, { StudioStore } from './entry-v3.js';
import { handleMultipartRoute } from './multipart-v3.js';
import { securityHeaders } from './security.js';

export { StudioStore };

export default {
  async fetch(request, env, ctx) {
    const response = await handleMultipartRoute(request, env);
    if (response) return secure(response);
    return application.fetch(request, env, ctx);
  },
};

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
