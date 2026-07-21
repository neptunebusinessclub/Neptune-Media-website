const STATUS = {
  payment_confirmed: 'Paiement reçu',
  reservation_confirmed: 'Rendez-vous à réserver',
  preparation_booking_pending: 'Rendez-vous à réserver',
  appointment_confirmed: 'Préparation réservée',
  appointment_booked: 'Préparation réservée',
  preparation: 'Préparation en cours',
  studio_date_confirmation_pending: 'Date studio à confirmer',
  preparation_complete: 'Préparation terminée',
  filming_scheduled: 'Passage confirmé',
  filming_confirmed: 'Passage confirmé',
  filmed: 'Passage réalisé',
  videos_pending: 'Vidéos du studio attendues',
  videos_received: 'Vidéos reçues',
  editing: 'Montage en cours',
  approval: 'Validation en cours',
  delivered: 'Vidéos livrées',
  completed: 'Projet terminé',
};

const STAGES = [
  ['Réservation', new Set(['payment_confirmed', 'reservation_confirmed', 'preparation_booking_pending'])],
  ['Préparation', new Set(['appointment_confirmed', 'appointment_booked', 'preparation', 'studio_date_confirmation_pending', 'preparation_complete'])],
  ['Tournage', new Set(['filming_scheduled', 'filming_confirmed', 'filmed'])],
  ['Montage', new Set(['videos_pending', 'videos_received', 'editing'])],
  ['Validation', new Set(['approval'])],
  ['Livraison', new Set(['delivered', 'completed'])],
];

const POST_FILMING = new Set(['filmed', 'videos_pending', 'videos_received', 'editing', 'approval']);
const COMPLETE = new Set(['delivered', 'completed']);
const $ = (selector, root = document) => root.querySelector(selector);

let refreshTimer = 0;
let lastOrder = null;
let ordersCache = [];

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init, { once: true })
  : init();

function init() {
  correctSocialLinks();
  installLogoutIcon();
  const dashboard = $('#dashboard');
  if (!dashboard) return;

  const observer = new MutationObserver(() => {
    if (!dashboard.hidden) hydrate();
  });
  observer.observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });

  document.addEventListener('click', (event) => {
    const selector = event.target.closest('[data-order-id]');
    if (!selector) return;
    const selected = ordersCache.find((order) => order.id === selector.dataset.orderId);
    if (!selected) return;
    lastOrder = selected;
    requestAnimationFrame(() => renderProject(lastOrder));
  });

  if (!dashboard.hidden) hydrate();
}

function installLogoutIcon() {
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m14 16 4-4-4-4"/><path d="M18 12H9"/></svg>';
  });
}

async function hydrate() {
  clearTimeout(refreshTimer);
  try {
    const response = await fetch('/api/client/session', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) return;
    const state = await response.json();
    ordersCache = Array.isArray(state.orders) ? state.orders : [];
    lastOrder = ordersCache.find((order) => order.status !== 'completed') || ordersCache[0] || null;
    renderProject(lastOrder);
    scheduleRefresh();
  } catch {
    // Le tableau de bord principal reste utilisable si cette amélioration ne peut pas se charger.
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    renderProject(lastOrder);
    scheduleRefresh();
  }, 60_000);
}

function renderProject(order) {
  const phase = $('#projectPhaseValue');
  const studioDate = $('#studioDateValue');
  const studioTime = $('#studioTimeValue');
  const deadlineCard = $('#projectDeadlineCard');
  const deadlineLabel = $('#deadlineLabel');
  const deadlineValue = $('#deadlineValue');
  const deadlineDate = $('#deadlineDateValue');
  const nextAction = $('#projectNextAction');
  const title = $('#countdownText');
  const badge = $('#passageBadge');

  if (!order) {
    setText(phase, 'Aucun projet actif');
    setText(studioDate, 'À planifier');
    setText(studioTime, 'Réservez votre prochain passage');
    setText(deadlineLabel, 'Échéance');
    setText(deadlineValue, '—');
    setText(deadlineDate, 'Aucune date définie');
    setText(nextAction, 'Choisissez un format et un créneau pour lancer votre prochain projet.');
    updateProgress(0);
    return;
  }

  const stageIndex = stageFor(order.status);
  const status = STATUS[order.status] || 'Projet en cours';
  setText(phase, STAGES[stageIndex][0]);
  setText(title, status);
  setText(badge, status);
  setText(nextAction, order.nextAction || 'Consultez votre suivi pour connaître la prochaine action.');

  const filming = parseDate(order.filmingAt);
  if (filming) {
    setText(studioDate, formatDate(filming));
    setText(studioTime, formatTime(filming));
  } else {
    setText(studioDate, 'À confirmer');
    setText(studioTime, 'La date apparaîtra dès sa validation');
  }

  const deadline = resolveDeadline(order, filming);
  renderDeadline(deadlineCard, deadlineLabel, deadlineValue, deadlineDate, deadline);
  updateProgress(stageIndex);
}

function resolveDeadline(order, filming) {
  if (COMPLETE.has(order.status)) {
    return { label: 'Projet', value: 'Terminé', detail: 'Vos livrables sont disponibles', urgent: false };
  }

  let target = null;
  let label = 'Temps avant le passage';
  if (filming && POST_FILMING.has(order.status)) {
    target = new Date(filming.getTime() + 15 * 86_400_000);
    label = 'Livraison cible';
  } else if (filming) {
    target = filming;
  }

  if (!target) return { label: 'Échéance', value: 'À confirmer', detail: 'Aucune deadline définie', urgent: false };

  const milliseconds = target.getTime() - Date.now();
  const hours = Math.ceil(milliseconds / 3_600_000);
  const days = Math.ceil(milliseconds / 86_400_000);
  const urgent = milliseconds > 0 && hours <= 48;
  let value = '';

  if (milliseconds < 0) value = 'Échéance passée';
  else if (hours <= 24) value = hours <= 1 ? 'Moins d’1 h' : `${hours} h`;
  else value = `J-${days}`;

  return {
    label,
    value,
    detail: `${formatDate(target)} · ${formatTime(target)}`,
    urgent,
  };
}

function renderDeadline(card, label, value, detail, deadline) {
  setText(label, deadline.label);
  setText(value, deadline.value);
  setText(detail, deadline.detail);
  card?.classList.toggle('is-urgent', deadline.urgent);
}

function updateProgress(activeIndex) {
  const safeIndex = Math.min(STAGES.length - 1, Math.max(0, activeIndex));
  const fill = $('#projectProgressFill');
  const label = $('#projectProgressLabel');
  if (fill) fill.style.width = `${(safeIndex / (STAGES.length - 1)) * 100}%`;
  setText(label, `${safeIndex + 1} sur ${STAGES.length}`);

  document.querySelectorAll('[data-project-stage]').forEach((item, index) => {
    item.dataset.state = index < safeIndex ? 'done' : index === safeIndex ? 'current' : 'upcoming';
  });
}

function stageFor(status) {
  const found = STAGES.findIndex(([, statuses]) => statuses.has(status));
  return found >= 0 ? found : 0;
}

function correctSocialLinks() {
  const links = {
    '.social-tiktok': 'https://www.tiktok.com/@neptunebusiness',
    '.social-instagram': 'https://www.instagram.com/neptunebusiness/',
    '.social-linkedin': 'https://fr.linkedin.com/company/neptune-business',
    '.social-youtube': 'https://www.youtube.com/@neptunebusiness',
  };
  Object.entries(links).forEach(([selector, url]) => {
    document.querySelectorAll(selector).forEach((link) => { link.href = url; });
  });
  document.querySelectorAll('a[href*="youtube.com/results"]').forEach((link) => {
    link.href = 'https://www.youtube.com/@neptunebusiness';
  });
}

function parseDate(value) {
  const parsed = new Date(value || '');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  }).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  }).format(value);
}

function setText(element, value) {
  if (element) element.textContent = value;
}