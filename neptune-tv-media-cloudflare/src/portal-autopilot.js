import { json, sanitizeText } from './security.js';
import { nextActionForStatus, statusRank, syncSteps } from './portal-utils.js';

const VIEW_ROLES = new Set(['admin', 'editor', 'analyst']);
const ACTION_ROLES = new Set(['admin', 'editor']);
const PRODUCTION_STATUSES = new Set([
  'studio_date_confirmation_pending',
  'preparation_complete',
  'filming_scheduled',
  'filming_confirmed',
  'filmed',
  'videos_pending',
  'videos_received',
  'editing',
  'approval',
  'delivered',
]);
const PAID_STATUSES = new Set(['paid', 'succeeded', 'complete', 'completed', 'no_payment_required']);
const SUPPLIER_AMOUNT = 72000;
const SUPPLIER_NAME = 'Fournisseur studio';
const UNDO_TTL_MS = 5 * 60 * 1000;

export async function autopilotSnapshot(store, body) {
  const access = await requireViewer(store, body);
  if (!access.ok) return access.response;
  ensureAutopilotSchema(store);

  const role = access.actor.role;
  const orders = listOrders(store);
  const visibleOrders = role === 'editor'
    ? orders.filter((order) => PRODUCTION_STATUSES.has(order.status))
    : orders;
  const orderActions = role === 'analyst'
    ? []
    : visibleOrders.map((order) => orderException(order, role)).filter(Boolean);
  const supplierPayments = role === 'admin' ? listSupplierPayments(store) : [];
  const requestActions = role === 'admin' ? listAdministrativeRequests(store) : [];
  const supplierActions = supplierPayments
    .filter((payment) => payment.status === 'due')
    .map((payment) => supplierException(payment));
  const actions = [...orderActions, ...supplierActions, ...requestActions]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || dateRank(a.deadline) - dateRank(b.deadline));

  const actionOrderIds = new Set(orderActions.map((item) => item.orderId).filter(Boolean));
  const watching = visibleOrders.filter((order) => !actionOrderIds.has(order.id) && isWatching(order));
  const active = visibleOrders.filter((order) => order.status !== 'completed');
  const automatic = active.filter((order) => !actionOrderIds.has(order.id) && !watching.some((item) => item.id === order.id));
  const upcoming = upcomingEvents(visibleOrders, role);
  const recentAutomation = listRecentAutomation(store, role);
  const runtimeHealth = readRuntimeHealth(store);

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    viewer: {
      id: access.actor.id,
      email: access.actor.email,
      fullName: access.actor.fullName,
      role,
      readOnly: role === 'analyst',
    },
    summary: {
      active: active.length,
      actions: actions.length,
      watching: watching.length,
      automatic: automatic.length,
      production: active.filter((order) => statusRank(order.status) >= statusRank('filmed') && statusRank(order.status) < statusRank('delivered')).length,
    },
    actions,
    upcoming,
    recentAutomation,
    runtimeHealth,
  });
}

export async function autopilotReconcile(store, body) {
  const access = body?.system === true
    ? { ok: true, actor: { id: null, role: 'system', email: '', fullName: 'Neptune Automations' } }
    : await requireViewer(store, body);
  if (!access.ok) return access.response;
  ensureAutopilotSchema(store);

  const transitions = [];
  for (const order of listOrders(store)) {
    const target = automaticTarget(order);
    if (!target || target === order.status) continue;
    transitions.push(applyTransition(store, order, target, access.actor, 'automatic'));
  }
  return json({ ok: true, transitions });
}

export async function autopilotAction(store, body) {
  const access = await requireViewer(store, body);
  if (!access.ok) return access.response;
  if (!ACTION_ROLES.has(access.actor.role)) return json({ error: 'forbidden' }, 403);
  ensureAutopilotSchema(store);

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const orderId = sanitizeText(payload.orderId, 100);
  const action = sanitizeText(payload.action, 80);
  const order = listOrders(store).find((item) => item.id === orderId);
  if (!order) return json({ error: 'order_not_found' }, 404);

  const target = manualTarget(order, action, access.actor.role);
  if (!target) return json({ error: 'action_not_available' }, 409);
  const result = applyTransition(store, order, target, access.actor, 'manual');
  return json({ ok: true, ...result, undoExpiresIn: Math.floor(UNDO_TTL_MS / 1000) });
}

export async function autopilotUndo(store, body) {
  const access = await requireViewer(store, body);
  if (!access.ok) return access.response;
  if (!ACTION_ROLES.has(access.actor.role)) return json({ error: 'forbidden' }, 403);
  ensureAutopilotSchema(store);

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const historyId = sanitizeText(payload.historyId, 100);
  const history = store.sql.exec(
    `SELECT h.id,h.order_id AS orderId,h.actor_id AS actorId,h.from_status AS fromStatus,h.to_status AS toStatus,
            h.reason,h.created_at AS createdAt,h.undone_at AS undoneAt,
            o.status,o.filming_at AS filmingAt,o.title,o.format,c.email,c.full_name AS fullName
     FROM portal_autopilot_history h
     JOIN portal_orders o ON o.id=h.order_id
     JOIN portal_clients c ON c.id=o.client_id
     WHERE h.id=?`,
    historyId,
  ).toArray()[0];
  if (!history || history.reason !== 'manual' || history.undoneAt) return json({ error: 'undo_unavailable' }, 409);
  if (access.actor.role !== 'admin' && history.actorId !== access.actor.id) return json({ error: 'forbidden' }, 403);
  if (Date.now() - new Date(history.createdAt).getTime() > UNDO_TTL_MS) return json({ error: 'undo_expired' }, 409);
  if (history.status !== history.toStatus) return json({ error: 'undo_conflict' }, 409);

  const now = new Date().toISOString();
  const nextAction = nextActionForStatus(history.fromStatus, { filmingAt: history.filmingAt });
  store.sql.exec(
    'UPDATE portal_orders SET status=?,next_action=?,updated_at=? WHERE id=?',
    history.fromStatus,
    nextAction,
    now,
    history.orderId,
  );
  syncSteps(store, history.orderId, history.fromStatus, now);
  store.sql.exec('UPDATE portal_autopilot_history SET undone_at=? WHERE id=?', now, history.id);
  if (statusRank(history.fromStatus) < statusRank('filmed') && statusRank(history.toStatus) >= statusRank('filmed')) {
    store.sql.exec("DELETE FROM portal_supplier_payments WHERE order_id=? AND status='due' AND paid_at IS NULL", history.orderId);
  }
  store.audit(access.actor.id, 'portal_order_undo', 'portal_order', history.orderId, {
    fromStatus: history.toStatus,
    status: history.fromStatus,
    historyId: history.id,
  });
  return json({
    ok: true,
    orderId: history.orderId,
    email: history.email,
    fullName: history.fullName,
    title: history.title,
    format: history.format,
    previousStatus: history.toStatus,
    status: history.fromStatus,
    nextAction,
  });
}

export function autopilotPulse(store, body) {
  ensureAutopilotSchema(store);
  const key = sanitizeText(body.key, 80) || 'scheduler';
  const status = sanitizeText(body.status, 30) || 'ok';
  const detail = sanitizeText(body.detail, 500);
  const checkedAt = new Date().toISOString();
  store.sql.exec(
    `INSERT INTO portal_runtime_health (key,status,detail,checked_at) VALUES (?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET status=excluded.status,detail=excluded.detail,checked_at=excluded.checked_at`,
    key,
    status,
    detail,
    checkedAt,
  );
  return json({ ok: true, key, status, checkedAt });
}

function ensureAutopilotSchema(store) {
  store.sql.exec(`
    CREATE TABLE IF NOT EXISTS portal_autopilot_history(
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES portal_orders(id) ON DELETE CASCADE,
      actor_id TEXT,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL,
      undone_at TEXT
    );
    CREATE TABLE IF NOT EXISTS portal_runtime_health(
      key TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      checked_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_portal_autopilot_order ON portal_autopilot_history(order_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_portal_autopilot_reason ON portal_autopilot_history(reason,created_at DESC);
  `);
}

async function requireViewer(store, body) {
  const actor = await store.requireSession(body.token);
  if (!actor || !VIEW_ROLES.has(actor.role)) return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  if (!body.csrfToken || body.csrfToken !== actor.csrfToken) return { ok: false, response: json({ error: 'csrf_failed' }, 403) };
  return { ok: true, actor };
}

function listOrders(store) {
  return store.sql.exec(
    `SELECT o.id,o.client_id AS clientId,c.email,c.full_name AS fullName,c.company,
            o.title,o.format,o.payment_status AS paymentStatus,o.amount_total AS amountTotal,o.currency,o.status,
            o.appointment_at AS appointmentAt,o.filming_at AS filmingAt,o.next_action AS nextAction,
            o.created_at AS createdAt,o.updated_at AS updatedAt,
            (SELECT COUNT(*) FROM portal_files f WHERE f.order_id=o.id) AS fileCount,
            (SELECT COUNT(*) FROM portal_files f WHERE f.order_id=o.id AND lower(f.file_type) IN ('final','emission','full','master','episode')) AS finalFileCount,
            (SELECT COUNT(*) FROM portal_feedback pf WHERE pf.order_id=o.id) AS feedbackCount
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id
     ORDER BY o.updated_at DESC`,
  ).toArray().map((row) => ({
    ...row,
    amountTotal: Number(row.amountTotal || 0),
    fileCount: Number(row.fileCount || 0),
    finalFileCount: Number(row.finalFileCount || 0),
    feedbackCount: Number(row.feedbackCount || 0),
  }));
}

function listSupplierPayments(store) {
  return store.sql.exec(
    `SELECT p.id,p.order_id AS orderId,p.amount_total AS amountTotal,p.currency,p.status,p.due_at AS dueAt,
            o.title,o.format,c.full_name AS fullName,c.company
     FROM portal_supplier_payments p
     JOIN portal_orders o ON o.id=p.order_id
     JOIN portal_clients c ON c.id=o.client_id
     ORDER BY CASE WHEN p.status='due' THEN 0 ELSE 1 END,p.due_at ASC`,
  ).toArray().map((row) => ({ ...row, amountTotal: Number(row.amountTotal || 0) }));
}

function listAdministrativeRequests(store) {
  const refunds = store.sql.exec(
    `SELECT r.id,r.order_id AS orderId,r.reason,r.requested_at AS requestedAt,o.title,c.full_name AS fullName
     FROM portal_refund_requests r JOIN portal_orders o ON o.id=r.order_id JOIN portal_clients c ON c.id=o.client_id
     WHERE r.status='pending' ORDER BY r.requested_at ASC`,
  ).toArray().map((item) => ({
    id: `refund:${item.id}`,
    type: 'administrative',
    severity: 'warning',
    title: 'Demande de remboursement à décider',
    subtitle: [item.fullName, item.title].filter(Boolean).join(' · '),
    reason: item.reason || 'Le client a transmis une demande qui nécessite une décision humaine.',
    consequence: 'La demande sera traitée dans l’administration financière.',
    inaction: 'La demande reste en attente et le client n’obtient aucune réponse.',
    href: '/studio/advanced.html#finances',
    actionLabel: 'Décider',
    deadline: item.requestedAt,
    canAct: true,
  }));
  const deletions = store.sql.exec(
    `SELECT d.id,d.requested_at AS requestedAt,d.note,c.full_name AS fullName,c.company
     FROM portal_deletion_requests d JOIN portal_clients c ON c.id=d.client_id
     WHERE d.status='pending' ORDER BY d.requested_at ASC`,
  ).toArray().map((item) => ({
    id: `deletion:${item.id}`,
    type: 'administrative',
    severity: 'warning',
    title: 'Suppression de compte à vérifier',
    subtitle: item.fullName || item.company || 'Client Neptune Media',
    reason: item.note || 'Une demande de suppression doit être contrôlée avant exécution.',
    consequence: 'Les obligations de conservation pourront être vérifiées avant traitement.',
    inaction: 'La demande reste légalement et opérationnellement en attente.',
    href: '/studio/advanced.html#finances',
    actionLabel: 'Vérifier',
    deadline: item.requestedAt,
    canAct: true,
  }));
  return [...refunds, ...deletions];
}

function automaticTarget(order) {
  if (PAID_STATUSES.has(String(order.paymentStatus || '').toLowerCase()) && order.status === 'payment_confirmed') return 'reservation_confirmed';
  if (order.appointmentAt && ['payment_confirmed', 'reservation_confirmed', 'preparation_booking_pending'].includes(order.status)) return 'appointment_confirmed';
  if (order.status === 'preparation_complete' && order.filmingAt) return 'filming_scheduled';
  if (order.finalFileCount > 0 && ['filmed', 'videos_pending', 'videos_received', 'editing', 'approval'].includes(order.status)) return 'delivered';
  if (order.fileCount > 0 && ['filmed', 'videos_pending'].includes(order.status)) return 'videos_received';
  if (order.status === 'delivered' && order.feedbackCount > 0) return 'completed';
  return '';
}

function manualTarget(order, action, role) {
  if (!ACTION_ROLES.has(role)) return '';
  if (action === 'confirm_preparation' && order.status === 'studio_date_confirmation_pending') {
    return order.filmingAt ? 'filming_scheduled' : 'preparation_complete';
  }
  if (action === 'confirm_filming' && ['filming_scheduled', 'filming_confirmed'].includes(order.status)) {
    const filming = new Date(order.filmingAt || '');
    if (!Number.isNaN(filming.getTime()) && filming.getTime() > Date.now() + 15 * 60 * 1000) return '';
    return 'videos_pending';
  }
  if (action === 'start_editing' && order.status === 'videos_received') return 'editing';
  return '';
}

function applyTransition(store, order, target, actor, reason) {
  const now = new Date().toISOString();
  const historyId = crypto.randomUUID();
  const nextAction = nextActionForStatus(target, { filmingAt: order.filmingAt });
  store.sql.exec(
    'UPDATE portal_orders SET status=?,next_action=?,updated_at=? WHERE id=?',
    target,
    nextAction,
    now,
    order.id,
  );
  syncSteps(store, order.id, target, now);
  if (statusRank(target) >= statusRank('filmed')) ensureSupplierPayment(store, order.id, order.filmingAt || now);
  store.sql.exec(
    `INSERT INTO portal_autopilot_history (id,order_id,actor_id,from_status,to_status,reason,created_at,undone_at)
     VALUES (?,?,?,?,?,?,?,NULL)`,
    historyId,
    order.id,
    actor?.id || null,
    order.status,
    target,
    reason,
    now,
  );
  store.audit(actor?.id || null, reason === 'automatic' ? 'portal_order_auto_advance' : 'portal_order_quick_action', 'portal_order', order.id, {
    previousStatus: order.status,
    status: target,
    historyId,
  });
  return {
    orderId: order.id,
    email: order.email,
    fullName: order.fullName,
    title: order.title,
    format: order.format,
    previousStatus: order.status,
    status: target,
    nextAction,
    appointmentAt: order.appointmentAt,
    filmingAt: order.filmingAt,
    historyId,
    reason,
  };
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
    id,
    orderId,
    SUPPLIER_NAME,
    SUPPLIER_AMOUNT,
    'eur',
    dueAt,
    now,
    now,
  );
  return id;
}

function orderException(order, role) {
  const deadline = deadlineFor(order);
  const common = {
    id: `order:${order.id}`,
    type: 'order',
    orderId: order.id,
    subtitle: [order.fullName || order.company || order.email, order.format].filter(Boolean).join(' · '),
    deadline: deadline?.toISOString() || null,
    canAct: role === 'admin' || role === 'editor',
  };

  if (order.status === 'studio_date_confirmation_pending') {
    return {
      ...common,
      severity: deadline && deadline.getTime() < Date.now() ? 'critical' : 'warning',
      title: order.filmingAt ? 'Valider la date studio' : 'Ajouter la date studio',
      reason: order.filmingAt
        ? 'La préparation est terminée et une date de passage est déjà enregistrée.'
        : 'La préparation est terminée mais aucune date de passage n’est enregistrée.',
      consequence: order.filmingAt
        ? 'Le client sera informé et le parcours passera automatiquement à « Passage confirmé ».'
        : 'Le dossier s’ouvrira pour renseigner la seule information manquante.',
      inaction: deadline && deadline.getTime() < Date.now()
        ? 'Le délai de confirmation est dépassé et le client reste bloqué.'
        : 'Le client reste en attente de confirmation.',
      actionKey: order.filmingAt ? 'confirm_preparation' : '',
      actionLabel: order.filmingAt ? 'Valider la date' : 'Ajouter la date',
      href: order.filmingAt ? '' : `/studio/clients#${encodeURIComponent(order.id)}`,
    };
  }

  if (order.status === 'preparation_complete' && !order.filmingAt) {
    return {
      ...common,
      severity: 'warning',
      title: 'Planifier le passage studio',
      reason: 'La préparation est terminée, mais le passage studio n’a pas encore de date.',
      consequence: 'Dès que la date est renseignée, Neptune confirmera automatiquement le passage.',
      inaction: 'Le parcours ne peut pas avancer vers le tournage.',
      actionLabel: 'Ajouter la date',
      href: `/studio/clients#${encodeURIComponent(order.id)}`,
    };
  }

  if (['filming_scheduled', 'filming_confirmed'].includes(order.status)) {
    const filming = new Date(order.filmingAt || '');
    if (!Number.isNaN(filming.getTime()) && filming.getTime() <= Date.now() + 15 * 60 * 1000) {
      return {
        ...common,
        severity: filming.getTime() < Date.now() - 24 * 60 * 60 * 1000 ? 'critical' : 'warning',
        title: 'Confirmer que le passage a eu lieu',
        reason: `Le créneau prévu est ${filming.getTime() < Date.now() ? 'passé' : 'en cours'}. Seule l’équipe peut confirmer la réalité du tournage.`,
        consequence: 'Le fournisseur sera créé à payer et Neptune commencera automatiquement l’attente des vidéos.',
        inaction: 'La production et les délais de livraison ne peuvent pas démarrer.',
        actionKey: 'confirm_filming',
        actionLabel: 'Passage réalisé',
      };
    }
  }

  if (order.status === 'videos_pending' && deadline && deadline.getTime() < Date.now()) {
    return {
      ...common,
      severity: 'critical',
      title: 'Vidéos du studio non reçues',
      reason: 'Le délai de réception de 7 jours est dépassé et aucun fichier n’a été détecté.',
      consequence: 'Le dossier s’ouvrira pour vérifier le fournisseur ou déposer les fichiers reçus autrement.',
      inaction: 'La livraison client continuera de prendre du retard.',
      actionLabel: 'Vérifier la réception',
      href: `/studio/clients#${encodeURIComponent(order.id)}`,
    };
  }

  if (order.status === 'videos_received') {
    return {
      ...common,
      severity: 'warning',
      title: 'Démarrer le traitement vidéo',
      reason: `${order.fileCount} fichier${order.fileCount > 1 ? 's sont' : ' est'} disponible${order.fileCount > 1 ? 's' : ''}.`,
      consequence: 'Neptune Video Studio s’ouvrira et le client verra automatiquement « Montage en cours ».',
      inaction: 'Les fichiers restent disponibles, mais le délai de livraison ne progresse pas.',
      actionKey: 'start_editing',
      actionLabel: 'Ouvrir et démarrer',
      externalUrl: 'https://neptune-video-clean.neptunebusinessclub.workers.dev/',
    };
  }

  if (['editing', 'approval'].includes(order.status) && deadline && deadline.getTime() < Date.now()) {
    return {
      ...common,
      severity: 'critical',
      title: 'Livraison en retard',
      reason: 'Le délai de livraison de 15 jours est dépassé et aucun fichier final n’a été détecté.',
      consequence: 'Le dossier s’ouvrira pour déposer la livraison ou vérifier le traitement.',
      inaction: 'Le client reste sans livraison et le retard continue de s’allonger.',
      actionLabel: 'Vérifier la livraison',
      href: `/studio/clients#${encodeURIComponent(order.id)}`,
    };
  }
  return null;
}

function supplierException(payment) {
  return {
    id: `supplier:${payment.id}`,
    type: 'supplier',
    paymentId: payment.id,
    severity: new Date(payment.dueAt).getTime() < Date.now() ? 'critical' : 'warning',
    title: 'Paiement fournisseur à confirmer',
    subtitle: [payment.fullName || payment.company, payment.title].filter(Boolean).join(' · '),
    reason: `${money(payment.amountTotal, payment.currency)} est enregistré comme dû au fournisseur studio.`,
    consequence: 'Le paiement sera marqué comme effectué dans le suivi financier.',
    inaction: 'La dette restera visible comme impayée.',
    actionKey: 'pay_supplier',
    actionLabel: 'Marquer payé',
    deadline: payment.dueAt,
    canAct: true,
  };
}

function deadlineFor(order) {
  const base = new Date(order.updatedAt || order.createdAt || Date.now());
  if (order.status === 'studio_date_confirmation_pending') return new Date(base.getTime() + 48 * 60 * 60 * 1000);
  if (order.status === 'videos_pending') return new Date(new Date(order.filmingAt || base).getTime() + 7 * 24 * 60 * 60 * 1000);
  if (['videos_received', 'editing', 'approval'].includes(order.status)) return new Date(new Date(order.filmingAt || base).getTime() + 15 * 24 * 60 * 60 * 1000);
  if (['preparation_complete', 'filming_scheduled', 'filming_confirmed'].includes(order.status) && order.filmingAt) return new Date(order.filmingAt);
  return null;
}

function isWatching(order) {
  if (order.status === 'completed') return false;
  const deadline = deadlineFor(order);
  if (!deadline) return false;
  const distance = deadline.getTime() - Date.now();
  return distance >= 0 && distance < 7 * 24 * 60 * 60 * 1000;
}

function upcomingEvents(orders, role) {
  const now = Date.now();
  const events = orders.flatMap((order) => [
    order.appointmentAt ? { type: 'Préparation', at: order.appointmentAt, order } : null,
    order.filmingAt ? { type: 'Passage studio', at: order.filmingAt, order } : null,
  ].filter(Boolean));
  return events
    .filter((item) => new Date(item.at).getTime() >= now)
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .slice(0, 6)
    .map((item) => ({
      type: item.type,
      at: item.at,
      orderId: item.order.id,
      client: role === 'analyst' ? 'Projet Neptune Media' : item.order.fullName || item.order.company || item.order.email,
      format: item.order.format,
    }));
}

function listRecentAutomation(store, role) {
  return store.sql.exec(
    `SELECT h.id,h.order_id AS orderId,h.from_status AS fromStatus,h.to_status AS toStatus,h.created_at AS createdAt,
            o.title,o.format,c.full_name AS fullName,c.company
     FROM portal_autopilot_history h
     JOIN portal_orders o ON o.id=h.order_id
     JOIN portal_clients c ON c.id=o.client_id
     WHERE h.reason='automatic' AND h.undone_at IS NULL
     ORDER BY h.created_at DESC LIMIT 8`,
  ).toArray().map((item) => ({
    ...item,
    client: role === 'analyst' ? 'Projet Neptune Media' : item.fullName || item.company || 'Client Neptune Media',
  }));
}

function readRuntimeHealth(store) {
  const rows = store.sql.exec('SELECT key,status,detail,checked_at AS checkedAt FROM portal_runtime_health').toArray();
  return Object.fromEntries(rows.map((row) => [row.key, row]));
}

function severityRank(value) {
  return value === 'critical' ? 0 : value === 'warning' ? 1 : 2;
}

function dateRank(value) {
  const date = new Date(value || '9999-12-31');
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function money(cents, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(currency || 'eur').toUpperCase() }).format(Number(cents || 0) / 100);
}
