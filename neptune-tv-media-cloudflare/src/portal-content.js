import { json, sanitizeText } from './security.js';
import { requireClient } from './portal-auth.js';

const SHORT_TYPES = new Set(['short', 'shorts', 'reel', 'teaser']);
const PLATFORMS = new Set(['youtube', 'tiktok', 'instagram']);

export async function clientContentCalendar(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);

  const rows = store.sql.exec(
    `SELECT f.id AS fileId,f.name,f.file_type AS fileType,f.size_label AS sizeLabel,f.created_at AS createdAt,
            o.id AS orderId,o.title AS orderTitle,o.format,
            s.id AS scheduleId,s.publish_at AS publishAt,s.network,s.status AS scheduleStatus,s.caption,
            a.title AS aiTitle,a.description AS aiDescription,a.hashtags,a.trend_sources AS trendSources,
            a.trend_summary AS trendSummary,a.generation_status AS generationStatus,a.updated_at AS aiUpdatedAt
     FROM portal_files f
     JOIN portal_orders o ON o.id=f.order_id
     LEFT JOIN portal_content_schedule s ON s.file_id=f.id
     LEFT JOIN portal_content_ai a ON a.file_id=f.id
     WHERE o.client_id=? AND LOWER(f.file_type) IN ('short','shorts','reel','teaser')
     ORDER BY COALESCE(s.publish_at,f.created_at) ASC`,
    client.id,
  ).toArray().map((row) => ({
    ...row,
    hashtags: parseArray(row.hashtags),
    trendSources: parseArray(row.trendSources),
    networks: normalizeNetworks(row.network),
    downloadUrl: `/api/client/files/${encodeURIComponent(row.fileId)}`,
  }));

  const publications = rows.length ? store.sql.exec(
    `SELECT p.schedule_id AS scheduleId,p.platform,p.status,p.published_url AS publishedUrl,p.published_at AS publishedAt,
            p.updated_at AS updatedAt
     FROM portal_content_publications p
     JOIN portal_content_schedule s ON s.id=p.schedule_id
     JOIN portal_orders o ON o.id=s.order_id
     WHERE o.client_id=? ORDER BY p.updated_at DESC`,
    client.id,
  ).toArray() : [];

  return json({
    ok: true,
    client: { id: client.id, fullName: client.fullName, company: client.company },
    items: rows,
    publications,
    platformModes: { youtube: 'express', tiktok: 'express', instagram: 'express' },
  });
}

export async function clientContentUpdate(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const scheduleId = sanitizeText(payload.scheduleId, 100);
  const owned = store.sql.exec(
    `SELECT s.id,s.file_id AS fileId,s.order_id AS orderId
     FROM portal_content_schedule s JOIN portal_orders o ON o.id=s.order_id
     WHERE s.id=? AND o.client_id=? LIMIT 1`,
    scheduleId, client.id,
  ).toArray()[0];
  if (!owned) return json({ error: 'content_not_found' }, 404);

  const publishAt = normalizeIso(payload.publishAt);
  if (!publishAt) return json({ error: 'invalid_publish_date' }, 400);
  const title = sanitizeText(payload.title, 140);
  const description = sanitizeText(payload.description, 1800);
  const hashtags = normalizeHashtags(payload.hashtags);
  const networks = normalizeNetworks(payload.networks || payload.network);
  const caption = buildCaption(title, description, hashtags);
  const now = new Date().toISOString();

  store.sql.exec(
    `UPDATE portal_content_schedule SET publish_at=?,network=?,caption=?,updated_at=? WHERE id=?`,
    publishAt, networks.join(','), caption, now, scheduleId,
  );
  store.sql.exec(
    `INSERT INTO portal_content_ai
      (file_id,order_id,title,description,hashtags,trend_sources,trend_summary,ai_model,generation_status,prompt_version,created_at,updated_at)
     VALUES (?,?,?,?,?,'[]','Modification client','client-edit','edited','neptune-content-v1',?,?)
     ON CONFLICT(file_id) DO UPDATE SET title=excluded.title,description=excluded.description,hashtags=excluded.hashtags,
       generation_status='edited',updated_at=excluded.updated_at`,
    owned.fileId, owned.orderId, title, description, JSON.stringify(hashtags), now, now,
  );
  return json({ ok: true, scheduleId, publishAt, title, description, hashtags, networks, caption });
}

export async function clientContentPublishLog(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const scheduleId = sanitizeText(payload.scheduleId, 100);
  const platform = sanitizeText(payload.platform, 30).toLowerCase();
  if (!PLATFORMS.has(platform)) return json({ error: 'invalid_platform' }, 400);
  const owned = store.sql.exec(
    `SELECT s.id FROM portal_content_schedule s JOIN portal_orders o ON o.id=s.order_id
     WHERE s.id=? AND o.client_id=? LIMIT 1`,
    scheduleId, client.id,
  ).toArray()[0];
  if (!owned) return json({ error: 'content_not_found' }, 404);
  const now = new Date().toISOString();
  const status = payload.publishedUrl ? 'published' : 'prepared';
  const publishedUrl = sanitizeText(payload.publishedUrl, 1500);
  store.sql.exec(
    `INSERT INTO portal_content_publications
      (id,schedule_id,platform,status,published_url,published_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(schedule_id,platform) DO UPDATE SET status=excluded.status,published_url=excluded.published_url,
       published_at=excluded.published_at,updated_at=excluded.updated_at`,
    crypto.randomUUID(), scheduleId, platform, status, publishedUrl,
    status === 'published' ? now : null, now, now,
  );
  return json({ ok: true, scheduleId, platform, status, updatedAt: now });
}

export async function adminContentContext(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const fileId = sanitizeText(body.payload?.fileId || body.fileId, 100);
  const item = store.sql.exec(
    `SELECT f.id AS fileId,f.name,f.file_type AS fileType,f.order_id AS orderId,
            o.client_id AS clientId,o.title AS orderTitle,o.format,c.full_name AS clientName,c.company,
            s.id AS scheduleId,s.publish_at AS publishAt
     FROM portal_files f JOIN portal_orders o ON o.id=f.order_id JOIN portal_clients c ON c.id=o.client_id
     LEFT JOIN portal_content_schedule s ON s.file_id=f.id WHERE f.id=? LIMIT 1`,
    fileId,
  ).toArray()[0];
  return item ? json({ ok: true, item }) : json({ error: 'content_not_found' }, 404);
}

export async function adminContentSave(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const fileId = sanitizeText(payload.fileId, 100);
  const item = store.sql.exec(
    `SELECT f.id,f.order_id AS orderId,o.client_id AS clientId,s.id AS scheduleId,s.publish_at AS publishAt
     FROM portal_files f JOIN portal_orders o ON o.id=f.order_id
     LEFT JOIN portal_content_schedule s ON s.file_id=f.id WHERE f.id=? LIMIT 1`,
    fileId,
  ).toArray()[0];
  if (!item) return json({ error: 'content_not_found' }, 404);
  const title = sanitizeText(payload.title, 140);
  const description = sanitizeText(payload.description, 1800);
  const hashtags = normalizeHashtags(payload.hashtags);
  const trendSources = Array.isArray(payload.trendSources) ? payload.trendSources.slice(0, 12).map((source) => sanitizeText(source, 80)).filter(Boolean) : [];
  const trendSummary = sanitizeText(payload.trendSummary, 1200);
  const aiModel = sanitizeText(payload.aiModel, 120);
  const generationStatus = sanitizeText(payload.generationStatus, 40) || 'generated';
  const now = new Date().toISOString();
  store.sql.exec(
    `INSERT INTO portal_content_ai
      (file_id,order_id,title,description,hashtags,trend_sources,trend_summary,ai_model,generation_status,prompt_version,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'neptune-content-v1',?,?)
     ON CONFLICT(file_id) DO UPDATE SET title=excluded.title,description=excluded.description,hashtags=excluded.hashtags,
       trend_sources=excluded.trend_sources,trend_summary=excluded.trend_summary,ai_model=excluded.ai_model,
       generation_status=excluded.generation_status,updated_at=excluded.updated_at`,
    fileId, item.orderId, title, description, JSON.stringify(hashtags), JSON.stringify(trendSources), trendSummary,
    aiModel, generationStatus, now, now,
  );
  let publishAt = item.publishAt;
  if (item.scheduleId) {
    publishAt = nextEmptySlot(store, item.clientId, item.scheduleId, item.publishAt);
    store.sql.exec(
      `UPDATE portal_content_schedule SET publish_at=?,caption=?,network=?,updated_at=? WHERE id=?`,
      publishAt, buildCaption(title, description, hashtags), 'youtube,tiktok,instagram', now, item.scheduleId,
    );
  }
  store.audit(actor.actor.id, 'portal_content_ai_save', 'portal_file', fileId, { generationStatus, trendSources, publishAt });
  return json({ ok: true, fileId, scheduleId: item.scheduleId, publishAt, title, description, hashtags, trendSources, trendSummary });
}

function nextEmptySlot(store, clientId, currentScheduleId, suggestedAt) {
  const occupied = new Set(store.sql.exec(
    `SELECT s.publish_at AS publishAt FROM portal_content_schedule s
     JOIN portal_orders o ON o.id=s.order_id WHERE o.client_id=? AND s.id<>?`,
    clientId, currentScheduleId,
  ).toArray().map((row) => dayKey(row.publishAt)).filter(Boolean));
  const start = new Date(suggestedAt || Date.now() + 86_400_000);
  const tomorrow = new Date(Date.now() + 86_400_000);
  if (Number.isNaN(start.getTime()) || start < tomorrow) start.setTime(tomorrow.getTime());
  start.setUTCHours(17, 30, 0, 0);
  const preferredDays = new Set([1, 3, 5]);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let offset = 0; offset < 90; offset += 1) {
      const candidate = new Date(start.getTime() + offset * 86_400_000);
      if (candidate.getUTCDay() === 0) continue;
      if (pass === 0 && !preferredDays.has(candidate.getUTCDay())) continue;
      if (!occupied.has(dayKey(candidate))) return candidate.toISOString();
    }
  }
  return start.toISOString();
}

function dayKey(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function normalizeNetworks(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  const cleaned = values.map((item) => String(item || '').trim().toLowerCase()).filter((item) => PLATFORMS.has(item));
  return [...new Set(cleaned.length ? cleaned : ['youtube', 'tiktok', 'instagram'])];
}

function normalizeHashtags(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/u);
  const cleaned = values.map((tag) => String(tag || '').trim().replace(/^#+/u, '').normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 48)).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 8);
}

function normalizeIso(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildCaption(title, description, hashtags) {
  return [title, description, hashtags.map((tag) => `#${tag}`).join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(String(value || '[]')); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function requireAdmin(store, body) {
  const actor = await store.requireSession(body.token);
  if (!actor || actor.role !== 'admin') return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  if (!body.csrfToken || body.csrfToken !== actor.csrfToken) return { ok: false, response: json({ error: 'csrf_failed' }, 403) };
  return { ok: true, actor };
}

export function isShortType(value) { return SHORT_TYPES.has(String(value || '').toLowerCase()); }
