(() => {
  const FUNNEL_URL = 'https://media.neptunebusiness.com/?utm_source=webtv&utm_medium=direct_own_show&utm_campaign=neptune_media&utm_content=votre_emission';

  function enhanceDirectPage() {
    const page = document.querySelector('.live-page.live-page-immediate');
    if (!page || page.dataset.directEnhanced === 'true') return;
    page.dataset.directEnhanced = 'true';

    const playlist = page.querySelector('.youtube-playlist');
    const heading = playlist?.querySelector('.catalog-section-head');
    const eyebrow = heading?.querySelector('.eyebrow');
    const title = heading?.querySelector('h2');
    const description = heading?.querySelector('p');

    if (heading && eyebrow && title && !heading.querySelector('.direct-heading-copy')) {
      const copy = document.createElement('div');
      copy.className = 'direct-heading-copy';
      heading.insertBefore(copy, eyebrow);
      copy.append(eyebrow, title);
    }

    if (eyebrow) eyebrow.textContent = 'Chaîne officielle';
    if (title) title.textContent = 'Neptune Media en direct';
    if (description) description.textContent = 'La playlist officielle, diffusée directement depuis YouTube.';

    const frame = playlist?.querySelector('.youtube-playlist-frame');
    const iframe = frame?.querySelector('iframe');
    if (iframe) iframe.loading = 'eager';

    if (frame && !frame.nextElementSibling?.classList.contains('direct-player-status')) {
      const status = document.createElement('div');
      status.className = 'direct-player-status';
      status.setAttribute('aria-label', 'Statut du programme');
      status.innerHTML = '<span class="direct-live-pill"><i aria-hidden="true"></i>À l\'antenne</span><strong>Playlist officielle Neptune Media</strong><a href="/emissions/">Toutes les émissions</a>';
      frame.after(status);
    }

    const related = page.querySelector('.related');
    const relatedEyebrow = related?.querySelector(':scope > .eyebrow');
    const relatedTitle = related?.querySelector(':scope > h2');
    if (relatedEyebrow) relatedEyebrow.textContent = 'Programme';
    if (relatedTitle) relatedTitle.textContent = 'À suivre';

    if (related && !related.querySelector('.direct-all-link')) {
      const link = document.createElement('a');
      link.className = 'direct-all-link';
      link.href = '/emissions/';
      link.textContent = 'Tout voir';
      related.append(link);
    }

    renderProgrammeCards(page, related);
  }

  function renderProgrammeCards(page, related) {
    const grid = related?.querySelector('.seo-grid');
    if (!grid) return;

    grid.classList.add('direct-program-grid');
    grid.innerHTML = `
      <article class="direct-program-card direct-program-card--upcoming" aria-label="Prochaine émission à venir">
        <div class="direct-program-card__visual" aria-hidden="true">
          <span class="direct-program-card__orb direct-program-card__orb--one"></span>
          <span class="direct-program-card__orb direct-program-card__orb--two"></span>
          <span class="direct-program-card__clock">↻</span>
        </div>
        <div class="direct-program-card__copy">
          <span class="direct-program-card__badge">Prochainement</span>
          <strong>À venir</strong>
          <small>La prochaine émission apparaîtra ici dès sa programmation.</small>
        </div>
      </article>
      <button class="direct-program-card direct-program-card--own" type="button" data-own-show-trigger aria-haspopup="dialog" aria-controls="directOwnShowDialog">
        <div class="direct-program-card__visual" aria-hidden="true">
          <img src="/assets/logo-neptune.svg" alt="">
          <span class="direct-program-card__plus">+</span>
        </div>
        <div class="direct-program-card__copy">
          <span class="direct-program-card__badge">Passez à l’écran</span>
          <strong>Votre émission</strong>
          <small>Votre entreprise pourrait être la prochaine à l’antenne.</small>
        </div>
        <span class="direct-program-card__action" aria-hidden="true">Découvrir →</span>
      </button>`;

    const dialog = ensureOwnShowDialog(page);
    const trigger = grid.querySelector('[data-own-show-trigger]');
    trigger?.addEventListener('click', () => openDialog(dialog));
  }

  function ensureOwnShowDialog(page) {
    let dialog = document.querySelector('[data-own-show-dialog]');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'directOwnShowDialog';
    dialog.className = 'direct-own-show-dialog';
    dialog.dataset.ownShowDialog = '';
    dialog.setAttribute('aria-labelledby', 'directOwnShowTitle');
    dialog.innerHTML = `
      <div class="direct-own-show-panel">
        <button class="direct-own-show-close" type="button" data-dialog-close aria-label="Fermer">×</button>
        <span class="eyebrow">Neptune Media</span>
        <h2 id="directOwnShowTitle">Voulez-vous avoir votre propre émission&nbsp;?</h2>
        <p>Nous prenons en charge l’angle, la préparation, le plateau, l’interview et la production. Vous venez, vous échangez, nous faisons le reste.</p>
        <div class="direct-own-show-actions">
          <button class="btn btn-secondary" type="button" data-dialog-close>Pas maintenant</button>
          <a class="btn btn-primary" href="${FUNNEL_URL}">Oui, je veux mon émission</a>
        </div>
      </div>`;

    document.body.append(dialog);

    const close = () => closeDialog(dialog);
    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', close));
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('cancel', () => document.body.classList.remove('direct-modal-open'));
    dialog.addEventListener('close', () => document.body.classList.remove('direct-modal-open'));

    return dialog;
  }

  function openDialog(dialog) {
    if (!dialog) return;
    document.body.classList.add('direct-modal-open');
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    document.body.classList.remove('direct-modal-open');
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }
    dialog.removeAttribute('open');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceDirectPage, { once: true });
  } else {
    enhanceDirectPage();
  }
})();