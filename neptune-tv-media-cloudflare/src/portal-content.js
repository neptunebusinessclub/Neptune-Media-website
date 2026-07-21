import { json, sanitizeText } from './security.js';
import { requireClient } from './portal-auth.js';

const SHORT_TYPES = new Set(['short', 'shorts', 'reel', 'teaser']);
const PLATFORMS = new Set(['youtube', 'tiktok', 'instagram']);
const MIN_REUSE_DAYS = 30;
const MIN_REUSE_MS = MIN_REUSE_DAYS * 86_400_000;

export async function clientContentCalendar(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);

  const assets = store.sql.exec(
    `SELECT f.id AS fileId,f.name,f.file_type AS fileType,f.size_label AS sizeLabel,f.created_at AS createdAt,
            o.id AS orderId,o.title AS orderTitle,o.format,o.filming_at AS filmingAt,
            a.title AS aiTitle,a.description AS aiDescription,a.hashtags,a.trend_sources AS trendSources,
            a.trend_summary AS trendSummary,a.generation_status AS generationStatus,a.updated_at AS aiUpdatedAt
     FROM portal_files f
     JOIN portal_orders o ON o.id=f.order_id
     LEFT JOIN portal_content_ai a ON a.file_id=f.id
     WHERE o.client_id=? AND LOWER(f.file_type) IN ('short','shorts','reel','teaser')
     ORDER BY COALESCE(o.filming_at,o.created_at) DESC,f.created_at ASC`,
    client.id,
  ).toArray().map((row) => ({
    ...row,
    hashtags: parseArray(row.hashtags),
    trendSources: parseArray(row.trendSources),
    downloadUrl: `/api/client/files/${encodeURIComponent(row.fileId)}`,
  }));

  const occurrences = store.sql.exec(
    `SELECT x.id AS occurrenceId,x.order_id AS orderId,x.file_id AS fileId,x.source_schedule_id AS sourceScheduleId,
            x.publish_at AS publishAt,x.network,x.status,x.title,x.description,x.hashtags,x.caption,
            x.use_index AS useIndex,x.created_at AS createdAt,x.updated_at AS updatedAt
     FROM portal_content_occurrences x
     JOIN portal_orders o ON o.id=x.order_id
     WHERE o.client_id=? ORDER BY x.publish_at ASC`,
    client.id,
  ).toArray().map((row) => ({ ...row, hashtags: parseArray(row.hashtags), networks: normalizeNetworks(row.network) }));

  const publications = store.sql.exec(
    `SELECT p.occurrence_id AS occurrenceId,p.platform,p.status,p.published_url AS publishedUrl,
            p.published_at AS publishedAt,p.updated_at AS updatedAt
     FROM portal_content_occurrence_publications p
     JOIN portal_content_occurrences x ON x.id=p.occurrence_id
     JOIN portal_orders o ON o.id=x.order_id
     WHERE o.client_id=? ORDER BY p.updated_at DESC`,
    client.id,
  ).toArray();

  const enrichedAssets = assets.map((asset) => {
    const uses = occurrences.filter((item) => item.fileId === asset.fileId);
    const last = uses.at(-1) || null;
    const nextReuseAt = last ? new Date(new Date(last.publishAt).getTime() + MIN_REUSE_MS).toISOString() : new Date().toISOString();
    return {
      ...asset,
      usageCount: uses.length,
      lastPublishAt: last?.publishAt || null,
      nextReuseAt,
      renewalLevel: renewalLevel(uses.length),
    };
  });

  return json({
    ok: true,
    client: { id: client.id, fullName: client.fullName, company: client.company },
    assets: enrichedAssets,
    occurrences,
    publications,
    minimumReuseDays: MIN_REUSE_DAYS,
    renewalGuidance: { reviewFrom: 3, renewFrom: 5 },
    platformModes: { youtube: 'express', tiktok: 'express', instagram: 'express' },
  });
}

export async function clientContentUpdate(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const occurrenceId = sanitizeText(payload.occurrenceId, 100);
  const scheduleId = sanitizeText(payload.scheduleId, 100);
  const owned = store.sql.exec(
    `SELECT x.id AS occurrenceId,x.file_id AS fileId,x.order_id AS orderId,x.source_schedule_id AS sourceScheduleId
     FROM portal_content_occurrences x JOIN portal_orders o ON o.id=x.order_id
     WHERE (x.id=? OR x.source_schedule_id=?) AND o.client_id=? LIMIT 1`,
    occurrenceId, scheduleId, client.id,
  ).toArray()[0];
  if (!owned) return json({ error: 'content_not_found' }, 404);

  const publishAt = normalizeIso(payload.publishAt);
  if (!publishAt) return json({ error: 'invalid_publish_date' }, 400);
  const spacing = validateReuseSpacing(store, owned.fileId, publishAt, owned.occurrenceId);
  if (!spacing.ok) return json({ error: 'reuse_too_soon', nextAllowedAt: spacing.nextAllowedAt, minimumDays: MIN_REUSE_DAYS }, 409);

  const title = sanitizeText(payload.title, 140);
  const description = sanitizeText(payload.description, 1800);
  const hashtags = normalizeHashtags(payload.hashtags);
  const networks = normalizeNetworks(payload.networks || payload.network);
  const caption = buildCaption(title, description, hashtags);
  const now = new Date().toISOString();

  store.sql.exec(
    `UPDATE portal_content_occurrences SET publish_at=?,network=?,title=?,description=?,hashtags=?,caption=?,status='ready',updated_at=? WHERE id=?`,
    publishAt, networks.join(','), title, description, JSON.stringify(hashtags), caption, now, owned.occurrenceId,
  );
  if (owned.sourceScheduleId) {
    store.sql.exec(
      `UPDATE portal_content_schedule SET publish_at=?,network=?,caption=?,updated_at=? WHERE id=?`,
      publishAt, networks.join(','), caption, now, owned.sourceScheduleId,
    );
  }
  return json({ ok: true, occurrenceId: owned.occurrenceId, publishAt, title, description, hashtags, networks, caption });
}

export async function clientContentReuseContext(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const fileId = sanitizeText(body.payload?.fileId || body.fileId, 100);
  const item = store.sql.exec(
    `SELECT f.id AS fileId,f.name,f.file_type AS fileType,f.order_id AS orderId,o.title AS orderTitle,o.format,
            c.full_name AS clientName,c.company,a.title AS aiTitle,a.description AS aiDescription,a.hashtags,
            a.trend_sources AS trendSources,a.trend_summary AS trendSummary
     FROM portal_files f JOIN portal_orders o ON o.id=f.order_id JOIN portal_clients c ON c.id=o.client_id
     LEFT JOIN portal_content_ai a ON a.file_id=f.id
     WHERE f.id=? AND o.client_id=? AND LOWER(f.file_type) IN ('short','shorts','reel','teaser') LIMIT 1`,
    fileId, client.id,
  ).toArray()[0];
  if (!item) return json({ error: 'content_not_found' }, 404);
  const previous = store.sql.exec(
    `SELECT id AS occurrenceId,publish_at AS publishAt,title,description,use_index AS useIndex
     FROM portal_content_occurrences WHERE file_id=? ORDER BY publish_at ASC`,
    fileId,
  ).toArray();
  return json({
    ok: true,
    item: {
      ...item,
      hashtags: parseArray(item.hashtags),
      trendSources: parseArray(item.trendSources),
      previousTitles: previous.map((entry) => entry.title).filter(Boolean).slice(-5),
      reuseIndex: previous.length + 1,
      previousUses: previous.length,
      nextAllowedAt: nextReusableSlot(store, client.id, fileId, null),
    },
  });
}

export async function clientContentReuseCreate(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const fileId = sanitizeText(payload.fileId, 100);
  const owned = store.sql.exec(
    `SELECT f.id AS fileId,f.order_id AS orderId FROM portal_files f JOIN portal_orders o ON o.id=f.order_id
     WHERE f.id=? AND o.client_id=? AND LOWER(f.file_type) IN ('short','shorts','reel','teaser') LIMIT 1`,
    fileId, client.id,
  ).toArray()[0];
  if (!owned) return json({ error: 'content_not_found' }, 404);

  const requested = normalizeIso(payload.publishAt);
  const publishAt = requested || nextReusableSlot(store, client.id, fileId, null);
  const spacing = validateReuseSpacing(store, fileId, publishAt, null);
  if (!spacing.ok) return json({ error: 'reuse_too_soon', nextAllowedAt: spacing.nextAllowedAt, minimumDays: MIN_REUSE_DAYS }, 409);

  const title = sanitizeText(payload.title, 140);
  const description = sanitizeText(payload.description, 1800);
  const hashtags = normalizeHashtags(payload.hashtags);
  const networks = normalizeNetworks(payload.networks || payload.network);
  const caption = buildCaption(title, description, hashtags);
  const count = Number(store.sql.exec('SELECT COUNT(*) AS count FROM portal_content_occurrences WHERE file_id=?', fileId).one().count || 0);
  const useIndex = count + 1;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  store.sql.exec(
    `INSERT INTO portal_content_occurrences
      (id,order_id,file_id,source_schedule_id,publish_at,network,status,title,description,hashtags,caption,use_index,created_at,updated_at)
     VALUES (?,?,?,NULL,?,?,'ready',?,?,?,?,?,?,?)`,
    id, owned.orderId, fileId, publishAt, networks.join(','), title, description, JSON.stringify(hashtags), caption, useIndex, now, now,
  );
  return json({
    ok: true,
    occurrence: { occurrenceId: id, orderId: owned.orderId, fileId, publishAt, networks, status: 'ready', title, description, hashtags, caption, useIndex, createdAt: now, updatedAt: now },
    renewalLevel: renewalLevel(useIndex),
  });
}

export async function clientContentPublishLog(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const occurrenceId = sanitizeText(payload.occurrenceId, 100);
  const scheduleId = sanitizeText(payload.scheduleId, 100);
  const platform = sanitizeText(payload.platform, 30).toLowerCase();
  if (!PLATFORMS.has(platform)) return json({ error: 'invalid_platform' }, 400);
  const owned = store.sql.exec(
    `SELECT x.id AS occurrenceId FROM portal_content_occurrences x JOIN portal_orders o ON o.id=x.order_id
     WHERE (x.id=? OR x.source_schedule_id=?) AND o.client_id=? LIMIT 1`,
    occurrenceId, scheduleId, client.id,
  ).toArray()[0];
  if (!owned) return json({ error: 'content_not_found' }, 404);
  const now = new Date().toISOString();
  const status = payload.publishedUrl ? 'published' : 'prepared';
  const publishedUrl = sanitizeText(payload.publishedUrl, 1500);
  store.sql.exec(
    `INSERT INTO portal_content_occurrence_publications
      (id,occurrence_id,platform,status,published_url,published_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON CONFLICT(occurrence_id,platform) DO UPDATE SET status=excluded.status,published_url=excluded.published_url,
       published_at=excluded.published_at,updated_at=excluded.updated_at`,
    crypto.randomUUID(), owned.occurrenceId, platform, status, publishedUrl,
    status === 'published' ? now : null, now, now,
  );
  return json({ ok: true, occurrenceId: owned.occurrenceId, platform, status, updatedAt: now });
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
    const caption = buildCaption(title, description, hashtags);
    store.sql.exec(
      `UPDATE portal_content_schedule SET publish_at=?,caption=?,network=?,updated_at=? WHERE id=?`,
      publishAt, caption, 'youtube,tiktok,instagram', now, item.scheduleId,
    );
    store.sql.exec(
      `INSERT INTO portal_content_occurrences
        (id,order_id,file_id,source_schedule_id,publish_at,network,status,title,description,hashtags,caption,use_index,created_at,updated_at)
       VALUES (?,?,?,?,?,'youtube,tiktok,instagram','ready',?,?,?,?,1,?,?)
       ON CONFLICT(source_schedule_id) DO UPDATE SET publish_at=excluded.publish_at,title=excluded.title,
         description=excluded.description,hashtags=excluded.hashtags,caption=excluded.caption,updated_at=excluded.updated_at`,
      `occ-${item.scheduleId}`, item.orderId, fileId, item.scheduleId, publishAt, title, description, JSON.stringify(hashtags), caption, now, now,
    );
  }
  store.audit(actor.actor.id, 'portal_content_ai_save', 'portal_file', fileId, { generationStatus, trendSources, publishAt });
  return json({ ok: true, fileId, scheduleId: item.scheduleId, publishAt, title, description, hashtags, trendSources, trendSummary });
}

function nextEmptySlot(store, clientId, currentScheduleId, suggestedAt) {
  const occupied = new Set(store.sql.exec(
    `SELECT x.publish_at AS publishAt FROM portal_content_occurrences x
     JOIN portal_orders o ON o.id=x.order_id WHERE o.client_id=? AND COALESCE(x.source_schedule_id,'')<>?`,
    clientId, currentScheduleId || '',
  ).toArray().map((row) => dayKey(row.publishAt)).filter(Boolean));
  const start = new Date(suggestedAt || Date.now() + 86_400_000);
  const tomorrow = new Date(Date.now() + 86_400_000);
  if (Number.isNaN(start.getTime()) || start < tomorrow) start.setTime(tomorrow.getTime());
  start.setUTCHours(17, 30, 0, 0);
  return findFreeDay(start, occupied).toISOString();
}

function nextReusableSlot(store, clientId, fileId, suggestedAt) {
  const occurrences = store.sql.exec('SELECT publish_at AS publishAt FROM portal_content_occurrences WHERE file_id=? ORDER BY publish_at ASC', fileId).toArray();
  const last = occurrences.at(-1)?.publishAt ? new Date(occurrences.at(-1).publishAt) : null;
  const minimum = last && !Number.isNaN(last.getTime()) ? new Date(last.getTime() + MIN_REUSE_MS) : new Date(Date.now() + 86_400_000);
  const requested = new Date(suggestedAt || minimum);
  const start = Number.isNaN(requested.getTime()) || requested < minimum ? minimum : requested;
  start.setUTCHours(17, 30, 0, 0);
  const occupied = new Set(store.sql.exec(
    `SELECT x.publish_at AS publishAt FROM portal_content_occurrences x JOIN portal_orders o ON o.id=x.order_id WHERE o.client_id=?`,
    clientId,
  ).toArray().map((row) => dayKey(row.publishAt)).filter(Boolean));
  return findFreeDay(start, occupied).toISOString();
}

function findFreeDay(start, occupied) {
  const preferredDays = new Set([1, 3, 5]);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let offset = 0; offset < 180; offset += 1) {
      const candidate = new Date(start.getTime() + offset * 86_400_000);
      if (candidate.getUTCDay() === 0) continue;
      if (pass === 0 && !preferredDays.has(candidate.getUTCDay())) continue;
      if (!occupied.has(dayKey(candidate))) return candidate;
    }
  }
  return start;
}

function validateReuseSpacing(store, fileId, publishAt, excludedOccurrenceId) {
  const target = new Date(publishAt);
  const rows = store.sql.exec(
    `SELECT id,publish_at AS publishAt FROM portal_content_occurrences WHERE file_id=? AND id<>? ORDER BY publish_at ASC`,
    fileId, excludedOccurrenceId || '',
  ).toArray();
  let nextAllowedAt = null;
  for (const row of rows) {
    const existing = new Date(row.publishAt);
    if (Number.isNaN(existing.getTime())) continue;
    const distance = Math.abs(target.getTime() - existing.getTime());
    if (distance < MIN_REUSE_MS) {
      const candidate = new Date(existing.getTime() + MIN_REUSE_MS).toISOString();
      if (!nextAllowedAt || candidate > nextAllowedAt) nextAllowedAt = candidate;
    }
  }
  return nextAllowedAt ? { ok: false, nextAllowedAt } : { ok: true };
}

function renewalLevel(useCount) {
  if (useCount >= 5) return 'renew_now';
  if (useCount >= 3) return 'refresh_soon';
  return 'reusable';
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
