import { StudioStore as LegacyStore } from './store-v3.js';
import { ensurePortalSchema } from './portal-schema.js';
import { json } from './security.js';
import {
  autopilotAction,
  autopilotPulse,
  autopilotReconcile,
  autopilotSnapshot,
  autopilotUndo,
} from './portal-autopilot-v3.js';

const CONTROL_ROLES = new Set(['admin','editor','analyst']);
const PRODUCTION_STATUSES = "'studio_date_confirmation_pending','preparation_complete','filming_scheduled','filming_confirmed','filmed','videos_pending','videos_received','editing','approval','delivered'";

export class StudioStore extends LegacyStore {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    if (url.pathname.startsWith('/portal/autopilot-')) {
      try {
        ensurePortalSchema(this);
        const body = method === 'GET' ? {} : await request.clone().json().catch(() => ({}));
        if (url.pathname === '/portal/autopilot-snapshot' && method === 'POST') return autopilotSnapshot(this, body);
        if (url.pathname === '/portal/autopilot-safe-list' && method === 'POST') return safeControlList(this, body);
        if (url.pathname === '/portal/autopilot-reconcile' && method === 'POST') return autopilotReconcile(this, body);
        if (url.pathname === '/portal/autopilot-action' && method === 'POST') return autopilotAction(this, body);
        if (url.pathname === '/portal/autopilot-undo' && method === 'POST') return autopilotUndo(this, body);
        if (url.pathname === '/portal/autopilot-pulse' && method === 'POST') return autopilotPulse(this, body);
      } catch (error) {
        const operation = url.pathname.slice('/portal/autopilot-'.length) || 'unknown';
        console.error('portal_autopilot_failed', {
          operation,
          name: error?.name || 'Error',
          message: String(error?.message || error || 'unknown').slice(0, 500),
        });
        return json({ error: `autopilot_${operation}_failed`, stage: operation }, 500);
      }
    }
    return super.fetch(request);
  }
}

async function safeControlList(store, body) {
  const actor = await store.requireSession(body.token);
  if (!actor || !CONTROL_ROLES.has(actor.role)) return json({ error: 'unauthorized' }, 401);
  if (!body.csrfToken || body.csrfToken !== actor.csrfToken) return json({ error: 'csrf_failed' }, 403);
  const where = actor.role === 'editor' ? `WHERE o.status IN (${PRODUCTION_STATUSES})` : '';
  const orders = store.sql.exec(
    `SELECT o.id,o.client_id AS clientId,c.email,c.full_name AS fullName,c.company,
            o.title,o.format,o.payment_status AS paymentStatus,o.amount_total AS amountTotal,o.currency,o.status,
            o.appointment_at AS appointmentAt,o.filming_at AS filmingAt,o.next_action AS nextAction,
            o.created_at AS createdAt,o.updated_at AS updatedAt
     FROM portal_orders o JOIN portal_clients c ON c.id=o.client_id ${where}
     ORDER BY o.updated_at DESC`,
  ).toArray().map((row) => ({
    ...row,
    amountTotal: Number(row.amountTotal || 0),
    fullName: actor.role === 'analyst' ? '' : row.fullName,
    company: actor.role === 'analyst' ? '' : row.company,
    email: actor.role === 'analyst' ? '' : row.email,
  }));
  const supplierPayments = actor.role === 'admin' ? store.sql.exec(
    `SELECT p.id,p.order_id AS orderId,p.amount_total AS amountTotal,p.currency,p.status,p.due_at AS dueAt,
            o.title,o.format,c.full_name AS fullName,c.company
     FROM portal_supplier_payments p JOIN portal_orders o ON o.id=p.order_id JOIN portal_clients c ON c.id=o.client_id
     ORDER BY CASE WHEN p.status='due' THEN 0 ELSE 1 END,p.due_at ASC`,
  ).toArray().map((row) => ({ ...row, amountTotal: Number(row.amountTotal || 0) })) : [];
  const refundRequests = actor.role === 'admin' ? store.sql.exec(
    `SELECT r.id,r.order_id AS orderId,r.reason,r.status,r.requested_at AS requestedAt,o.title,c.full_name AS fullName
     FROM portal_refund_requests r JOIN portal_orders o ON o.id=r.order_id JOIN portal_clients c ON c.id=o.client_id
     WHERE r.status='pending' ORDER BY r.requested_at ASC`,
  ).toArray() : [];
  const deletionRequests = actor.role === 'admin' ? store.sql.exec(
    `SELECT d.id,d.status,d.requested_at AS requestedAt,d.note,c.email,c.full_name AS fullName,c.company
     FROM portal_deletion_requests d JOIN portal_clients c ON c.id=d.client_id
     WHERE d.status='pending' ORDER BY d.requested_at ASC`,
  ).toArray() : [];
  return json({
    ok: true,
    viewer: { id: actor.id, email: actor.email, fullName: actor.fullName, role: actor.role, readOnly: actor.role === 'analyst' },
    orders,
    supplierPayments,
    refundRequests,
    deletionRequests,
  });
}
