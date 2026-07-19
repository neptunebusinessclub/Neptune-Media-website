(() => {
  'use strict';
  const BOOKING = 'https://media.neptunebusiness.com/';
  const SESSION_KEY = 'neptune_media_session';
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();

  ready(() => {
    decorateBookingLinks();
    addMobileBar();
    bindMobileBarVisibility();
  });

  function decorateBookingLinks() {
    let sessionId = '';
    try { sessionId = localStorage.getItem(SESSION_KEY) || ''; } catch {}
    document.querySelectorAll('a[data-funnel]').forEach((link) => {
      const url = new URL(link.href || BOOKING, location.href);
      if (url.origin !== new URL(BOOKING).origin) return;
      url.searchParams.set('utm_source', 'webtv');
      url.searchParams.set('utm_campaign', 'neptune_media');
      if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', link.dataset.format ? 'landing_format' : 'website');
      if (link.dataset.format) {
        url.searchParams.set('format', link.dataset.format);
        url.searchParams.set('offre', link.dataset.format);
        url.searchParams.set('utm_content', link.dataset.format);
      }
      if (sessionId) url.searchParams.set('session_id', sessionId);
      link.href = url.toString();
      if (!link.dataset.track) link.dataset.track = 'booking_click';
    });
  }

  function addMobileBar() {
    if (document.querySelector('.mobile-conversion-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-conversion-bar';
    bar.setAttribute('aria-label', 'Actions rapides');
    bar.innerHTML = `<a href="/emissions/"><span aria-hidden="true">▶</span> Neptune TV</a><a class="primary" data-funnel data-track="mobile_bar_reservation" href="${BOOKING}">Voir les créneaux</a>`;
    document.body.append(bar);
    decorateBookingLinks();
  }

  function bindMobileBarVisibility() {
    const bar = document.querySelector('.mobile-conversion-bar');
    const problem = document.querySelector('#probleme');
    const finalCta = document.querySelector('.voice-final');
    if (!bar || !problem) return;
    const update = () => {
      const start = problem.getBoundingClientRect().top < innerHeight * .72;
      const nearFinal = finalCta && finalCta.getBoundingClientRect().top < innerHeight * .72;
      bar.classList.toggle('is-visible', start && !nearFinal);
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }
})();
