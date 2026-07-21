(() => {
  'use strict';
  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const section = document.querySelector('#probleme.problem-chat-static');
    if (!section || section.dataset.chatBound === '1') return;
    section.dataset.chatBound = '1';

    ensureJourneyBefore(section);
    initialiseReveal(section);
  });

  function ensureJourneyBefore(section) {
    if (document.querySelector('#experience.journey-curve-section')) return;

    section.classList.add('inner-voice-section');
    delete document.documentElement.dataset.journeyCurveBound;

    const script = document.createElement('script');
    script.src = '/scroll-pipeline-v2.js?v=11';
    script.dataset.restoreJourney = '1';
    script.addEventListener('load', () => {
      requestAnimationFrame(() => section.classList.remove('inner-voice-section'));
    }, { once: true });
    document.head.append(script);
  }

  function initialiseReveal(section) {
    const items = [...section.querySelectorAll('.problem-chat-static__exchange, .problem-chat-static__conclusion')];
    if (!items.length) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    section.classList.add('is-chat-enhanced');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.24, rootMargin: '0px 0px -10% 0px' });

    items.forEach((item) => observer.observe(item));
  }
})();
