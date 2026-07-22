(() => {
  'use strict';

  ensureStylesheet();

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const header = normaliseHeader();
    placeFormatsShowcaseAfterSteps();
    watchFormatsPlacement();
    if (header) watchCompetingNavigation(header);
  });

  function ensureStylesheet() {
    const href = '/styles/single-header-v1.css?v=4';
    const links = [...document.querySelectorAll('link[href*="single-header-v1.css"]')];
    const current = links[0];
    links.slice(1).forEach((link) => link.remove());

    if (current) {
      if (current.getAttribute('href') !== href) current.setAttribute('href', href);
      current.dataset.singleHeaderStyles = '4';
      document.head.append(current);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.singleHeaderStyles = '4';
    document.head.append(link);
  }

  function normaliseHeader() {
    const header = document.querySelector('.site-header[data-single-header]')
      || document.querySelector('body > .site-header');
    if (!header) return null;

    header.dataset.singleHeader = '1';
    flattenLegacyNavigation(header);
    removeCompetingNavigation(header);
    bindMenu(header);
    syncCurrentLink(header);
    return header;
  }

  function flattenLegacyNavigation(header) {
    const nav = header.querySelector('[data-nav]');
    if (!nav) return;

    const main = nav.querySelector(':scope > .nav-main');
    const actions = nav.querySelector(':scope > .nav-actions');
    if (!main && !actions) return;

    const links = [
      ...(main ? [...main.querySelectorAll(':scope > a')] : []),
      ...(actions ? [...actions.querySelectorAll(':scope > a')] : []),
    ];
    if (!links.length) return;
    nav.replaceChildren(...links);
  }

  function watchCompetingNavigation(header) {
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        removeCompetingNavigation(header);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 16000);
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
      const position = getComputedStyle(nav).position;
      const duplicate = /formats/.test(text)
        && /(backstages|offres|voir|direct)/.test(text)
        && ['fixed', 'sticky'].includes(position);
      if (duplicate) nav.remove();
    });
  }

  function bindMenu(header) {
    if (header.dataset.menuBound === '1') return;
    header.dataset.menuBound = '1';

    const button = header.querySelector('[data-menu-toggle]');
    const nav = header.querySelector('[data-nav]');
    if (!button || !nav) return;

    const close = (restoreFocus = false) => {
      header.classList.remove('is-menu-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Ouvrir le menu');
      if (restoreFocus) button.focus();
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

    document.addEventListener('pointerdown', (event) => {
      if (!header.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('is-menu-open')) close(true);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1080) close();
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

  function watchFormatsPlacement() {
    if (placeFormatsShowcaseAfterSteps()) return;

    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (placeFormatsShowcaseAfterSteps()) observer.disconnect();
      });
    });

    observer.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 16000);
  }

  function placeFormatsShowcaseAfterSteps() {
    if (normalisePath(location.pathname) !== '/') return true;

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

    if (!steps || !showcase || steps === showcase) return false;
    if (steps.nextElementSibling !== showcase) steps.insertAdjacentElement('afterend', showcase);
    showcase.dataset.sectionOrder = 'after-steps';
    return true;
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