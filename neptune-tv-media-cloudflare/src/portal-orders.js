import { json, sanitizeText, sanitizeUrl } from './security.js';
import {
  cleanOrderPayload,
  createSteps,
  syncSteps,
  normalizeEmail,
  nullableIso,
  normalizeStatus,
  nextActionForStatus,
  statusRank,
} from './portal-utils.js';
import { requireClient } from './portal-auth.js';

const SUPPLIER_AMOUNT = 72000;
const SUPPLIER_NAME = 'Fournisseur studio';

export async function upsertOrder(store, raw) {
  const p = cleanOrderPayload(raw);
  if (!p.email || !p.externalPaymentId) return json({ error: 'invalid_order' }, 400);
  const paid = new Set(['paid', 'succeeded', 'complete', 'completed', 'no_payment_required']);
  let order = store.sql.exec('SELECT id FROM portal_orders WHERE external_payment_id=?', p.externalPaymentId).toArray()[0];
  if (!order && !paid.has(p.paymentStatus)) return json({ error: 'payment_not_confirmed' }, 409);
  const now = new Date().toISOString();
  let client = store.sql.exec('SELECT id FROM portal_clients WHERE email=?', p.email).toArray()[0];
  const clientCreated = !client;
  if (!client) {
    client = { id: crypto.randomUUID() };
    store.sql.exec(
      'INSERT INTO portal_clients (id,email,full_name,company,active,created_at,updated_at,last_access_at) VALUES (?,?,?,?,1,?,?,NULL)',
      client.id, p.email, p.fullName, p.company, now, now,
    );
  } else {
    store.sql.exec(
      `UPDATE portal_clients SET full_name=CASE WHEN ?<>'' THEN ? ELSE full_name END,
       company=CASE WHEN ?<>'' THEN ? ELSE company END,active=1,updated_at=? WHERE id=?`,
      p.fullName, p.fullName, p.company, p.company, now, client.id,
    );
  }
  let created = false;
  if (!order) {
    created = true;
    order = { id: crypto.randomUUID() };
    const nextAction = p.nextAction || nextActionForStatus(p.status, p);
    store.sql.exec(
      `INSERT INTO portal_orders
       (id,client_id,external_payment_id,order_reference,product_code,title,format,payment_status,amount_total,currency,status,
        appointment_at,filming_at,next_action,preparation_url,booking_url,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      order.id, client.id, p.externalPaymentId, p.orderReference, p.productCode,
      p.title || p.format || 'Passage Neptune Media', p.format, p.paymentStatus, p.amountTotal, p.currency, p.status,
      p.appointmentAt, p.filmingAt, nextAction, p.preparationUrl, p.bookingUrl, now, now,
    );
    createSteps(store, order.id, p.status, now);
  } else {
    store.sql.exec(
      `UPDATE portal_orders SET payment_status=?,amount_total=?,currency=?,
       order_reference=CASE WHEN ?<>'' THEN ? ELSE order_reference END,
       preparation_url=CASE WHEN ?<>'' THEN ? ELSE preparation_url END,
       booking_url=CASE WHEN ?<>'' THEN ? ELSE booking_url END,updated_at=? WHERE id=?`,
      p.paymentStatus, p.amountTotal, p.currency, p.orderReference, p.orderReference,
      p.preparationUrl, p.preparationUrl, p.bookingUrl, p.bookingUrl, now, order.id,
    );
  }
  return json({ ok: true, clientId: client.id, orderId: order.id, clientCreated, created, email: p.email, status: p.status });
}

export async function upsertAppointment(store, raw) {
  const email = normalizeEmail(raw.email || raw.customerEmail || raw.customer_details?.email);
  const externalPaymentId = sanitizeText(
    raw.externalPaymentId || raw.stripePaymentId || raw.paymentIntentId || raw.payment_intent || raw.checkoutSessionId,
    220,
  );
  const appointmentAt = nullableIso(raw.appointmentAt || raw.appointment_at || raw.start || raw.startAt);
  if ((!email && !externalPaymentId) || !appointmentAt) return json({ error: 'invalid_appointment' }, 400);

  let order = externalPaymentId
    ? store.sql.exec(
      `SELECT o.id,o.client_id AS clientId,c.email,o.title,o.preparation_url AS preparationUrl
       FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id WHERE o.external_payment_id=?`,
      externalPaymentId,
    ).toArray()[0]
    : null;
  if (!order && email) {
    order = store.sql.exec(
      `SELECT o.id,o.client_id AS clientId,c.email,o.title,o.preparation_url AS preparationUrl
       FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id
       WHERE c.email=? AND o.status NOT IN ('completed','delivered') ORDER BY o.created_at DESC LIMIT 1`,
      email,
    ).toArray()[0];
  }
  if (!order) return json({ error: 'order_not_found' }, 404);

  const now = new Date().toISOString();
  const status = 'appointment_confirmed';
  const nextAction = sanitizeText(raw.nextAction, 320) || nextActionForStatus(status);
  store.sql.exec(
    `UPDATE portal_orders SET appointment_at=?,status=?,next_action=?,updated_at=? WHERE id=?`,
    appointmentAt, status, nextAction, now, order.id,
  );
  syncSteps(store, order.id, status, now);
  return json({ ok: true, orderId: order.id, clientId: order.clientId, email: order.email, title: order.title, appointmentAt, status, nextAction });
}

export async function authorizeFile(store, body) {
  const session = await requireClient(store, body.token);
  if (!session) return json({ error: 'unauthorized' }, 401);
  const id = sanitizeText(body.fileId, 100);
  const file = store.sql.exec(
    `SELECT f.id,f.name,f.storage_key AS storageKey,f.external_url AS externalUrl
     FROM portal_files f JOIN portal_orders o ON o.id=f.order_id WHERE f.id=? AND o.client_id=?`,
    id, session.id,
  ).toArray()[0];
  return file ? json({ ok: true, file }) : json({ error: 'file_not_found' }, 404);
}

export async function adminList(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const clients = store.sql.exec(
    `SELECT c.id,c.email,c.full_name AS fullName,c.company,c.active,c.created_at AS createdAt,c.last_access_at AS lastAccessAt,
            COUNT(o.id) AS orderCount,MAX(o.updated_at) AS lastOrderAt
     FROM portal_clients c LEFT JOIN portal_orders o ON o.client_id=c.id
     GROUP BY c.id ORDER BY COALESCE(MAX(o.updated_at),c.updated_at) DESC`,
  ).toArray().map((row) => ({ ...row, active: Number(row.active) === 1, orderCount: Number(row.orderCount) }));
  const orders = store.sql.exec(
    `SELECT o.id,o.client_id AS clientId,c.email,c.full_name AS fullName,c.company,o.external_payment_id AS externalPaymentId,
            o.order_reference AS orderReference,o.product_code AS productCode,o.title,o.format,o.payment_status AS paymentStatus,
            o.amount_total AS amountTotal,o.currency,o.status,o.appointment_at AS appointmentAt,o.filming_at AS filmingAt,
            o.next_action AS nextAction,o.preparation_url AS preparationUrl,o.booking_url AS bookingUrl,
            o.created_at AS createdAt,o.updated_at AS updatedAt
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id ORDER BY o.created_at DESC`,
  ).toArray();
  for (const order of orders) {
    if (statusRank(order.status) >= statusRank('filmed')) ensureSupplierPayment(store, order.id, order.filmingAt || order.updatedAt);
    order.steps = store.sql.exec(
      'SELECT step_key AS stepKey,label,state,display_order AS displayOrder,completed_at AS completedAt,note FROM portal_steps WHERE order_id=? ORDER BY display_order',
      order.id,
    ).toArray();
    order.files = store.sql.exec(
      `SELECT id,name,file_type AS fileType,storage_key AS storageKey,external_url AS externalUrl,size_label AS sizeLabel,created_at AS createdAt
       FROM portal_files WHERE order_id=? ORDER BY created_at DESC`,
      order.id,
    ).toArray();
    order.schedules = store.sql.exec(
      `SELECT id,file_id AS fileId,publish_at AS publishAt,network,status,caption,created_at AS createdAt,updated_at AS updatedAt
       FROM portal_content_schedule WHERE order_id=? ORDER BY publish_at ASC`,
      order.id,
    ).toArray();
  }
  const supplierPayments = store.sql.exec(
    `SELECT p.id,p.order_id AS orderId,p.supplier_name AS supplierName,p.amount_total AS amountTotal,p.currency,p.status,
            p.due_at AS dueAt,p.paid_at AS paidAt,p.created_at AS createdAt,p.updated_at AS updatedAt,
            o.title,o.format,c.full_name AS fullName,c.company
     FROM portal_supplier_payments p JOIN portal_orders o ON o.id=p.order_id JOIN portal_clients c ON c.id=o.client_id
     ORDER BY CASE WHEN p.status='due' THEN 0 ELSE 1 END,p.due_at ASC`,
  ).toArray();
  const refundRequests = store.sql.exec(
    `SELECT r.id,r.order_id AS orderId,r.reason,r.eligible,r.status,r.requested_at AS requestedAt,r.processed_at AS processedAt,
            o.title,c.email,c.full_name AS fullName FROM portal_refund_requests r
     JOIN portal_orders o ON o.id=r.order_id JOIN portal_clients c ON c.id=o.client_id ORDER BY r.requested_at DESC`,
  ).toArray().map((row) => ({ ...row, eligible: Number(row.eligible) === 1 }));
  const deletionRequests = store.sql.exec(
    `SELECT d.id,d.client_id AS clientId,d.status,d.requested_at AS requestedAt,d.processed_at AS processedAt,d.note,
            c.email,c.full_name AS fullName,c.company FROM portal_deletion_requests d
     JOIN portal_clients c ON c.id=d.client_id ORDER BY d.requested_at DESC`,
  ).toArray();
  const revenueCents = orders.filter((order) => ['paid','succeeded','complete','completed','no_payment_required'].includes(String(order.paymentStatus).toLowerCase()))
    .reduce((sum, order) => sum + Number(order.amountTotal || 0), 0);
  const supplierDueCents = supplierPayments.filter((payment) => payment.status === 'due').reduce((sum, payment) => sum + Number(payment.amountTotal || 0), 0);
  const supplierPaidCents = supplierPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.amountTotal || 0), 0);
  return json({
    clients,
    orders,
    supplierPayments,
    refundRequests,
    deletionRequests,
    finance: {
      revenueCents,
      supplierDueCents,
      supplierPaidCents,
      estimatedMarginCents: revenueCents - supplierDueCents - supplierPaidCents,
      payingClients: new Set(orders.filter((order) => Number(order.amountTotal) > 0).map((order) => order.clientId)).size,
    },
  });
}

export async function adminUpsert(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const response = await upsertOrder(store, {
    ...payload,
    externalPaymentId: sanitizeText(payload.externalPaymentId, 220) || `manual:${crypto.randomUUID()}`,
    paymentStatus: payload.paymentStatus || 'paid',
  });
  if (response.ok) store.audit(actor.actor.id, 'portal_order_upsert', 'portal_order', '', { email: normalizeEmail(payload.email) });
  return response;
}

export async function adminUpdate(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const payload = body.payload || {};
  const id = sanitizeText(payload.orderId, 100);
  const existing = store.sql.exec(
    `SELECT o.id,o.status,o.appointment_at AS appointmentAt,o.filming_at AS filmingAt,o.next_action AS nextAction,
            o.preparation_url AS preparationUrl,o.booking_url AS bookingUrl,o.title,o.format,c.email,c.full_name AS fullName
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id WHERE o.id=?`,
    id,
  ).toArray()[0];
  if (!existing) return json({ error: 'order_not_found' }, 404);
  const status = payload.status ? normalizeStatus(payload.status) : existing.status;
  const appointmentAt = Object.hasOwn(payload, 'appointmentAt') ? nullableIso(payload.appointmentAt) : existing.appointmentAt;
  const filmingAt = Object.hasOwn(payload, 'filmingAt') ? nullableIso(payload.filmingAt) : existing.filmingAt;
  const preparationUrl = Object.hasOwn(payload, 'preparationUrl') ? sanitizeUrl(payload.preparationUrl, 1200) : existing.preparationUrl;
  const bookingUrl = Object.hasOwn(payload, 'bookingUrl') ? sanitizeUrl(payload.bookingUrl, 1200) : existing.bookingUrl;
  const nextAction = sanitizeText(payload.nextAction, 320) || nextActionForStatus(status, { filmingAt });
  const now = new Date().toISOString();
  store.sql.exec(
    `UPDATE portal_orders SET status=?,appointment_at=?,filming_at=?,next_action=?,preparation_url=?,booking_url=?,updated_at=? WHERE id=?`,
    status, appointmentAt, filmingAt, nextAction, preparationUrl, bookingUrl, now, id,
  );
  syncSteps(store, id, status, now);
  if (statusRank(status) >= statusRank('filmed')) ensureSupplierPayment(store, id, filmingAt || now);
  store.audit(actor.actor.id, 'portal_order_update', 'portal_order', id, { previousStatus: existing.status, status });
  return json({ ok: true, orderId: id, email: existing.email, fullName: existing.fullName, title: existing.title, format: existing.format, previousStatus: existing.status, status, nextAction, appointmentAt, filmingAt });
}

export async function adminFile(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const payload = body.payload || {};
  const orderId = sanitizeText(payload.orderId, 100);
  const order = store.sql.exec('SELECT id,title FROM portal_orders WHERE id=?', orderId).toArray()[0];
  if (!order) return json({ error: 'order_not_found' }, 404);
  const name = sanitizeText(payload.name, 240);
  const storageKey = sanitizeText(payload.storageKey, 900);
  const externalUrl = sanitizeUrl(payload.externalUrl || payload.url, 1500);
  if (!name || (!storageKey && !externalUrl)) return json({ error: 'invalid_file' }, 400);
  const id = crypto.randomUUID();
  const fileType = sanitizeText(payload.fileType, 40) || 'livrable';
  const now = new Date().toISOString();
  store.sql.exec(
    'INSERT INTO portal_files (id,order_id,name,file_type,storage_key,external_url,size_label,created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, orderId, name, fileType, storageKey, externalUrl, sanitizeText(payload.sizeLabel, 60), now,
  );
  let schedule = null;
  if (['short','shorts','teaser','reel'].includes(fileType.toLowerCase())) {
    schedule = scheduleContent(store, orderId, id, name, order.title, now);
  }
  store.audit(actor.actor.id, 'portal_file_add', 'portal_file', id, { orderId, name, fileType });
  return json({ ok: true, fileId: id, schedule });
}

export async function adminAccess(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const email = normalizeEmail(body.email || body.payload?.email);
  const client = store.sql.exec(
    'SELECT id,email,full_name AS fullName,company FROM portal_clients WHERE email=? AND active=1',
    email,
  ).toArray()[0];
  if (!client) return json({ error: 'client_not_found' }, 404);
  store.audit(actor.actor.id, 'portal_access_email_requested', 'portal_client', client.id, { email });
  return json({ ok: true, client });
}

export async function adminSupplierPayment(store, body) {
  const actor = await requireAdmin(store, body);
  if (!actor.ok) return actor.response;
  const paymentId = sanitizeText(body.payload?.paymentId || body.paymentId, 100);
  const payment = store.sql.exec('SELECT id,status FROM portal_supplier_payments WHERE id=?', paymentId).toArray()[0];
  if (!payment) return json({ error: 'supplier_payment_not_found' }, 404);
  const now = new Date().toISOString();
  store.sql.exec("UPDATE portal_supplier_payments SET status='paid',paid_at=?,updated_at=? WHERE id=?", now, now, paymentId);
  store.audit(actor.actor.id, 'supplier_payment_paid', 'portal_supplier_payment', paymentId, {});
  return json({ ok: true, paymentId, status: 'paid', paidAt: now });
}

export async function clientDeletionRequest(store, body) {
  const client = await requireClient(store, body.token);
  if (!client) return json({ error: 'unauthorized' }, 401);
  const existing = store.sql.exec(
    "SELECT id,status,requested_at AS requestedAt FROM portal_deletion_requests WHERE client_id=? AND status='pending' ORDER BY requested_at DESC LIMIT 1",
    client.id,
  ).toArray()[0];
  if (existing) return json({ ok: true, request: existing, existing: true, email: client.email, fullName: client.fullName });
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  store.sql.exec(
    'INSERT INTO portal_deletion_requests (id,client_id,status,requested_at,processed_at,note) VALUES (?,?,' + "'pending'" + ',?,NULL,?)',
    id, client.id, now, sanitizeText(body.note, 500),
  );
  return json({ ok: true, request: { id, status: 'pending', requestedAt: now }, email: client.email, fullName: client.fullName });
}

function ensureSupplierPayment(store, orderId, referenceDate) {
  const existing = store.sql.exec('SELECT id FROM portal_supplier_payments WHERE order_id=?', orderId).toArray()[0];
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const base = new Date(referenceDate || now);
  const dueAt = Number.isNaN(base.getTime()) ? now : base.toISOString();
  const id = crypto.randomUUID();
  store.sql.exec(
    `INSERT INTO portal_supplier_payments (id,order_id,supplier_name,amount_total,currency,status,due_at,paid_at,created_at,updated_at)
     VALUES (?,?,?,?,?,'due',?,NULL,?,?)`,
    id, orderId, SUPPLIER_NAME, SUPPLIER_AMOUNT, 'eur', dueAt, now, now,
  );
  return id;
}

function scheduleContent(store, orderId, fileId, name, orderTitle, now) {
  const count = Number(store.sql.exec('SELECT COUNT(*) AS count FROM portal_content_schedule WHERE order_id=?', orderId).one().count || 0);
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1 + count * 2);
  date.setUTCHours(9, 0, 0, 0);
  const publishAt = date.toISOString();
  const caption = `Nouveau contenu Neptune Media : ${name}${orderTitle ? ` · ${orderTitle}` : ''}`.slice(0, 500);
  const id = crypto.randomUUID();
  store.sql.exec(
    `INSERT INTO portal_content_schedule (id,order_id,file_id,publish_at,network,status,caption,created_at,updated_at)
     VALUES (?,?,?,?,?,'ready',?,?,?)`,
    id, orderId, fileId, publishAt, 'À choisir', caption, now, now,
  );
  return { id, fileId, publishAt, network: 'À choisir', status: 'ready', caption };
}

async function requireAdmin(store, body) {
  const actor = await store.requireSession(body.token);
  if (!actor || actor.role !== 'admin') return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  if (!body.csrfToken || body.csrfToken !== actor.csrfToken) return { ok: false, response: json({ error: 'csrf_failed' }, 403) };
  return { ok: true, actor };
}
