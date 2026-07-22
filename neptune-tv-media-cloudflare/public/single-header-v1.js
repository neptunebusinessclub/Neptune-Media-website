(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    normaliseHeader();
    const observer = new MutationObserver(() => normaliseHeader());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 20000);
  });

  function normaliseHeader() {
    const header = document.querySelector('.site-header[data-single-header]') || document.querySelector('body > .site-header');
    if (!header) return;

    header.dataset.singleHeader = '1';
    removeCompetingNavigation(header);
    bindMenu(header);
    syncCurrentLink(header);
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
      if (window.innerWidth > 1080) close();
    }, { passive: true });
  }

  function syncCurrentLink(header) {
    const path = normalisePath(location.pathname);
    header.querySelectorAll('a').forEach((link) => {
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return;
      const target = normalisePath(url.pathname);
      const current = target === '/' ? path === '/' : path.startsWith(target);
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
