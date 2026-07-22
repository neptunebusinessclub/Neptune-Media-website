(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const section = document.querySelector('#solution.backstage-studio-section');
    if (!section || section.dataset.backstageBound === '1') return;
    section.dataset.backstageBound = '1';

    const targets = [
      section.querySelector('.backstage-studio-section__header'),
      ...section.querySelectorAll('.backstage-studio-section__media')
    ].filter(Boolean);
    const videos = [...section.querySelectorAll('video')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    videos.forEach((video) => {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return;
    }

    section.classList.add('is-backstage-enhanced');

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .18, rootMargin: '0px 0px -10% 0px' });

    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= .42) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, .42, .8] });

    targets.forEach((target) => revealObserver.observe(target));
    videos.forEach((video) => playbackObserver.observe(video));
  });
})();
