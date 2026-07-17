const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let csrfToken = sessionStorage.getItem('neptune_csrf') || '';
let state = { clients: [], orders: [] };

$('#newOrder').addEventListener('submit', createOrder);
$('#refresh').addEventListener('click', load);
$('#search').addEventListener('input', filterOrders);

load();

async function load() {
  $('#orders').innerHTML = '<p class="loading">Chargement des comptes clients…</p>';
  try {
    const auth = await api('/api/auth/status', {}, false);
    csrfToken = auth.csrfToken || csrfToken;
    sessionStorage.setItem('neptune_csrf', csrfToken);
    state = await api('/api/admin/clients');
    render();
  } catch (error) {
    if (error.message === 'unauthorized' || error.message === 'http_401') {
      location.href = '/studio/';
      return;
    }
    $('#orders').innerHTML = `<p class="empty">${escapeHtml(humanError(error.message))}</p>`;
  }
}

async function createOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  const message = $('#formMessage');
  const data = new FormData(form);
  const payload = {
    email: data.get('email'),
    fullName: data.get('fullName'),
    company: data.get('company'),
    title: data.get('title'),
    format: data.get('format'),
    productCode: data.get('productCode'),
    amountTotal: Math.round(Number(data.get('amountEuros') || 0) * 100),
    currency: 'eur',
    appointmentAt: localToIso(data.get('appointmentAt')),
    preparationUrl: data.get('preparationUrl'),
    nextAction: data.get('nextAction'),
    sendEmail: data.get('sendEmail') === 'on',
  };
  button.disabled = true;
  setMessage(message, 'Création du compte et du passage…');
  try {
    const result = await api('/api/admin/client-order', { method: 'POST', body: JSON.stringify(payload) });
    setMessage(
      message,
      result.warning
        ? `Passage créé. Avertissement e-mail : ${humanError(result.warning)}`
        : 'Passage créé et accès client préparé.',
      result.warning ? 'error' : 'success',
    );
    form.reset();
    form.elements.title.value = 'Passage Neptune Media';
    form.elements.nextAction.value = 'Choisir ou confirmer votre rendez-vous';
    form.elements.sendEmail.checked = true;
    await load();
  } catch (error) {
    setMessage(message, humanError(error.message), 'error');
  } finally {
    button.disabled = false;
  }
}

function render() {
  const clients = Array.isArray(state.clients) ? state.clients : [];
  const orders = Array.isArray(state.orders) ? state.orders : [];
  $('#clientCount').textContent = String(clients.length);
  $('#orderCount').textContent = String(orders.length);
  $('#activeCount').textContent = String(orders.filter((order) => !['completed', 'delivered'].includes(order.status)).length);

  const container = $('#orders');
  container.innerHTML = '';
  if (!orders.length) {
    container.innerHTML = '<p class="empty">Aucun compte client pour le moment.</p>';
    return;
  }

  const template = $('#orderTemplate');
  for (const order of orders) {
    const fragment = template.content.cloneNode(true);
    const article = $('.order', fragment);
    article.dataset.search = [order.email, order.fullName, order.company, order.title, order.format].join(' ').toLowerCase();
    $('.client-line', article).textContent = [order.fullName || order.email, order.company].filter(Boolean).join(' · ');
    $('h3', article).textContent = order.title || 'Passage Neptune Media';
    $('.meta', article).textContent = [
      order.email,
      order.format,
      order.amountTotal ? formatMoney(order.amountTotal, order.currency) : '',
      order.createdAt ? `créé le ${formatDate(order.createdAt)}` : '',
    ].filter(Boolean).join(' · ');

    const updateForm = $('.update-form', article);
    updateForm.elements.orderId.value = order.id;
    updateForm.elements.status.value = order.status || 'reservation_confirmed';
    updateForm.elements.appointmentAt.value = isoToLocal(order.appointmentAt);
    updateForm.elements.filmingAt.value = isoToLocal(order.filmingAt);
    updateForm.elements.nextAction.value = order.nextAction || '';
    updateForm.elements.preparationUrl.value = order.preparationUrl || '';
    updateForm.addEventListener('submit', updateOrder);

    const fileForm = $('.file-form', article);
    fileForm.elements.orderId.value = order.id;
    fileForm.addEventListener('submit', addFile);

    $('.send-access', article).addEventListener('click', () => sendAccess(order.email, article));
    container.append(fragment);
  }
  filterOrders();
}

async function updateOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const article = form.closest('.order');
  const button = $('button[type="submit"]', form);
  const data = new FormData(form);
  button.disabled = true;
  setOrderMessage(article, 'Mise à jour du parcours…');
  try {
    await api('/api/admin/client-update', {
      method: 'POST',
      body: JSON.stringify({
        orderId: data.get('orderId'),
        status: data.get('status'),
        appointmentAt: localToIso(data.get('appointmentAt')),
        filmingAt: localToIso(data.get('filmingAt')),
        nextAction: data.get('nextAction'),
        preparationUrl: data.get('preparationUrl'),
      }),
    });
    setOrderMessage(article, 'Suivi client mis à jour.', 'success');
    await load();
  } catch (error) {
    setOrderMessage(article, humanError(error.message), 'error');
  } finally {
    button.disabled = false;
  }
}

async function addFile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const article = form.closest('.order');
  const button = $('button[type="submit"]', form);
  const data = new FormData(form);
  const locationValue = String(data.get('fileLocation') || '').trim();
  const payload = {
    orderId: data.get('orderId'),
    name: data.get('name'),
    fileType: data.get('fileType'),
    sizeLabel: data.get('sizeLabel'),
    externalUrl: /^https?:\/\//iu.test(locationValue) ? locationValue : '',
    storageKey: /^https?:\/\//iu.test(locationValue) ? '' : locationValue,
  };
  button.disabled = true;
  setOrderMessage(article, 'Ajout du livrable…');
  try {
    await api('/api/admin/client-file', { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    form.elements.orderId.value = payload.orderId;
    setOrderMessage(article, 'Livrable rendu disponible dans l’espace client.', 'success');
  } catch (error) {
    setOrderMessage(article, humanError(error.message), 'error');
  } finally {
    button.disabled = false;
  }
}

async function sendAccess(email, article) {
  const button = $('.send-access', article);
  button.disabled = true;
  setOrderMessage(article, 'Envoi de l’accès…');
  try {
    await api('/api/admin/client-send-access', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setOrderMessage(article, `Accès envoyé à ${email}.`, 'success');
  } catch (error) {
    setOrderMessage(article, humanError(error.message), 'error');
  } finally {
    button.disabled = false;
  }
}

function filterOrders() {
  const query = String($('#search').value || '').trim().toLowerCase();
  $$('.order').forEach((order) => { order.hidden = Boolean(query) && !order.dataset.search.includes(query); });
}

async function api(url, options = {}, includeCsrf = true) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (includeCsrf) headers['X-CSRF-Token'] = csrfToken;
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `http_${response.status}`);
  return data;
}

function setMessage(element, text, type = '') {
  element.textContent = text;
  element.className = `message${type ? ` ${type}` : ''}`;
}
function setOrderMessage(article, text, type = '') { setMessage($('.order-message', article), text, type); }
function localToIso(value) { return value ? new Date(value).toISOString() : null; }
function isoToLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}
function formatMoney(cents, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: String(currency || 'eur').toUpperCase() }).format(Number(cents || 0) / 100);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function humanError(code) {
  return ({
    unauthorized: 'Reconnectez-vous au Studio administrateur.',
    csrf_failed: 'Votre session de sécurité a expiré. Rechargez la page.',
    invalid_order: 'Les informations de commande sont incomplètes.',
    payment_not_confirmed: 'Le paiement n’est pas confirmé.',
    order_not_found: 'Ce passage est introuvable.',
    invalid_file: 'Indiquez un nom de fichier et une URL ou une clé R2 valide.',
    client_not_found: 'Ce client est introuvable.',
    email_service_not_configured: 'La clé Resend doit être configurée dans Cloudflare.',
    email_send_failed: 'L’e-mail n’a pas pu être envoyé. Vérifiez le domaine expéditeur Resend.',
  })[code] || 'Une erreur est survenue. Réessayez.';
}
