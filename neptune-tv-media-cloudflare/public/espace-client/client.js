const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const BOOKING = 'https://media.neptunebusiness.com';
const BILLING = 'https://billing.stripe.com/p/login/5kQeVdelvgXw5ps4ia73G00';
const STATUS = {
  payment_confirmed: 'Paiement reçu',
  reservation_confirmed: 'Rendez-vous à réserver',
  preparation_booking_pending: 'Rendez-vous à réserver',
  appointment_confirmed: 'Préparation réservée',
  appointment_booked: 'Préparation réservée',
  preparation: 'Préparation en cours',
  studio_date_confirmation_pending: 'Date en attente de confirmation',
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

let email = '';
let state = null;
let activeOrderId = '';

$('#accessForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('#codeStep').hidden ? await requestCode() : await verifyCode();
});
$('#changeEmail').addEventListener('click', reset);
$('#resendCode').addEventListener('click', requestCode);
$$('[data-logout]').forEach((button) => button.addEventListener('click', logout));
$$('[data-open-panel]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.openPanel)));
$('#closePanel').addEventListener('click', closePanel);
$('#detailBackdrop').addEventListener('click', closePanel);
$('#copyReferral').addEventListener('click', copyReferral);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('#detailPanel').hidden) closePanel();
});

const queryEmail = new URLSearchParams(location.search).get('email');
if (queryEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(queryEmail)) {
  email = queryEmail.trim().toLowerCase();
  $('#email').value = email;
  showCodeStep('Saisissez le code reçu. Si vous n’en avez pas encore, demandez-en un nouveau.');
}
load();

async function load() {
  try {
    state = await api('/api/client/session');
    render();
  } catch {
    showAuth();
  }
}

async function requestCode() {
  email = String($('#email').value || email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return message('Saisissez une adresse e-mail valide.', 'error');
  const button = $('#codeStep').hidden ? $('#sendCode') : $('#resendCode');
  button.disabled = true;
  message('Envoi du code sécurisé…');
  try {
    const result = await api('/api/client/request-code', { method: 'POST', body: JSON.stringify({ email }) });
    showCodeStep(`Code envoyé à ${maskEmail(email)}. Il expire dans 10 minutes.`);
    message(
      result.retryAfter
        ? `Un code valide a déjà été envoyé. Réessayez dans ${result.retryAfter} secondes.`
        : result.throttled
          ? 'La limite d’envoi a été atteinte. Utilisez le dernier code reçu.'
          : 'Consultez votre boîte de réception et vos courriers indésirables.',
      'success',
    );
    $('#code').focus();
  } catch (error) {
    message(errorText(error.message), 'error');
  } finally {
    button.disabled = false;
  }
}

async function verifyCode() {
  const code = String($('#code').value || '').replace(/\D/gu, '').slice(0, 6);
  if (code.length !== 6) return message('Le code doit contenir 6 chiffres.', 'error');
  const button = $('#verifyCode');
  button.disabled = true;
  message('Vérification…');
  try {
    await api('/api/client/verify-code', { method: 'POST', body: JSON.stringify({ email, code }) });
    history.replaceState({}, '', '/espace-client/');
    await load();
  } catch (error) {
    message(errorText(error.message), 'error');
    $('#code').select();
  } finally {
    button.disabled = false;
  }
}

function showCodeStep(hint = 'Le code à 6 chiffres est valable 10 minutes.') {
  $('#emailStep').hidden = true;
  $('#codeStep').hidden = false;
  $('#code').required = true;
  $('#codeHint').textContent = hint;
}

function reset() {
  email = '';
  $('#emailStep').hidden = false;
  $('#codeStep').hidden = true;
  $('#code').required = false;
  $('#code').value = '';
  history.replaceState({}, '', '/espace-client/');
  message('');
  $('#email').focus();
}

async function logout() {
  await api('/api/client/logout', { method: 'POST' }).catch(() => {});
  state = null;
  activeOrderId = '';
  closePanel();
  reset();
  showAuth();
}

function showAuth() {
  $('#publicHeader').hidden = false;
  $('#auth').hidden = false;
  $('#dashboard').hidden = true;
}

function render() {
  const { client, orders = [] } = state || {};
  if (!client) return showAuth();
  $('#publicHeader').hidden = true;
  $('#auth').hidden = true;
  $('#dashboard').hidden = false;

  if (!activeOrderId || !orders.some((order) => order.id === activeOrderId)) {
    activeOrderId = (orders.find((order) => order.status !== 'completed') || orders[0] || {}).id || '';
  }

  const firstName = String(client.fullName || '').trim().split(/\s+/u)[0];
  $('#welcome').textContent = `Bonjour${firstName ? ` ${firstName}` : ''}`;

  const order = currentOrder();
  renderCountdown(order);
  renderBadges();
  renderReferral();
  renderBroadcast();
  renderFormatHighlight(order);
}

function currentOrder() {
  const orders = state?.orders || [];
  return orders.find((order) => order.id === activeOrderId) || orders[0] || null;
}

function renderCountdown(order) {
  const text = $('#countdownText');
  const link = $('#prepareLink');
  link.onclick = null;

  if (!order) {
    text.textContent = 'Votre prochain passage vous attend';
    link.textContent = 'Réserver';
    link.href = BOOKING;
    return;
  }

  const filming = new Date(order.filmingAt || '');
  if (!Number.isNaN(filming.getTime()) && !['delivered', 'completed'].includes(order.status)) {
    const days = Math.ceil((filming - Date.now()) / 86400000);
    text.textContent = days > 1
      ? `${days} jours avant votre émission`
      : days === 1
        ? 'Demain, votre émission'
        : days === 0
          ? 'Aujourd’hui, votre émission'
          : STATUS[order.status] || 'Votre passage avance';
  } else {
    text.textContent = ['delivered', 'completed'].includes(order.status)
      ? 'Votre émission est disponible'
      : STATUS[order.status] || 'Votre passage avance';
  }

  if (order.preparationUrl && !['filmed', 'videos_pending', 'videos_received', 'editing', 'approval', 'delivered', 'completed'].includes(order.status)) {
    link.textContent = 'Me préparer';
    link.href = hrefRaw(order.preparationUrl);
  } else if (!order.appointmentAt) {
    link.textContent = 'Réserver mon rendez-vous';
    link.href = hrefRaw(order.bookingUrl || BOOKING);
  } else {
    link.textContent = 'Voir mon suivi';
    link.href = '#';
    link.onclick = (event) => {
      event.preventDefault();
      openPanel('tracking');
    };
  }
}

function renderBadges() {
  const orders = state?.orders || [];
  const files = orders.flatMap((order) => order.files || []);
  const schedules = orders.flatMap((order) => order.schedules || []);
  const order = currentOrder();
  const paid = orders.filter((item) => Number(item.amountTotal) > 0).length;

  $('#videoBadge').textContent = `${files.length} contenu${files.length > 1 ? 's' : ''}`;
  $('#publicationBadge').textContent = `${schedules.length} publication${schedules.length > 1 ? 's' : ''}`;
  $('#passageBadge').textContent = order ? STATUS[order.status] || 'Suivi' : 'Aucun passage';
  $('#appointmentBadge').textContent = order?.appointmentAt ? date(order.appointmentAt) : 'À réserver';
  $('#billingBadge').textContent = `${paid} facture${paid > 1 ? 's' : ''}`;

  $('[data-open-panel="appointments"]').setAttribute('aria-label', `Mes rendez-vous — ${$('#appointmentBadge').textContent}`);
  $('[data-open-panel="content"]').setAttribute('aria-label', `Mes vidéos — ${$('#videoBadge').textContent}`);
  $('[data-open-panel="tracking"]').setAttribute('aria-label', `Mes passages — ${$('#passageBadge').textContent}`);
  $('[data-open-panel="billing"]').setAttribute('aria-label', `Mes factures — ${$('#billingBadge').textContent}`);
  $('[data-open-panel="calendar"]').setAttribute('aria-label', `Mes publications — ${$('#publicationBadge').textContent}`);
}

function renderReferral() {
  const supplied = state?.client?.referralCode || state?.client?.referral_code || state?.client?.code;
  const seed = String(state?.client?.email || email || state?.client?.id || state?.client?.fullName || 'NEPTUNE');
  $('#referralCode').textContent = String(supplied || referralCode(seed)).toUpperCase();
}

function referralCode(seed) {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const base = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  const initials = String(state?.client?.fullName || 'NP')
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, 'N');
  return `${initials}${base}`;
}

async function copyReferral() {
  const code = $('#referralCode').textContent;
  try {
    await navigator.clipboard.writeText(code);
    toast(`Code ${code} copié.`);
  } catch {
    toast('Copiez le code affiché.', true);
  }
}

function renderBroadcast() {
  const files = (state?.orders || []).flatMap((order) => (order.files || []).map((file) => ({ ...file, order })));
  const final = files.find((file) => ['final', 'emission', 'full'].includes(String(file.fileType || '').toLowerCase()))
    || files.find((file) => /\.(mp4|webm|mov)(\?|$)/iu.test(file.downloadUrl || ''));
  const target = $('#broadcastPreview');
  if (final) {
    target.innerHTML = `<video controls preload="metadata" playsinline src="${href(final.downloadUrl)}" aria-label="${esc(final.name || 'Votre émission')}"></video>`;
  } else {
    target.innerHTML = '<span>▶</span><small>Votre émission apparaîtra ici</small>';
  }
}

function renderFormatHighlight(order) {
  const current = String(order?.format || '').toLowerCase();
  $$('.format-card').forEach((card) => {
    const isActive = current.includes(card.dataset.format);
    card.classList.toggle('active', isActive);
    if (isActive) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });
}

function openPanel(type) {
  const titles = {
    appointments: 'Mes rendez-vous',
    content: 'Mes vidéos',
    tracking: 'Mes passages',
    billing: 'Mes factures',
    calendar: 'Mes publications',
  };
  $('#detailTitle').textContent = titles[type] || 'Mon espace';
  $('#detailContent').innerHTML = type === 'appointments'
    ? appointmentsMarkup()
    : type === 'content'
      ? contentMarkup()
      : type === 'tracking'
        ? trackingMarkup()
        : type === 'billing'
          ? billingMarkup()
          : calendarMarkup();
  $('#detailBackdrop').hidden = false;
  $('#detailPanel').hidden = false;
  document.body.style.overflow = 'hidden';
  bindPanelActions();
  requestAnimationFrame(() => $('#detailContent').focus({ preventScroll: true }));
}

function closePanel() {
  $('#detailBackdrop').hidden = true;
  $('#detailPanel').hidden = true;
  document.body.style.overflow = '';
}

function bindPanelActions() {
  $$('[data-order-id]', $('#detailContent')).forEach((button) => button.addEventListener('click', () => {
    activeOrderId = button.dataset.orderId;
    render();
    openPanel('tracking');
  }));
  $$('[data-prepare-post]', $('#detailContent')).forEach((button) => button.addEventListener('click', () => preparePost(button.dataset.preparePost, button.dataset.fileId)));
  const deleteButton = $('#deleteAccount');
  if (deleteButton) deleteButton.addEventListener('click', requestDeletion);
}

function appointmentsMarkup() {
  const orders = state?.orders || [];
  return `<section class="detail-section"><p>Retrouvez vos rendez-vous de préparation et les prochaines actions associées.</p>${orders.length
    ? orders.map((order) => `<article class="appointment-card"><div><h3>${esc(order.title || 'Passage Neptune Media')}</h3><div class="detail-meta"><span>${order.format ? esc(order.format) : 'Format à confirmer'}</span><span>${order.appointmentAt ? dateTime(order.appointmentAt) : 'Rendez-vous à réserver'}</span></div></div>${order.appointmentAt
      ? order.preparationUrl
        ? `<a class="panel-action" href="${href(order.preparationUrl)}" target="_blank" rel="noopener">Préparer mon passage</a>`
        : '<span class="status-pill">Confirmé</span>'
      : `<a class="panel-action" href="${href(order.bookingUrl || BOOKING)}" target="_blank" rel="noopener">Réserver</a>`}</article>`).join('')
    : '<div class="empty-card">Aucun rendez-vous associé à votre compte.</div>'}</section>`;
}

function trackingMarkup() {
  const orders = state?.orders || [];
  if (!orders.length) return '<div class="empty-card">Aucun passage associé à votre compte.</div>';
  return `<section class="detail-section">${orders.map((order) => {
    const active = order.id === activeOrderId;
    return `<article class="order-card"><div><h3>${esc(order.title || 'Passage Neptune Media')}</h3><div class="detail-meta"><span>${esc(order.format || 'Format')}</span><span>${esc(STATUS[order.status] || 'En cours')}</span>${order.filmingAt ? `<span>Passage · ${date(order.filmingAt)}</span>` : ''}</div><div class="timeline">${(order.steps || []).map((step) => `<div class="timeline-step ${esc(step.state || 'pending')}"><i></i><div><b>${esc(step.label)}</b>${step.completedAt ? `<small>${dateTime(step.completedAt)}</small>` : ''}</div></div>`).join('')}</div></div>${active ? '<span class="status-pill">Passage affiché</span>' : `<button class="ghost-action" type="button" data-order-id="${esc(order.id)}">Afficher</button>`}</article>`;
  }).join('')}</section>`;
}

function contentMarkup() {
  const items = (state?.orders || []).flatMap((order) => (order.files || []).map((file) => ({ ...file, orderTitle: order.title })));
  return `<section class="detail-section"><p>Émissions complètes, rushs, shorts et documents livrés par Neptune Media.</p><div class="library">${items.length
    ? items.map((file) => `<article class="file-card"><span class="status-pill">${esc(fileLabel(file.fileType))}</span><strong>${esc(file.name || 'Contenu Neptune Media')}</strong><small>${esc(file.orderTitle || 'Neptune Media')}${file.sizeLabel ? ` · ${esc(file.sizeLabel)}` : ''}</small><a class="panel-action" href="${href(file.downloadUrl)}">Télécharger</a></article>`).join('')
    : '<div class="empty-card">Vos contenus apparaîtront ici dès leur livraison.</div>'}</div></section>`;
}

function calendarMarkup() {
  const schedules = (state?.orders || []).flatMap((order) => (order.schedules || []).map((item) => ({ ...item, files: order.files || [], orderTitle: order.title })));
  const month = schedules[0]?.publishAt ? new Date(schedules[0].publishAt) : new Date();
  return `<section class="detail-section"><p>${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(month)} · Cliquez sur « Préparer » pour copier la légende et télécharger le média.</p><div class="calendar-wrap">${calendar(month, schedules)}</div></section>`;
}

function calendar(monthDate, schedules) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const cells = [];
  for (let index = 0; index < offset; index += 1) cells.push('<div class="day"></div>');
  for (let day = 1; day <= last.getDate(); day += 1) {
    const entries = schedules.filter((item) => {
      const value = new Date(item.publishAt);
      return value.getFullYear() === first.getFullYear() && value.getMonth() === first.getMonth() && value.getDate() === day;
    });
    cells.push(`<div class="day"><span>${day}</span>${entries.map((entry) => {
      const file = entry.files.find((item) => item.id === entry.fileId);
      return `<div class="calendar-item"><strong>${esc(file?.name || entry.orderTitle || 'Contenu')}</strong><small>${esc(entry.network || 'Réseau à choisir')}</small><button type="button" data-prepare-post="${esc(entry.caption)}" data-file-id="${esc(entry.fileId)}">Préparer</button></div>`;
    }).join('')}</div>`);
  }
  return `<div class="calendar">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => `<div class="calendar-head">${day}</div>`).join('')}${cells.join('')}</div>`;
}

function billingMarkup() {
  const orders = state?.orders || [];
  const total = orders.reduce((sum, order) => sum + Number(order.amountTotal || 0), 0);
  const paid = orders.filter((order) => Number(order.amountTotal) > 0).length;
  const deletion = state?.deletionRequest;
  return `<section class="detail-section"><div class="billing-grid"><div class="billing-card"><b>${money(total, 'eur')}</b><span>Total des passages</span></div><div class="billing-card"><b>${paid}</b><span>Commande${paid > 1 ? 's' : ''} payée${paid > 1 ? 's' : ''}</span></div><div class="billing-card"><b>${deletion?.status === 'pending' ? 'En cours' : 'Actif'}</b><span>Statut du compte</span></div></div><p><a class="panel-action" href="${BILLING}" target="_blank" rel="noopener">Ouvrir mon portail Stripe</a></p><section class="danger-zone"><h3>Suppression du compte</h3>${deletion?.status === 'pending'
    ? `<p>Votre demande a été enregistrée le ${dateTime(deletion.requestedAt)}.</p>`
    : '<p>Neptune vérifiera les obligations légales de conservation avant toute suppression ou anonymisation.</p><button class="danger-button" id="deleteAccount" type="button">Demander la suppression</button>'}<p id="deleteMessage" class="message"></p></section></section>`;
}

async function requestDeletion() {
  if (!confirm('Confirmer la demande de suppression de votre compte Neptune Media ?')) return;
  const button = $('#deleteAccount');
  button.disabled = true;
  try {
    const result = await api('/api/client/delete-request', { method: 'POST', body: JSON.stringify({ note: 'Demande effectuée depuis l’espace client' }) });
    state.deletionRequest = result.request;
    toast('Demande de suppression enregistrée.');
    openPanel('billing');
  } catch (error) {
    const target = $('#deleteMessage');
    if (target) target.textContent = errorText(error.message);
    button.disabled = false;
  }
}

async function preparePost(caption, fileId) {
  try {
    await navigator.clipboard.writeText(caption || '');
    const file = (state?.orders || []).flatMap((order) => order.files || []).find((item) => item.id === fileId);
    if (file) location.href = file.downloadUrl;
    toast('Légende copiée et téléchargement lancé.');
  } catch {
    toast('Le téléchargement reste disponible dans Mes vidéos.', true);
  }
}

async function api(url, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `http_${response.status}`);
  return data;
}

function message(text, type = '') {
  $('#authMessage').textContent = text;
  $('#authMessage').className = `message${type ? ` ${type}` : ''}`;
}

function toast(text, error = false) {
  const element = $('#toast');
  element.textContent = text;
  element.className = `toast${error ? ' error' : ''}`;
  element.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.hidden = true; }, 3800);
}

function errorText(code) {
  return ({
    invalid_code: 'Saisissez les 6 chiffres reçus.',
    invalid_or_expired_code: 'Ce code est incorrect ou a expiré.',
    too_many_attempts: 'Trop de tentatives. Réessayez dans 15 minutes.',
    email_service_not_configured: 'Le service e-mail doit être configuré.',
    email_send_failed: 'L’e-mail n’a pas pu être envoyé. Contactez Neptune Media.',
    email_send_unconfirmed: 'L’envoi du code n’a pas été confirmé.',
    unauthorized: 'Votre session a expiré. Reconnectez-vous.',
  })[code] || 'Une erreur est survenue. Réessayez.';
}

function fileLabel(type) {
  return ({ final: 'Émission complète', rushes: 'Rushs', short: 'Short / Reel', shorts: 'Shorts', teaser: 'Teaser', document: 'Document' })[type] || 'Livrable';
}

function date(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date à confirmer' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsed);
}

function dateTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date à confirmer' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(parsed);
}

function money(value, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(currency).toUpperCase() }).format(Number(value || 0) / 100);
}

function maskEmail(value) {
  const [account, domain] = value.split('@');
  return `${account.slice(0, 2)}${'*'.repeat(Math.max(2, account.length - 2))}@${domain}`;
}

function href(value) { return esc(hrefRaw(value)); }
function hrefRaw(value) {
  const text = String(value || '');
  return /^(https?:\/\/|\/)/iu.test(text) ? text : '#';
}
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
