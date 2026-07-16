export async function serveMedia(request, env) {
  if (!env.MEDIA) return new Response('Media storage unavailable', { status: 503 });
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.slice('/media/'.length));
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
  const head = await env.MEDIA.head(key);
  if (!head) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  head.writeHttpMetadata(headers);
  headers.set('ETag', head.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', key.startsWith('manifests/') ? 'public, max-age=60' : 'public, max-age=31536000, immutable');
  headers.set('Content-Type', headers.get('Content-Type') || contentType(key));
  if (request.method === 'HEAD') {
    headers.set('Content-Length', String(head.size));
    return new Response(null, { status: 200, headers });
  }
  const range = parseRange(request.headers.get('Range'), head.size);
  const object = range ? await env.MEDIA.get(key, { range }) : await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  if (range) {
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set('Content-Length', String(range.length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('Content-Length', String(head.size));
  return new Response(object.body, { status: 200, headers });
}

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(String(value || ''));
  if (!match) return null;
  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;
  if (start === null && end !== null) { start = Math.max(0, size - end); end = size - 1; }
  if (start === null) return null;
  if (end === null || end >= size) end = size - 1;
  if (start < 0 || start > end || start >= size) return null;
  return { offset: start, length: end - start + 1 };
}
function contentType(key) {
  if (key.endsWith('.mp4')) return 'video/mp4';
  if (key.endsWith('.webm')) return 'video/webm';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
