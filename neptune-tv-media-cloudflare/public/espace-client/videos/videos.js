const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const VIDEO_TYPES = new Set(['final', 'emission', 'full', 'short', 'shorts', 'reel', 'teaser', 'rushes', 'rush']);
const FINAL_TYPES = new Set(['final', 'emission', 'full']);
const SHORT_TYPES = new Set(['short', 'shorts', 'reel', 'teaser']);

let orders = [];
let items = [];
let activeFilter = 'final';

$('#filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter === 'short' ? 'short' : 'final';
  $$('[data-filter]').forEach((entry) => {
    const active = entry === button;
    entry.classList.toggle('active', active);
    entry.setAttribute('aria-pressed', String(active));
  });
  renderPassages();
});

load();

async function load() {
  try {
    const state = await api('/api/client/session');
    orders = (Array.isArray(state.orders) ? state.orders : [])
      .map(normalizeOrder)
      .sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
    items = orders.flatMap((order) => order.files);
    renderSummary();
    renderPassages();
  } catch (error) {
    if (['unauthorized', 'http_401'].includes(error.message)) {
      location.href = '/espace-client/';
      return;
    }
    $('#resultLabel').textContent = 'Impossible de charger votre bibliothèque.';
    $('#contentGrid').innerHTML = '<div class="empty-state"><div><strong>Bibliothèque indisponible</strong>Rechargez la page ou revenez au tableau de bord.</div></div>';
  }
}

function normalizeOrder(order) {
  const files = (order.files || []).map((file) => ({
    ...file,
    orderId: order.id,
    orderTitle: order.title || 'Passage Neptune Media',
    orderFormat: order.format || '',
    filmingAt: order.filmingAt || '',
  }));
  return { ...order, files };
}

function renderSummary() {
  const videoItems = items.filter((item) => ['final', 'short'].includes(categoryOf(item)));
  $('#contentCount').textContent = videoItems.length;
  $('#shortCount').textContent = videoItems.filter((item) => categoryOf(item) === 'short').length;
  $('#projectCount').textContent = orders.length;
}

function renderPassages() {
  const passages = orders
    .map((order) => ({ order, visible: order.files.filter((file) => categoryOf(file) === activeFilter) }))
    .filter((entry) => entry.visible.length);
  const visibleCount = passages.reduce((total, entry) => total + entry.visible.length, 0);
  const label = activeFilter === 'final' ? 'émission' : 'short';

  $('#contentGrid').dataset.view = activeFilter;
  $('#resultLabel').textContent = visibleCount
    ? `${passages.length} passage${passages.length > 1 ? 's' : ''} · ${visibleCount} ${label}${visibleCount > 1 ? 's' : ''}`
    : `Aucun ${label} disponible pour le moment`;

  $('#contentGrid').innerHTML = passages.length
    ? passages.map((entry, index) => passageMarkup(entry.order, entry.visible, index)).join('')
    : `<div class="empty-state"><div><strong>${activeFilter === 'final' ? 'Aucune émission livrée' : 'Aucun short livré'}</strong>Les vidéos apparaîtront automatiquement ici après leur livraison par Neptune.</div></div>`;
}

function passageMarkup(order, visibleFiles, index) {
  const longCount = order.files.filter((file) => categoryOf(file) === 'final').length;
  const shortCount = order.files.filter((file) => categoryOf(file) === 'short').length;
  const dateValue = order.filmingAt || order.createdAt || visibleFiles[0]?.createdAt;
  const title = order.title || `Passage ${index + 1}`;
  const format = order.format || 'Format Neptune Media';
  const countSummary = `${longCount} émission${longCount > 1 ? 's' : ''} · ${shortCount} short${shortCount > 1 ? 's' : ''}`;

  return `<article class="passage-box">
    <header class="passage-head">
      <div class="passage-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="passage-title"><span>${esc(format)}</span><h3>${esc(title)}</h3><p>${esc(countSummary)}</p></div>
      <time>${esc(formatDate(dateValue))}</time>
    </header>
    <div class="passage-media-grid passage-media-grid--${activeFilter}">${visibleFiles.map(cardMarkup).join('')}</div>
  </article>`;
}

function cardMarkup(item) {
  const url = safeUrl(item.downloadUrl);
  const category = categoryOf(item);
  const preview = isVideo(item)
    ? `<video controls playsinline preload="metadata" src="${esc(url)}" aria-label="${esc(cleanName(item.name) || 'Vidéo Neptune Media')}"></video>`
    : `<div class="file-placeholder"><span>▶</span></div>`;
  const calendarAction = category === 'short'
    ? '<a class="calendar-link" href="/espace-client/calendrier/">Planifier</a>'
    : '';

  return `<article class="media-card media-card--${category}">
    <div class="media-preview">${preview}</div>
    <div class="media-body">
      <div class="media-topline"><span class="type-pill">${esc(labelFor(item))}</span><span class="media-date">${esc(formatDate(item.createdAt))}</span></div>
      <h4>${esc(cleanName(item.name) || (category === 'final' ? 'Émission complète' : 'Short Neptune Media'))}</h4>
      ${item.sizeLabel ? `<p>${esc(item.sizeLabel)}</p>` : ''}
      <div class="media-actions"><a class="download" href="${esc(url)}" download>Télécharger</a>${calendarAction}</div>
    </div>
  </article>`;
}

function categoryOf(item) {
  const type = typeOf(item);
  if (SHORT_TYPES.has(type)) return 'short';
  if (FINAL_TYPES.has(type)) return 'final';
  if (['rush', 'rushes'].includes(type)) return 'other';
  return isVideo(item) ? 'final' : 'other';
}

function typeOf(item) {
  return String(item.fileType || 'livrable').trim().toLowerCase();
}

function isVideo(item) {
  return VIDEO_TYPES.has(typeOf(item)) || /\.(mp4|webm|mov|m4v)(\?|$)/iu.test(String(item.name || item.downloadUrl || ''));
}

function labelFor(item) {
  return categoryOf(item) === 'short' ? 'Short / Reel' : 'Émission complète';
}

function cleanName(value) {
  return String(value || '')
    .replace(/\.[a-z0-9]{2,5}$/iu, '')
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function orderTimestamp(order) {
  const date = new Date(order.filmingAt || order.updatedAt || order.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime())
    ? 'Date à confirmer'
    : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function safeUrl(value) {
  const text = String(value || '');
  return /^(https?:\/\/|\/)/iu.test(text) ? text : '#';
}

async function api(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `http_${response.status}`);
  return payload;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}