import './clients-referral-v32.js?v=1';

const $ = (selector, root = document) => root.querySelector(selector);

const button = $('#feedbackView');
const dialog = $('#feedbackDialog');
const closeButton = $('#closeFeedback');
const list = $('#feedbackList');

if (button && dialog && list) {
  button.addEventListener('click', openFeedback);
  closeButton?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

async function openFeedback() {
  if (!dialog.open) dialog.showModal();
  list.innerHTML = '<div class="feedback-loading">Chargement des avis clients…</div>';
  button.disabled = true;
  try {
    const result = await api('/api/admin/client-feedback');
    const feedback = Array.isArray(result.feedback) ? result.feedback : [];
    button.dataset.count = String(feedback.length);
    list.innerHTML = feedbackMarkup(feedback);
  } catch (error) {
    if (['unauthorized', 'http_401'].includes(error.message)) {
      location.href = '/studio/';
      return;
    }
    list.innerHTML = `<div class="feedback-empty">${escapeHtml(errorText(error.message))}</div>`;
  } finally {
    button.disabled = false;
  }
}

function feedbackMarkup(feedback) {
  if (!feedback.length) {
    return '<div class="feedback-empty">Aucun avis reçu pour le moment.<br>La demande est envoyée automatiquement lorsqu’un projet passe en statut livré ou terminé.</div>';
  }

  const average = feedback.reduce((sum, item) => sum + Number(item.satisfaction || 0), 0) / feedback.length;
  const promoters = feedback.filter((item) => Number(item.satisfaction) >= 4).length;
  const recommenders = feedback.filter((item) => String(item.recommendTo || '').trim()).length;

  return `
    <section class="feedback-summary" aria-label="Synthèse des avis">
      <article><b>${average.toFixed(1).replace('.', ',')} / 5</b><span>Satisfaction moyenne</span></article>
      <article><b>${promoters}</b><span>Avis 4 ou 5</span></article>
      <article><b>${recommenders}</b><span>Recommandations renseignées</span></article>
    </section>
    <section class="feedback-list">
      ${feedback.map(feedbackCard).join('')}
    </section>`;
}

function feedbackCard(item) {
  const score = Math.min(5, Math.max(1, Number(item.satisfaction || 1)));
  const name = item.fullName || item.company || item.email || 'Client Neptune Media';
  const company = item.company && item.company !== name ? item.company : '';
  const project = [item.title, item.format].filter(Boolean).join(' · ') || 'Passage Neptune Media';
  const experience = String(item.experience || '').trim() || 'Aucun commentaire détaillé.';
  const recommendation = String(item.recommendTo || '').trim();

  return `
    <article class="feedback-result-card">
      <div class="feedback-score" aria-label="Note ${score} sur 5"><b>${score}</b><small>SUR 5</small></div>
      <div class="feedback-result-copy">
        <div class="feedback-result-top">
          <h3>${escapeHtml(name)}</h3>
          <span>${escapeHtml(formatDate(item.createdAt))}</span>
        </div>
        <p class="feedback-result-meta">${escapeHtml([company, project].filter(Boolean).join(' · '))}</p>
        <p class="feedback-answer">${escapeHtml(experience)}</p>
        ${recommendation ? `<div class="feedback-recommend"><b>À qui le client recommande Neptune Media</b>${escapeHtml(recommendation)}</div>` : ''}
      </div>
    </article>`;
}

async function api(url) {
  const csrfToken = sessionStorage.getItem('neptune_csrf') || '';
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    credentials: 'same-origin',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `http_${response.status}`);
  return data;
}

function formatDate(value) {
  const date = new Date(value || '');
  return Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function errorText(code) {
  return ({
    csrf_failed: 'La session de sécurité a expiré. Actualisez la page.',
    unauthorized: 'Votre session Studio a expiré.',
  })[code] || 'Les avis clients ne peuvent pas être chargés pour le moment.';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
