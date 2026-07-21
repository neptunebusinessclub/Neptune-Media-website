let referralState = { referrals: [], rewards: [] };

installStyles();
loadReferrals();

const detail = document.querySelector('#clientDetail');
const pipeline = document.querySelector('#pipeline');
if (detail) new MutationObserver(renderCues).observe(detail, { childList: true, subtree: true });
if (pipeline) new MutationObserver(renderCues).observe(pipeline, { childList: true, subtree: true });
window.addEventListener('hashchange', renderCues);

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
    renderCues();
  } catch {
    // Le workflow principal reste disponible si les données de recommandation sont indisponibles.
  }
}

function renderCues() {
  const orderId = decodeURIComponent(location.hash.slice(1) || '');
  const referral = referralState.referrals.find((item) => item.orderId === orderId);
  document.querySelectorAll('.referral-production-cue').forEach((node) => node.remove());
  document.querySelectorAll('[data-order-card]').forEach((card) => {
    card.classList.toggle('has-referral-cue', referralState.referrals.some((item) => item.orderId === card.dataset.orderCard));
    let badge = card.querySelector('.referral-card-badge');
    const match = referralState.referrals.find((item) => item.orderId === card.dataset.orderCard);
    if (match && !badge) {
      badge = document.createElement('span');
      badge.className = 'referral-card-badge';
      badge.textContent = 'Remerciement à intégrer';
      card.append(badge);
    } else if (!match && badge) badge.remove();
  });
  if (!referral || !detail) return;
  const anchor = detail.querySelector('.detail-title');
  if (!anchor) return;
  const name = referral.referrerName || referral.referrerCompany || 'la personne ayant recommandé ce client';
  const company = referral.referrerCompany && referral.referrerCompany !== name ? ` · ${referral.referrerCompany}` : '';
  const cue = document.createElement('section');
  cue.className = 'referral-production-cue';
  cue.innerHTML = `
    <div class="referral-cue-icon" aria-hidden="true">★</div>
    <div class="referral-cue-copy">
      <p>CONSIGNE MONTAGE OBLIGATOIRE · VIDÉO LONG FORMAT</p>
      <h3>Mise en avant de remerciement pour ${escapeHtml(name)}${escapeHtml(company)}</h3>
      <span>Cette réservation provient du lien de recommandation <strong>${escapeHtml(referral.referralCode || '')}</strong>. Prévoir un carton, une mention orale ou une séquence de remerciement visible dans la version longue.</span>
      <blockquote>« Cette émission a été rendue possible grâce à la recommandation de ${escapeHtml(name)}. Merci pour sa confiance. »</blockquote>
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
