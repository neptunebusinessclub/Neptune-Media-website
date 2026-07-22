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
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('autoplay', '');
      video.setAttribute('loop', '');
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'auto');

      video.addEventListener('canplay', () => {
        if (video.dataset.backstageInView !== '0') playVideo(video);
      });

      video.addEventListener('ended', () => {
        video.currentTime = 0;
        if (video.dataset.backstageInView !== '0') playVideo(video);
      });

      video.addEventListener('error', () => {
        const card = video.closest('.backstage-studio-section__media');
        card?.classList.add('is-backstage-video-fallback');
      });

      hydrateVideo(video);
      playVideo(video);
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      videos.forEach((video) => {
        video.dataset.backstageInView = '1';
        playVideo(video);
      });
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
        const shouldPlay = entry.isIntersecting && entry.intersectionRatio >= .18;
        video.dataset.backstageInView = shouldPlay ? '1' : '0';

        if (shouldPlay) {
          hydrateVideo(video);
          playVideo(video);
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, .18, .48, .82] });

    targets.forEach((target) => revealObserver.observe(target));
    videos.forEach((video) => playbackObserver.observe(video));

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      videos.forEach((video) => {
        if (video.dataset.backstageInView === '1') playVideo(video);
      });
    });
  });

  function hydrateVideo(video) {
    if (video.dataset.hydrated === '1') return;
    const source = video.dataset.src;
    if (!source) {
      video.dataset.hydrated = '1';
      return;
    }
    video.dataset.hydrated = '1';
    video.src = source;
    video.load();
  }

  function playVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    const promise = video.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }
})();
