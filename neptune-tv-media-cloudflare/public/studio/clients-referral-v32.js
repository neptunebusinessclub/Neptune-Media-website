let referralState = { referrals: [], rewards: [] };
let renderQueued = false;

installStyles();
loadReferrals();

const detail = document.querySelector('#clientDetail');
const pipeline = document.querySelector('#pipeline');
if (detail) new MutationObserver(queueRender).observe(detail, { childList: true, subtree: true });
if (pipeline) new MutationObserver(queueRender).observe(pipeline, { childList: true, subtree: true });
window.addEventListener('hashchange', queueRender);

async function loadReferrals() {
  try {
    const response = await fetch('/api/admin/client-referrals', {
      headers: { Accept: 'application/json', 'X-CSRF-Token': sessionStorage.getItem('neptune_csrf') || '' },
      credentials: 'same-origin',
    });
    if (!response.ok) return;
    const data = await response.json();
    referralState = {
      referrals: Array.isArray(data.referrals) ? data.referrals : [],
      rewards: Array.isArray(data.rewards) ? data.rewards : [],
    };
    queueRender();
  } catch {
    // Le workflow principal reste disponible si les données de recommandation sont indisponibles.
  }
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderCues();
  });
}

function renderCues() {
  const orderId = decodeURIComponent(location.hash.slice(1) || '');
  const referral = referralState.referrals.find((item) => item.orderId === orderId);
  document.querySelectorAll('[data-order-card]').forEach((card) => {
    const match = referralState.referrals.find((item) => item.orderId === card.dataset.orderCard);
    card.classList.toggle('has-referral-cue', Boolean(match));
    const badge = card.querySelector('.referral-card-badge');
    if (match && !badge) {
      const nextBadge = document.createElement('span');
      nextBadge.className = 'referral-card-badge';
      nextBadge.textContent = `Recommandé par ${match.referrerCompany || match.referrerName || match.referralCode || 'un client'}`;
      card.append(nextBadge);
    } else if (!match && badge) badge.remove();
  });

  if (!detail) return;
  const existingCue = detail.querySelector('.referral-production-cue');
  if (!referral) {
    existingCue?.remove();
    return;
  }
  if (existingCue?.dataset.orderId === orderId) return;
  existingCue?.remove();
  const anchor = detail.querySelector('.detail-title');
  if (!anchor) return;
  const identity = referral.referrerCompany || referral.referrerName || referral.referralIdentity || 'la personne ayant recommandé ce client';
  const contact = referral.referrerName && referral.referrerName !== identity ? ` · ${referral.referrerName}` : '';
  const cue = document.createElement('section');
  cue.className = 'referral-production-cue';
  cue.dataset.orderId = orderId;
  cue.innerHTML = `
    <div class="referral-cue-icon" aria-hidden="true">★</div>
    <div class="referral-cue-copy">
      <p>CONSIGNE MONTAGE OBLIGATOIRE · VIDÉO LONG FORMAT</p>
      <h3>Mise en avant de remerciement pour ${escapeHtml(identity)}${escapeHtml(contact)}</h3>
      <span>Réservation attribuée au lien entreprise <strong>${escapeHtml(referral.referralCode || '')}</strong>. Prévoir un carton, une mention orale ou une séquence de remerciement visible dans la version longue.</span>
      <blockquote>« Cette émission a été rendue possible grâce à la recommandation de ${escapeHtml(identity)}. Merci pour sa confiance. »</blockquote>
    </div>`;
  anchor.insertAdjacentElement('afterend', cue);
}

function installStyles() {
  if (document.querySelector('link[data-studio-referral-v32]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/studio/clients-referral-v32.css?v=1';
  link.dataset.studioReferralV32 = 'true';
  document.head.append(link);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
