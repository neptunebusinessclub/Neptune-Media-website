(() => {
  'use strict';
  if (document.documentElement.dataset.finalExperienceBound === '1') return;
  document.documentElement.dataset.finalExperienceBound = '1';
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const ready = (callback) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', callback, { once: true }) : callback();

  ready(() => {
    document.documentElement.dataset.finalExperience = 'v12';
    document.body.dataset.finalUx = 'v12';
    bindFormatDecision();
    bindJourneyNavigation();
    bindRevealMotion();
    bindRailAffordance();
  });

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

  function bindJourneyNavigation() {
    if (!document.body.matches('[data-home-structure="conversion-voice-v10"]')) return;
    if (!matchMedia('(min-width:1181px)').matches || qs('.journey-nav')) return;
    const definitions = [['a-voir', 'Voir'], ['probleme', 'Se reconnaître'], ['solution', 'Comprendre'], ['formats', 'Choisir'], ['questions', 'Décider']];
    const stops = definitions.map(([id, label]) => ({ id, label, node: document.getElementById(id) })).filter((item) => item.node);
    if (stops.length < 3) return;
    const nav = document.createElement('nav');
    nav.className = 'journey-nav';
    nav.setAttribute('aria-label', 'Progression dans la page');
    stops.forEach((item) => {
      const link = document.createElement('a');
      const dot = document.createElement('span');
      link.href = `#${item.id}`;
      link.dataset.journeyLink = item.id;
      link.append(document.createTextNode(item.label), dot);
      nav.append(link);
    });
    document.body.append(nav);
    const links = qsa('[data-journey-link]', nav);
    const select = (id) => links.forEach((link) => link.classList.toggle('is-current', link.dataset.journeyLink === id));
    select(stops[0].id);
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (current) select(current.target.id);
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, .12, .3] });
    stops.forEach((item) => observer.observe(item.node));
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
