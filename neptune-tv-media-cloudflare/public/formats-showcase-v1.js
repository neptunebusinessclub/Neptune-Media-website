(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    document.querySelectorAll('[data-format-carousel]').forEach(initCarousel);
  });

  function initCarousel(root) {
    if (root.dataset.carouselBound === '1') return;
    root.dataset.carouselBound = '1';

    const track = root.querySelector('[data-format-track]');
    const slides = [...root.querySelectorAll('[data-format-slide]')];
    const dots = [...root.querySelectorAll('[data-format-dot]')];
    const previous = root.querySelector('[data-format-prev]');
    const next = root.querySelector('[data-format-next]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = Math.max(3200, Number(root.dataset.interval || 4800));

    if (!track || slides.length < 2) return;

    let index = 0;
    let timer = 0;
    let paused = false;

    const render = (nextIndex, announce = false) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.setProperty('--active-index', String(index));
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.setAttribute('aria-current', active ? 'true' : 'false');
        dot.setAttribute('aria-label', `Afficher l’image ${dotIndex + 1} sur ${slides.length}`);
      });
      if (announce) root.setAttribute('aria-label', `Image ${index + 1} sur ${slides.length}`);
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      stop();
      if (reducedMotion || paused || document.hidden) return;
      timer = window.setInterval(() => render(index + 1), interval);
    };

    previous?.addEventListener('click', () => {
      render(index - 1, true);
      start();
    });

    next?.addEventListener('click', () => {
      render(index + 1, true);
      start();
    });

    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => {
      render(dotIndex, true);
      start();
    }));

    root.addEventListener('mouseenter', () => {
      paused = true;
      stop();
    });

    root.addEventListener('mouseleave', () => {
      paused = false;
      start();
    });

    root.addEventListener('focusin', () => {
      paused = true;
      stop();
    });

    root.addEventListener('focusout', (event) => {
      if (root.contains(event.relatedTarget)) return;
      paused = false;
      start();
    });

    document.addEventListener('visibilitychange', start);
    render(0);
    start();
  }
})();
