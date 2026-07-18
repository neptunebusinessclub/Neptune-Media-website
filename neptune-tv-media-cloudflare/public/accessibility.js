(() => {
  'use strict';

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const focusableSelector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    'video[controls]',
  ].join(',');

  const main = qs('#main-content') || qs('main');
  const footer = qs('footer');
  const nav = qs('[data-nav]');
  const menuButton = qs('[data-menu-toggle]');
  const modal = qs('[data-video-modal]');
  const modalClose = modal ? qs('[data-video-close]', modal) : null;
  const player = modal ? qs('video', modal) : null;
  const mediaError = qs('#mediaError');
  const mediaRetry = qs('#mediaRetry');
  const captionNotice = qs('#captionNotice');
  const transcriptPanel = qs('#transcriptPanel');
  const transcriptText = qs('#transcriptText');
  const catalog = qs('#dynamicCatalog');
  const catalogStatus = qs('#catalogStatus');
  const catalogError = qs('#catalogError');
  const catalogRetry = qs('#catalogRetry');
  const heroVideo = qs('#heroPreview');
  const heroMotionToggle = qs('#heroMotionToggle');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPausedPreview = false;
  let modalBackground = [];

  initSkipLinks();
  initMenu();
  initFaq();
  initModal();
  initCatalog();
  initHeroMotion();
  markDecorativeSymbols();

  function visibleFocusable(scope) {
    return qsa(focusableSelector, scope).filter((element) => {
      if (element.hidden || element.closest('[hidden]') || element.closest('[inert]')) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function trapFocus(event, scope, extras = []) {
    if (event.key !== 'Tab') return;
    const items = [...extras, ...visibleFocusable(scope)].filter((item, index, list) => item && list.indexOf(item) === index);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setInert(elements, value) {
    elements.filter(Boolean).forEach((element) => {
      element.inert = value;
      if (value) element.setAttribute('data-a11y-inert', 'true');
      else element.removeAttribute('data-a11y-inert');
    });
  }

  function initSkipLinks() {
    qsa('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        const id = link.getAttribute('href')?.slice(1);
        if (!id) return;
        const target = document.getElementById(id);
        if (!target) return;
        window.setTimeout(() => {
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }, 250);
      });
    });
  }

  function initMenu() {
    if (!nav || !menuButton) return;
    const menuLinks = qsa('a', nav);
    const syncMenu = (returnFocus = false) => {
      const open = nav.classList.contains('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      setInert([main, footer], open && window.innerWidth <= 860);
      if (open && window.innerWidth <= 860) window.requestAnimationFrame(() => menuLinks[0]?.focus());
      if (!open && returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => window.setTimeout(() => syncMenu(false), 0));
    menuLinks.forEach((link) => link.addEventListener('click', () => window.setTimeout(() => syncMenu(false), 0)));
    document.addEventListener('keydown', (event) => {
      if (!nav.classList.contains('is-open') || window.innerWidth > 860) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        nav.classList.remove('is-open');
        document.body.classList.remove('menu-open');
        syncMenu(true);
        return;
      }
      trapFocus(event, nav, [menuButton]);
    }, true);
    window.addEventListener('resize', () => {
      if (window.innerWidth > 860) {
        nav.classList.remove('is-open');
        document.body.classList.remove('menu-open');
      }
      syncMenu(false);
    });
    syncMenu(false);
  }

  function initFaq() {
    qsa('[data-faq]').forEach((item, index) => {
      const button = qs('button', item);
      const answer = qs('.faq-answer', item);
      if (!button || !answer) return;
      const buttonId = button.id || `faq-button-${index + 1}`;
      const answerId = answer.id || `faq-answer-${index + 1}`;
      button.id = buttonId;
      answer.id = answerId;
      button.setAttribute('aria-controls', answerId);
      answer.setAttribute('role', 'region');
      answer.setAttribute('aria-labelledby', buttonId);
      const symbol = button.lastElementChild;
      if (symbol) symbol.setAttribute('aria-hidden', 'true');

      const sync = () => {
        const open = item.classList.contains('is-open');
        button.setAttribute('aria-expanded', String(open));
        answer.hidden = !open;
      };
      button.addEventListener('click', () => window.queueMicrotask(sync));
      sync();
    });
  }

  function initModal() {
    if (!modal || !player) return;
    const observer = new MutationObserver(() => {
      const open = modal.classList.contains('is-open') && modal.getAttribute('aria-hidden') !== 'true';
      if (open) activateModal();
      else deactivateModal();
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });

    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('is-open')) return;
      trapFocus(event, modal);
    }, true);

    player.addEventListener('error', () => showMediaError('La vidéo n’a pas pu être chargée. Vous pouvez réessayer.'));
    player.addEventListener('loadeddata', () => showMediaError(''));
    mediaRetry?.addEventListener('click', () => {
      showMediaError('');
      player.load();
      player.play().catch(() => showMediaError('La lecture n’a pas pu démarrer. Vérifiez votre connexion puis réessayez.'));
    });

    window.addEventListener('neptune:episode-opened', (event) => configureEpisodeAccessibility(event.detail?.episode || {}));
  }

  function activateModal() {
    if (!modalBackground.length) {
      modalBackground = qsa('body > *').filter((element) => element !== modal && element.tagName !== 'SCRIPT');
    }
    setInert(modalBackground, true);
    window.requestAnimationFrame(() => modalClose?.focus());
  }

  function deactivateModal() {
    setInert(modalBackground, false);
    showMediaError('');
  }

  function showMediaError(message) {
    if (!mediaError) return;
    const text = qs('[data-error-text]', mediaError);
    if (text) text.textContent = message;
    mediaError.hidden = !message;
  }

  function configureEpisodeAccessibility(episode) {
    if (!player) return;
    qsa('track[data-neptune-caption]', player).forEach((track) => track.remove());
    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const captionsUrl = String(episode.captionsUrl || metadata.captionsUrl || metadata.captionUrl || '').trim();
    const transcript = String(episode.transcript || metadata.transcript || '').trim();

    if (captionsUrl) {
      const track = document.createElement('track');
      track.kind = 'captions';
      track.srclang = 'fr';
      track.label = 'Français';
      track.src = captionsUrl;
      track.default = true;
      track.dataset.neptuneCaption = 'true';
      player.append(track);
      if (captionNotice) captionNotice.textContent = 'Sous-titres français disponibles dans le lecteur.';
    } else if (captionNotice) {
      captionNotice.textContent = 'Sous-titres non disponibles pour cet extrait.';
    }

    if (transcriptPanel && transcriptText) {
      transcriptText.textContent = transcript;
      transcriptPanel.hidden = !transcript;
    }
  }

  function initCatalog() {
    if (!catalog) return;
    catalog.removeAttribute('aria-live');
    catalog.setAttribute('aria-busy', 'true');
    const announce = () => {
      markDecorativeSymbols();
      const count = qsa('.media-card', catalog).length;
      catalog.setAttribute('aria-busy', 'false');
      if (catalogStatus) catalogStatus.textContent = `${count} extrait${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}.`;
    };
    const observer = new MutationObserver(announce);
    observer.observe(catalog, { childList: true, subtree: true });
    window.addEventListener('neptune:catalog-ready', announce);
    window.addEventListener('neptune:catalog-error', () => {
      catalog.setAttribute('aria-busy', 'false');
      if (catalogError) catalogError.hidden = false;
      if (catalogStatus) catalogStatus.textContent = 'Le catalogue dynamique n’a pas pu être chargé. Les extraits de secours restent disponibles.';
    });
    catalogRetry?.addEventListener('click', () => window.location.reload());
    announce();
  }

  function initHeroMotion() {
    if (!heroVideo || !heroMotionToggle) return;
    const syncButton = () => {
      const paused = heroVideo.paused;
      heroMotionToggle.textContent = paused ? 'Lire l’aperçu' : 'Mettre l’aperçu en pause';
      heroMotionToggle.setAttribute('aria-pressed', String(!paused));
    };
    const applyPreference = () => {
      if (reducedMotion.matches) {
        userPausedPreview = true;
        heroVideo.pause();
      } else if (!userPausedPreview) {
        heroVideo.play().catch(() => {});
      }
      syncButton();
    };
    heroMotionToggle.addEventListener('click', () => {
      if (heroVideo.paused) {
        userPausedPreview = false;
        heroVideo.play().catch(() => {});
      } else {
        userPausedPreview = true;
        heroVideo.pause();
      }
      syncButton();
    });
    heroVideo.addEventListener('play', syncButton);
    heroVideo.addEventListener('pause', syncButton);
    reducedMotion.addEventListener?.('change', applyPreference);
    applyPreference();
  }

  function markDecorativeSymbols() {
    qsa('.play-dot, .card-play').forEach((element) => element.setAttribute('aria-hidden', 'true'));
  }
})();
