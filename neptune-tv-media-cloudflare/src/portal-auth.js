import { json, randomToken, sha256 } from './security.js';
import { CODE_TTL, SESSION_TTL, normalizeEmail } from './portal-utils.js';
import { referralSummary } from './portal-referrals.js';

const INTERNAL_PORTAL_DOMAIN = 'neptunebusiness.com';
const TRUSTED_TEST_EMAIL = 'contact@neptunebusiness.com';

export async function requestCode(store, body) {
  const email = normalizeEmail(body.email);
  if (!email) return json({ ok: true, deliver: false, reason: 'invalid_email' });

  const client = ensureInternalClient(store, email);
  if (!client || Number(client.active) !== 1) return json({ ok: true, deliver: false, reason: 'client_not_found' });

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000).toISOString();
  const recent = store.sql.exec(
    'SELECT created_at AS createdAt FROM portal_codes WHERE email=? AND created_at>? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC',
    email,
    hourAgo,
    now.toISOString(),
  ).toArray();

  if (recent.length >= 5) return json({ ok: true, deliver: false, throttled: true });
  const last = recent[0]?.createdAt ? new Date(recent[0].createdAt).getTime() : 0;
  if (last && now.getTime() - last < 60000) {
    return json({ ok: true, deliver: false, retryAfter: Math.ceil((60000 - (now.getTime() - last)) / 1000) });
  }

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  store.sql.exec('UPDATE portal_codes SET used_at=? WHERE email=? AND used_at IS NULL', now.toISOString(), email);
  store.sql.exec(
    'INSERT INTO portal_codes (id,email,code_hash,expires_at,created_at,used_at) VALUES (?,?,?,?,?,NULL)',
    crypto.randomUUID(),
    email,
    await sha256(`${email}:${code}`),
    new Date(now.getTime() + CODE_TTL * 1000).toISOString(),
    now.toISOString(),
  );
  cleanup(store);
  return json({ ok: true, deliver: true, code, expiresIn: CODE_TTL });
}

export async function trustedTestLogin(store, body) {
  const email = normalizeEmail(body.email);
  if (email !== TRUSTED_TEST_EMAIL) return json({ error: 'trusted_access_forbidden' }, 403);

  const client = ensureInternalClient(store, email);
  if (!client || Number(client.active) !== 1) return json({ error: 'client_not_found' }, 404);

  const session = await createSession(store, client);
  store.sql.exec('DELETE FROM portal_codes WHERE email=?', email);
  store.sql.exec('DELETE FROM portal_auth_attempts WHERE email=?', email);
  cleanup(store);
  return json({ ok: true, trustedAccess: true, ...session });
}

export async function verifyCode(store, body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').replace(/\D/gu, '').slice(0, 6);
  const now = new Date();
  if (!email || code.length !== 6) return json({ error: 'invalid_code' }, 400);

  const attempts = store.sql.exec(
    'SELECT count,locked_until AS lockedUntil,window_started_at AS windowStartedAt FROM portal_auth_attempts WHERE email=?',
    email,
  ).toArray()[0];
  if (attempts?.lockedUntil && new Date(attempts.lockedUntil) > now) return json({ error: 'too_many_attempts' }, 429);

  const hash = await sha256(`${email}:${code}`);
  const row = store.sql.exec(
    'SELECT id FROM portal_codes WHERE email=? AND code_hash=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1',
    email,
    hash,
    now.toISOString(),
  ).toArray()[0];
  const client = store.sql.exec(
    'SELECT id,email,full_name AS fullName,company,active FROM portal_clients WHERE email=? AND active=1',
    email,
  ).toArray()[0];

  if (!row || !client) {
    recordFailure(store, email, now, attempts);
    return json({ error: 'invalid_or_expired_code' }, 401);
  }

  store.sql.exec('UPDATE portal_codes SET used_at=? WHERE id=?', now.toISOString(), row.id);
  store.sql.exec('DELETE FROM portal_auth_attempts WHERE email=?', email);
  const session = await createSession(store, client, now);
  cleanup(store);
  return json({ ok: true, ...session });
}

export async function portalSession(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ authenticated: false }, 401);
  const now = new Date().toISOString();
  store.sql.exec('UPDATE portal_sessions SET last_seen_at=? WHERE id=?', now, client.sessionId);
  const orders = store.sql.exec(`SELECT id,order_reference AS orderReference,product_code AS productCode,title,format,payment_status AS paymentStatus,amount_total AS amountTotal,currency,status,appointment_at AS appointmentAt,filming_at AS filmingAt,next_action AS nextAction,preparation_url AS preparationUrl,booking_url AS bookingUrl,created_at AS createdAt,updated_at AS updatedAt FROM portal_orders WHERE client_id=? ORDER BY created_at DESC`, client.id).toArray();
  for (const order of orders) {
    order.steps = store.sql.exec('SELECT step_key AS stepKey,label,state,display_order AS displayOrder,completed_at AS completedAt,note FROM portal_steps WHERE order_id=? ORDER BY display_order', order.id).toArray();
    order.files = store.sql.exec(`SELECT id,name,file_type AS fileType,size_label AS sizeLabel,created_at AS createdAt FROM portal_files WHERE order_id=? ORDER BY created_at DESC`, order.id).toArray().map((file) => ({ ...file, downloadUrl: `/api/client/files/${encodeURIComponent(file.id)}` }));
    order.schedules = store.sql.exec(`SELECT id,file_id AS fileId,publish_at AS publishAt,network,status,caption,created_at AS createdAt,updated_at AS updatedAt FROM portal_content_schedule WHERE order_id=? ORDER BY publish_at ASC`, order.id).toArray();
  }
  const deletionRequest = store.sql.exec(`SELECT id,status,requested_at AS requestedAt,processed_at AS processedAt,note FROM portal_deletion_requests WHERE client_id=? ORDER BY requested_at DESC LIMIT 1`, client.id).toArray()[0] || null;
  const referral = referralSummary(store, client);
  delete client.sessionId;
  delete client.expiresAt;
  return json({ authenticated: true, client, orders, deletionRequest, referral });
}

export async function logout(store, body) {
  if (body.token) store.sql.exec('DELETE FROM portal_sessions WHERE token_hash=?', await sha256(String(body.token)));
  return json({ ok: true });
}

export async function requireClient(store, token) {
  if (!token) return null;
  const now = new Date().toISOString();
  const row = store.sql.exec(`SELECT s.id AS sessionId,s.expires_at AS expiresAt,c.id,c.email,c.full_name AS fullName,c.company,c.active FROM portal_sessions s JOIN portal_clients c ON c.id=s.client_id WHERE s.token_hash=?`, await sha256(String(token))).toArray()[0];
  if (!row || Number(row.active) !== 1 || row.expiresAt <= now) {
    if (row?.sessionId) store.sql.exec('DELETE FROM portal_sessions WHERE id=?', row.sessionId);
    return null;
  }
  return row;
}

function ensureInternalClient(store, email) {
  let client = store.sql.exec(
    'SELECT id,email,full_name AS fullName,company,active FROM portal_clients WHERE email=?',
    email,
  ).toArray()[0];

  if (!isInternalPortalEmail(store, email) || (client && Number(client.active) === 1)) return client;

  const now = new Date().toISOString();
  const localPart = email.split('@')[0] || 'neptune';
  const displayName = localPart.split(/[._-]+/u).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Équipe Neptune';
  if (client) {
    store.sql.exec(
      'UPDATE portal_clients SET active=1,full_name=COALESCE(NULLIF(full_name,\'\'),?),company=COALESCE(NULLIF(company,\'\'),?),updated_at=? WHERE id=?',
      displayName,
      'Neptune Business',
      now,
      client.id,
    );
  } else {
    store.sql.exec(
      'INSERT INTO portal_clients (id,email,full_name,company,active,created_at,updated_at,last_access_at) VALUES (?,?,?,?,?,?,?,NULL)',
      crypto.randomUUID(),
      email,
      displayName,
      'Neptune Business',
      1,
      now,
      now,
    );
  }
  return store.sql.exec(
    'SELECT id,email,full_name AS fullName,company,active FROM portal_clients WHERE email=?',
    email,
  ).toArray()[0];
}

async function createSession(store, client, now = new Date()) {
  const token = randomToken(32);
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000).toISOString();
  store.sql.exec(
    'INSERT INTO portal_sessions (id,client_id,token_hash,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?,?)',
    crypto.randomUUID(),
    client.id,
    await sha256(token),
    expiresAt,
    now.toISOString(),
    now.toISOString(),
  );
  store.sql.exec('UPDATE portal_clients SET last_access_at=?,updated_at=? WHERE id=?', now.toISOString(), now.toISOString(), client.id);
  return {
    token,
    expiresIn: SESSION_TTL,
    client: {
      id: client.id,
      email: client.email,
      fullName: client.fullName,
      company: client.company,
    },
  };
}

function isInternalPortalEmail(store, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const parts = normalized.split('@');
  if (parts.length === 2 && parts[1] === INTERNAL_PORTAL_DOMAIN && Boolean(parts[0])) return true;
  const configured = String(store?.env?.PORTAL_INTERNAL_EMAILS || '').split(',').map((value) => normalizeEmail(value)).filter(Boolean);
  return configured.includes(normalized);
}

function recordFailure(store, email, now, row) {
  if (!row || now - new Date(row.windowStartedAt) > 900000) {
    store.sql.exec('INSERT OR REPLACE INTO portal_auth_attempts (email,count,window_started_at,locked_until) VALUES (?,?,?,NULL)', email, 1, now.toISOString());
    return;
  }
  const count = Number(row.count) + 1;
  store.sql.exec('UPDATE portal_auth_attempts SET count=?,locked_until=? WHERE email=?', count, count >= 6 ? new Date(now.getTime() + 900000).toISOString() : null, email);
}

function cleanup(store) {
  const now = new Date().toISOString();
  store.sql.exec('DELETE FROM portal_sessions WHERE expires_at<=?', now);
  store.sql.exec('DELETE FROM portal_codes WHERE expires_at<=? OR used_at IS NOT NULL', new Date(Date.now() - 86400000).toISOString());
}
