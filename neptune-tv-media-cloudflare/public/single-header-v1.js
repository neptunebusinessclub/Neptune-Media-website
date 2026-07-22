(() => {
  'use strict';

  const ICONS = {
    direct: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M7.8 8.5a5.2 5.2 0 0 0 0 7M16.2 8.5a5.2 5.2 0 0 1 0 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    formats: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7.5h10.5M4 12h16M4 16.5h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="17.5" cy="7.5" r="2.2" stroke="currentColor" stroke-width="1.5"/><circle cx="15.5" cy="16.5" r="2.2" stroke="currentColor" stroke-width="1.5"/></svg>',
    actualites: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    club: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="10" r="2.4" stroke="currentColor" stroke-width="1.5"/><path d="M3.8 19c.5-3.4 2.2-5.2 5.2-5.2s4.7 1.8 5.2 5.2M14 15c2.9-.5 5 .8 5.7 3.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    normaliseHeader();
    placeFormatsShowcaseAfterSteps();
    const observer = new MutationObserver(() => {
      normaliseHeader();
      placeFormatsShowcaseAfterSteps();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 20000);
  });

  function normaliseHeader() {
    const header = document.querySelector('.site-header[data-single-header]') || document.querySelector('body > .site-header');
    if (!header) return;

    header.dataset.singleHeader = '1';
    ensureStylesheet();
    structureNavigation(header);
    decorateNavigation(header);
    removeCompetingNavigation(header);
    bindMenu(header);
    syncCurrentLink(header);
  }

  function placeFormatsShowcaseAfterSteps() {
    if (normalisePath(location.pathname) !== '/') return;

    const steps = document.querySelector('main .journey-curve-section#experience')
      || document.querySelector('main #experience.journey-curve-section')
      || document.querySelector('main [data-journey-map]')?.closest('section')
      || document.querySelector('main .scroll-pipeline-section')
      || document.querySelector('main #experience');

    const showcase = document.querySelector('main .formats-showcase')
      || [...document.querySelectorAll('main > section')].find((section) => {
        const heading = normalise(section.querySelector('h1,h2')?.textContent || '');
        return heading.includes('comment avec du contenu') && heading.includes('plus de client');
      });

    if (!steps || !showcase || steps === showcase || steps.nextElementSibling === showcase) return;
    steps.insertAdjacentElement('afterend', showcase);
    showcase.dataset.sectionOrder = 'after-steps';
  }

  function ensureStylesheet() {
    const href = '/styles/single-header-v1.css?v=3';
    const links = [...document.querySelectorAll('link[href*="single-header-v1.css"]')];
    const current = links[0];
    links.slice(1).forEach((link) => link.remove());
    if (current) {
      if (current.getAttribute('href') !== href) current.setAttribute('href', href);
      current.dataset.singleHeaderStyles = '3';
      document.head.append(current);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.singleHeaderStyles = '3';
    document.head.append(link);
  }

  function structureNavigation(header) {
    const nav = header.querySelector('[data-nav]');
    if (!nav || nav.querySelector(':scope > .nav-main')) return;

    const links = [...nav.querySelectorAll(':scope > a')];
    if (!links.length) return;

    const main = document.createElement('div');
    main.className = 'nav-main';
    const actions = document.createElement('div');
    actions.className = 'nav-actions';

    links.forEach((link) => {
      if (link.classList.contains('nav-action')) actions.append(link);
      else main.append(link);
    });
    nav.replaceChildren(main, actions);
  }

  function decorateNavigation(header) {
    const mainLinks = [...header.querySelectorAll('.nav-main > a')];
    mainLinks.forEach((link) => {
      if (link.querySelector('.nav-icon')) return;
      const text = normalise(link.textContent || '');
      let icon = null;
      if (text.includes('direct')) icon = ICONS.direct;
      else if (text.includes('format')) icon = ICONS.formats;
      else if (text.includes('actualit')) icon = ICONS.actualites;
      else if (text.includes('club')) icon = ICONS.club;
      if (!icon) return;
      const span = document.createElement('span');
      span.className = 'nav-icon';
      span.innerHTML = icon;
      link.prepend(span);
    });
  }

  function removeCompetingNavigation(keep) {
    document.querySelectorAll('body > header').forEach((header) => {
      if (header !== keep) header.remove();
    });

    document.querySelectorAll([
      '.journey-nav',
      '.mobile-journey-dock',
      '.sticky-conversion-nav',
      '.section-progress-nav',
      '.conversion-nav',
      '[data-journey-nav]',
      '[data-sticky-navigation]',
      '[data-scroll-navigation]'
    ].join(',')).forEach((node) => {
      if (!keep.contains(node)) node.remove();
    });

    document.querySelectorAll('body > nav, main > nav').forEach((nav) => {
      if (keep.contains(nav)) return;
      const text = normalise(nav.textContent || '');
      const style = getComputedStyle(nav);
      const looksLikeDuplicate = /formats/.test(text)
        && /(backstages|offres|voir|direct)/.test(text)
        && ['fixed', 'sticky'].includes(style.position);
      if (looksLikeDuplicate) nav.remove();
    });
  }

  function bindMenu(header) {
    if (header.dataset.menuBound === '1') return;
    header.dataset.menuBound = '1';

    const button = header.querySelector('[data-menu-toggle]');
    const nav = header.querySelector('[data-nav]');
    if (!button || !nav) return;

    const close = () => {
      header.classList.remove('is-menu-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Ouvrir le menu');
    };

    button.addEventListener('click', () => {
      const open = !header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
    });

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        close();
        button.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1220) close();
    }, { passive: true });
  }

  function syncCurrentLink(header) {
    const path = normalisePath(location.pathname);
    header.querySelectorAll('a').forEach((link) => {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const target = normalisePath(url.pathname);
      const current = target === '/' ? path === '/' && !link.hash : path.startsWith(target);
      if (current && !link.hash) link.setAttribute('aria-current', 'page');
      else if (link.getAttribute('aria-current') === 'page') link.removeAttribute('aria-current');
    });
  }

  function normalise(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normalisePath(value) {
    const path = String(value || '/').replace(/\/{2,}/g, '/');
    return path.length > 1 ? path.replace(/\/$/, '') : '/';
  }
})();