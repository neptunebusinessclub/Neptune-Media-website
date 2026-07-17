import { json, timingSafeEqual } from './security.js';

const IMPORT_SECRET_HEADER = 'X-Neptune-Import-Secret';

export async function handleMultipartRoute(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/internal/multipart/')) return null;

  const secret = request.headers.get(IMPORT_SECRET_HEADER) || '';
  if (!env.BOOTSTRAP_TOKEN || !timingSafeEqual(secret, env.BOOTSTRAP_TOKEN)) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!env.MEDIA) return json({ error: 'media_storage_unavailable' }, 503);

  if (url.pathname === '/api/internal/multipart/status' && request.method === 'GET') {
    return json({ ready: true, maxRecommendedPartBytes: 47185920 });
  }

  if (url.pathname === '/api/internal/multipart/start' && request.method === 'POST') {
    const payload = await request.json().catch(() => ({}));
    const key = validKey(payload.key);
    if (!key) return json({ error: 'invalid_key' }, 400);
    const contentType = cleanContentType(payload.contentType);
    const upload = await env.MEDIA.createMultipartUpload(key, {
      httpMetadata: { contentType },
      customMetadata: { source: 'neptune-media-import' },
    });
    return json({ key: upload.key, uploadId: upload.uploadId });
  }

  if (url.pathname === '/api/internal/multipart/part' && request.method === 'POST') {
    const key = validKey(request.headers.get('X-Neptune-Key'));
    const uploadId = String(request.headers.get('X-Neptune-Upload-Id') || '').trim();
    const partNumber = Number(request.headers.get('X-Neptune-Part-Number'));
    if (!key || !uploadId || !Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
      return json({ error: 'invalid_part_request' }, 400);
    }
    if (!request.body) return json({ error: 'part_body_required' }, 400);
    const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
    const part = await upload.uploadPart(partNumber, request.body);
    return json({ partNumber: part.partNumber, etag: part.etag });
  }

  if (url.pathname === '/api/internal/multipart/complete' && request.method === 'POST') {
    const payload = await request.json().catch(() => ({}));
    const key = validKey(payload.key);
    const uploadId = String(payload.uploadId || '').trim();
    const parts = normalizeParts(payload.parts);
    if (!key || !uploadId || !parts.length) return json({ error: 'invalid_complete_request' }, 400);
    const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
    const object = await upload.complete(parts);
    return json({ ok: true, key: object.key, size: object.size, etag: object.httpEtag || object.etag });
  }

  if (url.pathname === '/api/internal/multipart/abort' && request.method === 'POST') {
    const payload = await request.json().catch(() => ({}));
    const key = validKey(payload.key);
    const uploadId = String(payload.uploadId || '').trim();
    if (!key || !uploadId) return json({ error: 'invalid_abort_request' }, 400);
    const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
    await upload.abort();
    return json({ ok: true });
  }

  return json({ error: 'not_found' }, 404);
}

function validKey(value) {
  const key = String(value || '').trim();
  if (!key || key.length > 512 || key.startsWith('/') || key.includes('..') || /[\r\n\0]/u.test(key)) return '';
  return key;
}

function cleanContentType(value) {
  const type = String(value || 'application/octet-stream').trim().toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/u.test(type) ? type : 'application/octet-stream';
}

function normalizeParts(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((part) => ({ partNumber: Number(part?.partNumber), etag: String(part?.etag || '') }))
    .filter((part) => Number.isInteger(part.partNumber) && part.partNumber > 0 && part.etag)
    .sort((a, b) => a.partNumber - b.partNumber);
}
