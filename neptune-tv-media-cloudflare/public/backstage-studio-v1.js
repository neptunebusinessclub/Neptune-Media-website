(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const section = document.querySelector('#solution.backstage-studio-section');
    if (!section || section.dataset.backstageBound === '1') return;
    section.dataset.backstageBound = '1';

    const targets = [...section.querySelectorAll('[data-backstage-reveal]')];
    const videos = [...section.querySelectorAll('[data-backstage-video]')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    targets.forEach((target, index) => {
      const order = Number(target.dataset.backstageOrder || index);
      target.style.setProperty('--backstage-order', String(order));
    });

    section.querySelectorAll('img[data-backstage-src]').forEach((image) => {
      const remoteSource = image.dataset.backstageSrc;
      if (!remoteSource) return;

      const preload = new Image();
      preload.decoding = 'async';
      preload.referrerPolicy = 'no-referrer';
      preload.addEventListener('load', () => {
        image.src = remoteSource;
        image.classList.add('is-backstage-image-loaded');
      }, { once: true });
      preload.src = remoteSource;
    });

    videos.forEach((video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');

      video.addEventListener('play', () => syncVideoControl(video));
      video.addEventListener('pause', () => syncVideoControl(video));
      video.addEventListener('error', () => {
        const card = video.closest('.backstage-studio-section__media');
        card?.classList.add('is-backstage-video-fallback');
        syncVideoControl(video, true);
      });
    });

    section.querySelectorAll('[data-backstage-toggle]').forEach((button) => {
      const card = button.closest('.backstage-studio-section__media');
      const video = card?.querySelector('[data-backstage-video]');
      if (!video) return;

      button.addEventListener('click', () => {
        hydrateVideo(video);
        if (video.paused) video.play().catch(() => {});
        else video.pause();
      });
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
    }, { threshold: .16, rootMargin: '0px 0px -10% 0px' });

    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= .48) {
          hydrateVideo(video);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        syncVideoControl(video);
      });
    }, { threshold: [0, .48, .82] });

    targets.forEach((target) => revealObserver.observe(target));
    videos.forEach((video) => playbackObserver.observe(video));
  });

  function hydrateVideo(video) {
    if (video.dataset.hydrated === '1') return;
    const source = video.dataset.src;
    if (!source) return;
    video.dataset.hydrated = '1';
    video.src = source;
    video.load();
  }

  function syncVideoControl(video, failed = false) {
    const button = video.closest('.backstage-studio-section__media')?.querySelector('[data-backstage-toggle]');
    if (!button) return;

    if (failed) {
      button.hidden = true;
      return;
    }

    button.hidden = false;
    const paused = video.paused;
    button.setAttribute('aria-label', paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause');
    const icon = button.querySelector('i');
    if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
  }
})();
