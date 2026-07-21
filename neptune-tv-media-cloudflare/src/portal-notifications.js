import { json, randomToken, sanitizeText, sha256 } from './security.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ACTIVE_STATUSES = new Set([
  'payment_confirmed',
  'reservation_confirmed',
  'preparation_booking_pending',
  'appointment_confirmed',
  'appointment_booked',
  'preparation',
  'studio_date_confirmation_pending',
  'preparation_complete',
  'filming_scheduled',
  'filming_confirmed',
]);

export function notificationCandidates(store) {
  const now = Date.now();
  const rows = store.sql.exec(
    `SELECT o.id AS orderId,o.title,o.format,o.status,o.filming_at AS filmingAt,
            c.email,c.full_name AS fullName
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id
     WHERE o.filming_at IS NOT NULL AND c.active=1`,
  ).toArray();

  const items = [];
  for (const row of rows) {
    if (!ACTIVE_STATUSES.has(row.status)) continue;
    const filming = new Date(row.filmingAt || '');
    if (Number.isNaN(filming.getTime())) continue;
    const remaining = filming.getTime() - now;
    if (remaining <= 0 || remaining > 15 * DAY) continue;

    const notificationKey = remaining <= 48 * HOUR
      ? 'studio_reminder_48h'
      : remaining <= 7 * DAY
        ? 'studio_reminder_7d'
        : 'studio_reminder_15d';

    const sent = store.sql.exec(
      'SELECT id FROM portal_notifications WHERE order_id=? AND notification_key=? LIMIT 1',
      row.orderId,
      notificationKey,
    ).toArray()[0];
    if (sent) continue;

    items.push({ ...row, notificationKey, remainingHours: Math.ceil(remaining / HOUR) });
  }

  return json({ ok: true, items });
}

export function markNotificationSent(store, body) {
  const orderId = sanitizeText(body.orderId, 100);
  const notificationKey = sanitizeText(body.notificationKey, 100);
  if (!orderId || !notificationKey) return json({ error: 'invalid_notification' }, 400);
  store.sql.exec(
    `INSERT OR IGNORE INTO portal_notifications
     (id,order_id,notification_key,email_id,sent_at) VALUES (?,?,?,?,?)`,
    crypto.randomUUID(),
    orderId,
    notificationKey,
    sanitizeText(body.emailId, 180),
    new Date().toISOString(),
  );
  return json({ ok: true });
}

export async function prepareFeedbackRequest(store, body) {
  const orderId = sanitizeText(body.orderId, 100);
  if (!orderId) return json({ error: 'invalid_order' }, 400);

  const order = store.sql.exec(
    `SELECT o.id AS orderId,o.title,o.format,c.email,c.full_name AS fullName
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id
     WHERE o.id=? AND c.active=1`,
    orderId,
  ).toArray()[0];
  if (!order) return json({ error: 'order_not_found' }, 404);

  const alreadySent = store.sql.exec(
    `SELECT id FROM portal_notifications
     WHERE order_id=? AND notification_key='feedback_request' LIMIT 1`,
    orderId,
  ).toArray()[0];
  if (alreadySent) return json({ ok: true, send: false, ...order });

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * DAY).toISOString();
  store.sql.exec(
    `INSERT INTO portal_feedback_requests
     (id,order_id,token_hash,expires_at,created_at,submitted_at)
     VALUES (?,?,?,?,?,NULL)
     ON CONFLICT(order_id) DO UPDATE SET
       token_hash=excluded.token_hash,
       expires_at=excluded.expires_at,
       created_at=excluded.created_at,
       submitted_at=NULL`,
    crypto.randomUUID(),
    orderId,
    tokenHash,
    expiresAt,
    now.toISOString(),
  );
  return json({ ok: true, send: true, token, expiresAt, ...order });
}

export async function getFeedbackRequest(store, body) {
  const token = String(body.token || '');
  if (!token) return json({ error: 'invalid_feedback_token' }, 400);
  const tokenHash = await sha256(token);
  const row = store.sql.exec(
    `SELECT r.order_id AS orderId,r.expires_at AS expiresAt,r.submitted_at AS submittedAt,
            o.title,o.format
     FROM portal_feedback_requests r JOIN portal_orders o ON o.id=r.order_id
     WHERE r.token_hash=? LIMIT 1`,
    tokenHash,
  ).toArray()[0];
  if (!row || row.expiresAt <= new Date().toISOString()) return json({ error: 'invalid_or_expired_feedback_token' }, 404);
  return json({ ok: true, orderId: row.orderId, title: row.title, format: row.format, submitted: Boolean(row.submittedAt) });
}

export async function submitFeedback(store, body) {
  const token = String(body.token || '');
  const satisfaction = Number(body.satisfaction);
  if (!token || !Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5) {
    return json({ error: 'invalid_feedback' }, 400);
  }

  const tokenHash = await sha256(token);
  const request = store.sql.exec(
    `SELECT id,order_id AS orderId,expires_at AS expiresAt,submitted_at AS submittedAt
     FROM portal_feedback_requests WHERE token_hash=? LIMIT 1`,
    tokenHash,
  ).toArray()[0];
  if (!request || request.expiresAt <= new Date().toISOString()) return json({ error: 'invalid_or_expired_feedback_token' }, 404);
  if (request.submittedAt) return json({ ok: true, alreadySubmitted: true });

  const experience = sanitizeText(body.experience, 3000);
  const recommendTo = sanitizeText(body.recommendTo, 600);
  const now = new Date().toISOString();
  store.sql.exec(
    `INSERT INTO portal_feedback
     (id,order_id,satisfaction,experience,recommend_to,created_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(order_id) DO UPDATE SET
       satisfaction=excluded.satisfaction,
       experience=excluded.experience,
       recommend_to=excluded.recommend_to,
       created_at=excluded.created_at`,
    crypto.randomUUID(),
    request.orderId,
    satisfaction,
    experience,
    recommendTo,
    now,
  );
  store.sql.exec('UPDATE portal_feedback_requests SET submitted_at=? WHERE id=?', now, request.id);
  return json({ ok: true });
}
