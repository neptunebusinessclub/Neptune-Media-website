(() => {
  'use strict';

  const STORAGE_KEY = 'neptune_media_prospect_v1';
  const TUNNEL_HOST = 'media.neptunebusiness.com';
  const API_PATH = '/api/public/prospect/start';
  let pendingTarget = '';
  let modal = null;
  let lastFocus = null;

  document.addEventListener('click', onBookingClick, true);

  function onBookingClick(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.dataset.prospectBypass === 'true') return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.hostname !== TUNNEL_HOST) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    pendingTarget = url.toString();

    const saved = readSaved();
    if (saved?.token && saved?.expiresAt > Date.now() + 60_000) {
      goToTunnel(pendingTarget, saved.token);
      return;
    }
    openModal(saved?.contact || {});
  }

  function openModal(contact) {
    ensureModal();
    lastFocus = document.activeElement;
    fill('prospectFirstName', contact.firstName);
    fill('prospectLastName', contact.lastName);
    fill('prospectCompany', contact.company);
    fill('prospectEmail', contact.email);
    setMessage('');
    modal.hidden = false;
    document.documentElement.classList.add('prospect-modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      modal.querySelector('#prospectFirstName')?.focus({ preventScroll: true });
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('prospect-modal-open');
    setTimeout(() => { modal.hidden = true; }, 220);
    lastFocus?.focus?.({ preventScroll: true });
  }

  function ensureModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'prospect-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="prospect-modal__backdrop" data-prospect-close></div>
      <section class="prospect-modal__card" role="dialog" aria-modal="true" aria-labelledby="prospectTitle">
        <button class="prospect-modal__close" type="button" aria-label="Fermer" data-prospect-close>×</button>
        <div class="prospect-modal__eyebrow"><span></span> Votre passage commence ici</div>
        <h2 id="prospectTitle">Réservez sans créer de compte.</h2>
        <p class="prospect-modal__lead">Quatre informations suffisent. Votre tunnel sera prérempli et votre espace client sera prêt automatiquement.</p>
        <form id="prospectCaptureForm" novalidate>
          <div class="prospect-modal__grid">
            <label><span>Prénom</span><input id="prospectFirstName" name="firstName" autocomplete="given-name" required maxlength="80"></label>
            <label><span>Nom</span><input id="prospectLastName" name="lastName" autocomplete="family-name" required maxlength="100"></label>
          </div>
          <label><span>Entreprise</span><input id="prospectCompany" name="company" autocomplete="organization" required maxlength="180"></label>
          <label><span>E-mail professionnel</span><input id="prospectEmail" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254"></label>
          <label class="prospect-modal__consent"><input id="prospectConsent" name="accepted" type="checkbox" required><span>J’accepte que Neptune utilise ces informations pour préparer ma réservation et mon espace client.</span></label>
          <p class="prospect-modal__message" id="prospectMessage" aria-live="polite"></p>
          <button class="prospect-modal__submit" id="prospectSubmit" type="submit"><span>Accéder aux formats et aux créneaux</span><b aria-hidden="true">→</b></button>
          <p class="prospect-modal__reassurance">Aucun mot de passe maintenant. Paiement sécurisé dans l’étape finale.</p>
        </form>
      </section>`;
    document.body.append(modal);
    modal.querySelectorAll('[data-prospect-close]').forEach((node) => node.addEventListener('click', closeModal));
    modal.querySelector('#prospectCaptureForm').addEventListener('submit', submitProspect);
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeModal();
    });
  }

  async function submitProspect(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = modal.querySelector('#prospectSubmit');
    const payload = {
      firstName: value('prospectFirstName'),
      lastName: value('prospectLastName'),
      company: value('prospectCompany'),
      email: value('prospectEmail').toLowerCase(),
      accepted: modal.querySelector('#prospectConsent').checked,
      source: `tv:${location.pathname}`,
    };

    button.disabled = true;
    button.classList.add('is-loading');
    setMessage('Préparation de votre accès…');
    try {
      const response = await fetch(API_PATH, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.token) throw new Error(result.error || `http_${response.status}`);
      const saved = {
        token: result.token,
        prospectId: result.prospectId,
        expiresAt: Date.now() + Number(result.expiresIn || 172800) * 1000,
        contact: result.contact || payload,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setMessage('Accès prêt. Ouverture du tunnel…', 'success');
      goToTunnel(pendingTarget || `https://${TUNNEL_HOST}/`, result.token);
    } catch (error) {
      console.error('prospect_capture_failed', error);
      setMessage(errorMessage(error.message), 'error');
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  }

  function goToTunnel(target, token) {
    const url = new URL(target || `https://${TUNNEL_HOST}/`);
    url.searchParams.set('reservation_token', token);
    url.searchParams.set('utm_source', url.searchParams.get('utm_source') || 'neptune_media_tv');
    location.href = url.toString();
  }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  }
  function fill(id, value) { const node = modal.querySelector(`#${id}`);if (node) node.value = String(value || ''); }
  function value(id) { return String(modal.querySelector(`#${id}`)?.value || '').trim(); }
  function setMessage(text, type = '') { const node = modal?.querySelector('#prospectMessage');if (node) { node.textContent = text;node.dataset.type = type; } }
  function errorMessage(code) {
    return ({
      invalid_contact: 'Vérifiez les quatre informations et votre accord.',
      origin_forbidden: 'Cette demande ne peut pas être envoyée depuis cette page.',
    })[code] || 'Impossible de préparer votre accès pour le moment. Réessayez.';
  }
})();
