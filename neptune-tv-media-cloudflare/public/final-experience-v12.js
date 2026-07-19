(() => {
  'use strict';
  if (document.documentElement.dataset.finalExperienceBound === '1') return;
  document.documentElement.dataset.finalExperienceBound = '1';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const ready = (callback) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', callback, { once: true }) : callback();

  ensureQualityStyles();
  ensureClarityStyles();
  ready(() => {
    document.documentElement.dataset.finalExperience = 'v12';
    document.body.dataset.finalUx = 'v12';
    document.body.dataset.prdVisual = 'v16';
    document.body.dataset.visualDensity = 'v17';
    loadJourneyV18();
    ensurePrdVisualStyles();
    ensureVisualDensityStyles();
    ensureIntentActionStyles();
    simplifyHeroCopy();
    removeJourneyNavigation();
    bindFormatDecision();
    bindRevealMotion();
    bindRailAffordance();
  });

  function appendStylesheet(href, dataKey, dataValue, moveToEnd = false) {
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      if (moveToEnd) document.head.append(existing);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[dataKey] = dataValue;
    document.head.append(link);
  }

  function ensureQualityStyles() {
    appendStylesheet('/styles/final-quality-v12.css?v=1', 'finalQuality', 'v12');
  }

  function ensureClarityStyles() {
    appendStylesheet('/styles/clarity-air-v15.css?v=15', 'clarityAir', 'v15');
  }

  function ensurePrdVisualStyles() {
    appendStylesheet('/styles/prd-visual-v16.css?v=16', 'prdVisual', 'v16', true);
  }

  function ensureVisualDensityStyles() {
    appendStylesheet('/styles/visual-density-v17.css?v=17', 'visualDensity', 'v17', true);
  }

  function ensureIntentActionStyles() {
    appendStylesheet('/styles/intent-actions-v18.css?v=18', 'intentActions', 'v18', true);
  }

  function loadJourneyV18() {
    const oldScript = document.querySelector('script[data-media-journey-v14]');
    if (oldScript) oldScript.remove();
    if (!document.querySelector('script[data-media-journey-v18]')) {
      const script = document.createElement('script');
      script.src = '/media-journey-v14.js?v=18';
      script.defer = true;
      script.dataset.mediaJourneyV18 = '1';
      document.head.append(script);
    }
  }

  function simplifyHeroCopy() {
    const subtitle = qs('.hero-subtitle');
    if (subtitle) subtitle.textContent = 'Neptune prépare votre angle, vous guide sur un vrai plateau et produit des contenus prêts à publier.';
    qsa('.journey-nav').forEach((node) => node.remove());
  }

  function removeJourneyNavigation() {
    qsa('.journey-nav').forEach((node) => node.remove());
    const observer = new MutationObserver(() => qsa('.journey-nav').forEach((node) => node.remove()));
    observer.observe(document.body, { childList: true });
  }

  function bindFormatDecision() {
    const cards = qsa('[data-format-choice]');
    const panel = qs('[data-format-recommendation]');
    if (!cards.length || !panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    const title = qs('[data-format-result]', panel);
    const copy = qs('[data-format-result-copy]', panel);
    const booking = qs('[data-format-booking]', panel);
    const options = {
      horsnorme: ['Hors Norme est probablement votre point de départ.', 'Votre audience doit comprendre ce qui vous a conduit à créer, tenir ou transformer votre entreprise.', 'Voir les créneaux Hors Norme'],
      libre: ['Concept Libre est probablement votre point de départ.', 'Votre audience doit comprendre une offre, une méthode, une démonstration, un lancement ou un univers de marque.', 'Voir les créneaux Concept Libre'],
    };
    const choose = (card) => {
      const key = card.dataset.format;
      const option = options[key];
      if (!option) return;
      cards.forEach((item) => {
        const selected = item === card;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      if (title) title.textContent = option[0];
      if (copy) copy.textContent = option[1];
      if (booking) {
        booking.dataset.format = key;
        booking.textContent = option[2];
        booking.href = key === 'horsnorme' ? 'https://media.neptunebusiness.com/?format=horsnorme&offre=horsnorme' : 'https://media.neptunebusiness.com/?format=libre&offre=libre';
      }
      panel.dataset.selectedFormat = key;
    };
    cards.forEach((card) => {
      card.addEventListener('click', () => choose(card));
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        choose(card);
      });
    });
  }

  function bindRevealMotion() {
    const items = qsa('main > section:not(.voice-hero),.inner-voice-card,.solution-voice-card,.proof-compact article,.format-card[data-format-choice],.voice-process article,.faq-item').filter((item) => !item.dataset.revealBound);
    if (!items.length) return;
    items.forEach((item, index) => {
      item.dataset.revealBound = '1';
      item.classList.add('neptune-reveal');
      item.dataset.revealDelay = String(index % 4);
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    document.body.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach((item) => observer.observe(item));
  }

  function bindRailAffordance() {
    qsa('[data-content-rail]').forEach((shell) => {
      const rail = qs('[data-rail-track]', shell);
      if (!rail) return;
      const update = () => {
        const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
        shell.dataset.atStart = String(rail.scrollLeft <= 4);
        shell.dataset.atEnd = String(max <= 4 || rail.scrollLeft >= max - 4);
      };
      if (shell.dataset.finalRailBound !== '1') {
        shell.dataset.finalRailBound = '1';
        rail.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });
      }
      requestAnimationFrame(update);
    });
  }
})();

// Production browser quality gate revision 9.