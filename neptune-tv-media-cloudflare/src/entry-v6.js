import base from './entry-v5.js';
import { StudioStore } from './store-v4.js';
import { adminAuth } from './portal-http-utils.js';
import { json, securityHeaders } from './security.js';

export { StudioStore };

const CONTROL_ROOM_PATH = '/api/admin/control-room';
const PRODUCTION_STATUSES = new Set(['filmed','videos_pending','videos_received','editing','approval']);
const COMPLETED_STATUSES = new Set(['completed']);
const DAY = 24 * 60 * 60 * 1000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === CONTROL_ROOM_PATH) {
      return resilientControlRoom(request, env, ctx);
    }
    return base.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    if (typeof base.scheduled === 'function') return base.scheduled(controller, env, ctx);
  },
};

async function resilientControlRoom(request, env, ctx) {
  let primary;
  try {
    primary = await base.fetch(request, env, ctx);
    if (primary.ok || primary.status < 500) return primary;
  } catch (error) {
    console.error('control_room_primary_exception', safeError(error));
  }

  const primaryStatus = primary?.status || 500;
  const primaryBody = primary ? await primary.clone().json().catch(() => ({})) : {};
  console.error('control_room_primary_failed', { status: primaryStatus, error: primaryBody.error || 'unknown' });

  try {
    const studio = env.STUDIO.get(env.STUDIO.idFromName('neptune-media-main'));
    const response = await callStore(studio, '/portal/admin-list', adminAuth(request));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return secure(json({
        error: data.error || 'control_room_unavailable',
        stage: 'fallback_admin_list',
        primaryStatus,
      }, response.status));
    }
    return secure(json(buildFallbackSnapshot(data, env, primaryStatus, primaryBody.error || 'internal_error')));
  } catch (error) {
    console.error('control_room_fallback_failed', safeError(error));
    return secure(json({
      error: 'control_room_unavailable',
      stage: 'fallback_exception',
      primaryStatus,
    }, 503));
  }
}

function buildFallbackSnapshot(data, env, primaryStatus, primaryError) {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const active = orders.filter((order) => !COMPLETED_STATUSES.has(order.status));
  const orderActions = active.map(orderFallbackAction).filter(Boolean);
  const supplierActions = (data.supplierPayments || [])
    .filter((payment) => payment.status === 'due')
    .map(supplierFallbackAction);
  const requestActions = [
    ...(data.refundRequests || []).filter((item) => item.status === 'pending').map(refundFallbackAction),
    ...(data.deletionRequests || []).filter((item) => item.status === 'pending').map(deletionFallbackAction),
  ];
  const actions = [...orderActions, ...supplierActions, ...requestActions].sort(sortActions);
  const actionOrderIds = new Set(orderActions.map((item) => item.orderId));
  const watching = active.filter((order) => !actionOrderIds.has(order.id) && isWatching(order));
  const watchingIds = new Set(watching.map((order) => order.id));
  const automatic = active.filter((order) => !actionOrderIds.has(order.id) && !watchingIds.has(order.id));

  return {
    ok: true,
    degraded: true,
    generatedAt: new Date().toISOString(),
    viewer: { role: 'admin', readOnly: false },
    summary: {
      active: active.length,
      actions: actions.length,
      watching: watching.length,
      automatic: automatic.length,
      production: active.filter((order) => PRODUCTION_STATUSES.has(order.status)).length,
      systemIssues: 1,
    },
    actions,
    upcoming: fallbackUpcoming(orders),
    recentAutomation: [],
    health: fallbackHealth(env, primaryStatus, primaryError),
    diagnostic: {
      mode: 'safe_fallback',
      primaryStatus,
      primaryError,
    },
  };
}

function orderFallbackAction(order) {
  const deadline = deadlineFor(order);
  const common = {
    id: `fallback-order:${order.id}`,
    type: 'order',
    orderId: order.id,
    subtitle: [order.fullName || order.company || order.email, order.format].filter(Boolean).join(' · '),
    deadline: iso(deadline),
    canAct: true,
    href: `/studio/clients#${encodeURIComponent(order.id)}`,
  };

  if (order.status === 'studio_date_confirmation_pending') return {
    ...common,
    severity: isLate(deadline) ? 'critical' : 'warning',
    title: order.filmingAt ? 'Date studio à valider' : 'Date studio manquante',
    reason: order.filmingAt ? 'Une date est enregistrée, mais sa validation automatique doit être contrôlée.' : 'Le dossier ne peut pas avancer sans date de passage.',
    consequence: 'Le dossier client s’ouvrira sur l’information à vérifier.',
    inaction: 'Le client restera bloqué à cette étape.',
    actionLabel: 'Ouvrir le dossier',
  };

  if (order.status === 'preparation_complete' && !validDate(order.filmingAt)) return {
    ...common,
    severity: 'warning',
    title: 'Passage studio à planifier',
    reason: 'La préparation est terminée, mais aucune date exploitable n’est enregistrée.',
    consequence: 'Vous pourrez ajouter la date manquante dans le dossier.',
    inaction: 'Le parcours restera bloqué avant le tournage.',
    actionLabel: 'Ajouter la date',
  };

  if (['filming_scheduled','filming_confirmed'].includes(order.status)) {
    const filming = safeDate(order.filmingAt);
    if (filming && filming.getTime() <= Date.now() + 15 * 60 * 1000) return {
      ...common,
      severity: filming.getTime() < Date.now() - DAY ? 'critical' : 'warning',
      title: 'Passage à confirmer',
      reason: 'Le créneau de tournage est arrivé à échéance et nécessite une confirmation humaine.',
      consequence: 'Le dossier s’ouvrira pour confirmer la réalité du tournage.',
      inaction: 'La production et les délais de livraison ne démarreront pas.',
      actionLabel: 'Vérifier le passage',
    };
  }

  if (order.status === 'videos_pending' && isLate(deadline)) return {
    ...common,
    severity: 'critical',
    title: 'Vidéos non reçues dans le délai',
    reason: 'Le délai prévu après le tournage est dépassé.',
    consequence: 'Le dossier s’ouvrira pour contrôler la réception ou déposer les fichiers.',
    inaction: 'Le retard de livraison continuera.',
    actionLabel: 'Vérifier la réception',
  };

  if (order.status === 'videos_received') return {
    ...common,
    severity: 'warning',
    title: 'Traitement vidéo à démarrer',
    reason: 'Des fichiers sont disponibles, mais le traitement n’est pas encore confirmé.',
    consequence: 'Le dossier s’ouvrira pour vérifier les contenus avant le traitement.',
    inaction: 'La livraison client n’avancera pas.',
    actionLabel: 'Vérifier les contenus',
  };

  if (['editing','approval'].includes(order.status) && isLate(deadline)) return {
    ...common,
    severity: 'critical',
    title: 'Livraison à contrôler',
    reason: 'Le délai de livraison calculé est dépassé.',
    consequence: 'Le dossier s’ouvrira pour déposer ou vérifier la livraison finale.',
    inaction: 'Le client restera sans livraison.',
    actionLabel: 'Vérifier la livraison',
  };
  return null;
}

function supplierFallbackAction(payment) {
  const deadline = safeDate(payment.dueAt);
  return {
    id: `supplier:${payment.id}`,
    type: 'supplier',
    paymentId: payment.id,
    severity: isLate(deadline) ? 'critical' : 'warning',
    title: 'Paiement fournisseur à confirmer',
    subtitle: [payment.fullName || payment.company, payment.title].filter(Boolean).join(' · '),
    reason: `${money(payment.amountTotal, payment.currency)} est enregistré comme dû.`,
    consequence: 'Le paiement sera marqué comme effectué.',
    inaction: 'La dette restera affichée comme impayée.',
    actionKey: 'pay_supplier',
    actionLabel: 'Marquer payé',
    deadline: iso(deadline),
    canAct: true,
  };
}

function refundFallbackAction(item) {
  return {
    id: `refund:${item.id}`,
    type: 'administrative',
    severity: 'warning',
    title: 'Remboursement à décider',
    subtitle: [item.fullName, item.title].filter(Boolean).join(' · '),
    reason: item.reason || 'Une décision humaine est nécessaire.',
    consequence: 'La demande s’ouvrira dans l’administration financière.',
    inaction: 'La demande restera en attente.',
    href: '/studio/advanced.html#finances',
    actionLabel: 'Décider',
    deadline: item.requestedAt || null,
    canAct: true,
  };
}

function deletionFallbackAction(item) {
  return {
    id: `deletion:${item.id}`,
    type: 'administrative',
    severity: 'warning',
    title: 'Suppression de compte à vérifier',
    subtitle: item.fullName || item.company || item.email || 'Client Neptune Media',
    reason: item.note || 'Une demande doit être vérifiée avant exécution.',
    consequence: 'La demande s’ouvrira dans les réglages avancés.',
    inaction: 'La demande restera en attente.',
    href: '/studio/advanced.html#finances',
    actionLabel: 'Vérifier',
    deadline: item.requestedAt || null,
    canAct: true,
  };
}

function fallbackUpcoming(orders) {
  const now = Date.now();
  return orders.flatMap((order) => [
    validDate(order.appointmentAt) ? { type: 'Préparation', at: order.appointmentAt, order } : null,
    validDate(order.filmingAt) ? { type: 'Passage studio', at: order.filmingAt, order } : null,
  ].filter(Boolean))
    .filter((item) => new Date(item.at).getTime() >= now)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 6)
    .map((item) => ({
      type: item.type,
      at: item.at,
      orderId: item.order.id,
      client: item.order.fullName || item.order.company || item.order.email || 'Client Neptune Media',
      format: item.order.format || '',
    }));
}

function fallbackHealth(env, primaryStatus, primaryError) {
  return [
    health('database', 'Base clients', 'ok', 'Les données clients restent accessibles par le parcours de secours.'),
    health('control_engine', 'Moteur automatique', 'error', `Le diagnostic principal a échoué (${primaryStatus} · ${primaryError}). Le Studio fonctionne en mode sécurisé.`),
    health('email', 'E-mails Resend', env.RESEND_API_KEY ? 'ok' : 'error', env.RESEND_API_KEY ? 'Configuration présente.' : 'Clé RESEND_API_KEY absente.'),
    health('storage', 'Stockage médias', env.MEDIA ? 'ok' : 'error', env.MEDIA ? 'Binding R2 présent.' : 'Binding R2 absent.'),
    health('ai', 'Neptune IA', env.AI ? 'ok' : 'warning', env.AI ? 'Binding Workers AI présent.' : 'Workers AI non configuré.'),
  ];
}

function deadlineFor(order) {
  const base = safeDate(order.updatedAt) || safeDate(order.createdAt) || new Date();
  if (order.status === 'studio_date_confirmation_pending') return new Date(base.getTime() + 48 * 60 * 60 * 1000);
  if (order.status === 'videos_pending') return new Date((safeDate(order.filmingAt) || base).getTime() + 7 * DAY);
  if (['videos_received','editing','approval'].includes(order.status)) return new Date((safeDate(order.filmingAt) || base).getTime() + 15 * DAY);
  if (['preparation_complete','filming_scheduled','filming_confirmed'].includes(order.status)) return safeDate(order.filmingAt);
  return null;
}

function isWatching(order) {
  const deadline = deadlineFor(order);
  if (!deadline) return false;
  const distance = deadline.getTime() - Date.now();
  return distance >= 0 && distance < 7 * DAY;
}

function sortActions(a, b) {
  return severityRank(a.severity) - severityRank(b.severity) || dateRank(a.deadline) - dateRank(b.deadline);
}
function severityRank(value) { return value === 'critical' ? 0 : value === 'warning' ? 1 : 2; }
function dateRank(value) { return safeDate(value)?.getTime() ?? Number.MAX_SAFE_INTEGER; }
function safeDate(value) { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? null : date; }
function validDate(value) { return Boolean(safeDate(value)); }
function iso(value) { return value && !Number.isNaN(value.getTime()) ? value.toISOString() : null; }
function isLate(value) { return Boolean(value && value.getTime() < Date.now()); }
function money(cents, currency = 'eur') {
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(currency || 'eur').toUpperCase() }).format(Number(cents || 0) / 100); }
  catch { return `${(Number(cents || 0) / 100).toFixed(2)} €`; }
}
function health(id, label, level, detail) { return { id, label, level, detail }; }
function safeError(error) { return { name: error?.name || 'Error', message: String(error?.message || error || 'unknown').slice(0, 500) }; }

async function callStore(studio, path, body) {
  return studio.fetch(`https://store${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders())) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
