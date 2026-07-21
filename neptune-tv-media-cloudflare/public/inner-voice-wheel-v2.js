(() => {
  'use strict';
  if (document.documentElement.dataset.innerVoiceWheelV2Bound === '1') return;
  document.documentElement.dataset.innerVoiceWheelV2Bound = '1';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  ready(() => requestAnimationFrame(initWheel));

  function initWheel() {
    const section = document.querySelector('#probleme.inner-voice-section');
    if (!section || section.dataset.voiceWheelBound === '1') return;

    const container = section.querySelector('.container');
    const head = section.querySelector('.voice-section-head');
    const grid = section.querySelector('.inner-voice-grid');
    const bridge = section.querySelector('.thought-bridge');
    const cards = [...section.querySelectorAll('.inner-voice-card')];
    if (!container || !head || !grid || !bridge || cards.length < 2) return;

    document.querySelectorAll('link[href*="inner-voice-continuity-v1.css"],link[data-inner-voice-continuity]').forEach((node) => node.remove());
    ensureStylesheet('/styles/inner-voice-wheel-v2.css?v=2');

    section.dataset.voiceWheelBound = '1';
    section.dataset.voiceContinuity = 'wheel-v2';
    section.classList.remove('voice-continuity-ready');

    let intro = section.querySelector('.inner-voice-intro');
    if (!intro) {
      intro = document.createElement('div');
      intro.className = 'inner-voice-intro';
      head.before(intro);
    }
    if (head.parentElement !== intro) intro.prepend(head);

    section.querySelectorAll('.inner-voice-reading-progress').forEach((node) => node.remove());

    let introCopy = intro.querySelector('.inner-voice-intro-copy');
    if (!introCopy) {
      introCopy = document.createElement('p');
      introCopy.className = 'inner-voice-intro-copy';
      introCopy.textContent = 'Faites défiler : chaque constat prend la place centrale, comme une roue qui révèle ce que vos clients pensent déjà.';
      intro.append(introCopy);
    }

    const shell = document.createElement('div');
    shell.className = 'inner-voice-wheel-shell';
    shell.setAttribute('aria-label', 'Les quatre problèmes rencontrés par nos clients');

    const sticky = document.createElement('div');
    sticky.className = 'inner-voice-wheel-sticky';

    const viewport = document.createElement('div');
    viewport.className = 'inner-voice-wheel-viewport';

    const progress = document.createElement('div');
    progress.className = 'inner-voice-wheel-progress';
    progress.setAttribute('aria-label', 'Progression de lecture des quatre constats');
    progress.innerHTML = '<strong>Les problèmes</strong><i aria-hidden="true"></i><small aria-live="polite">1 / 4</small>';

    grid.before(shell);
    viewport.append(grid);
    sticky.append(viewport, progress);
    shell.append(sticky);
    shell.after(bridge);

    cards.forEach((card, index) => {
      card.dataset.wheelIndex = String(index);
      card.classList.remove('is-voice-active', 'is-voice-read', 'is-voice-revealed');
    });

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      bridge.classList.add('is-wheel-visible');
      cards[0].classList.add('is-wheel-active');
      return;
    }

    const label = progress.querySelector('small');
    let frame = 0;
    let activeIndex = -1;

    const setGeometry = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const mobile = window.innerWidth <= 760;
      const stickyHeight = Math.max(mobile ? 520 : 560, viewportHeight - (mobile ? 66 : 72));
      const stepDistance = viewportHeight * (mobile ? .7 : .66);
      shell.style.height = `${Math.round(stickyHeight + stepDistance * (cards.length - 1) + viewportHeight * .14)}px`;
      requestUpdate();
    };

    const updateWheel = () => {
      frame = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const mobile = window.innerWidth <= 760;
      const stickyTop = mobile ? 66 : 72;
      const shellRect = shell.getBoundingClientRect();
      const travel = Math.max(1, shell.offsetHeight - sticky.offsetHeight);
      const rawProgress = clamp((stickyTop - shellRect.top) / travel, 0, 1);
      const position = rawProgress * (cards.length - 1);
      const spacing = Math.min(mobile ? 184 : 235, viewportHeight * (mobile ? .34 : .37));

      cards.forEach((card, index) => {
        const relative = index - position;
        const distance = Math.abs(relative);
        const curvedDistance = Math.sign(relative) * Math.pow(Math.min(distance, 2.45), .92);
        const translateY = curvedDistance * spacing;
        const rotateX = clamp(relative * -21, -58, 58);
        const scale = Math.max(.72, 1 - distance * .145);
        const opacity = distance > 2.15 ? 0 : Math.max(.06, 1 - distance * .43);
        const blur = Math.max(0, (distance - .15) * 2.9);
        const saturation = Math.max(.7, 1 - distance * .13);
        const zIndex = Math.round(100 - distance * 18);

        card.style.setProperty('--wheel-y', `${translateY.toFixed(2)}px`);
        card.style.setProperty('--wheel-rotate', `${rotateX.toFixed(2)}deg`);
        card.style.setProperty('--wheel-scale', scale.toFixed(4));
        card.style.setProperty('--wheel-opacity', opacity.toFixed(4));
        card.style.setProperty('--wheel-blur', `${blur.toFixed(2)}px`);
        card.style.setProperty('--wheel-saturation', saturation.toFixed(3));
        card.style.setProperty('--wheel-z', String(zIndex));
      });

      const nextActive = clamp(Math.round(position), 0, cards.length - 1);
      if (nextActive !== activeIndex) {
        activeIndex = nextActive;
        cards.forEach((card, index) => card.classList.toggle('is-wheel-active', index === activeIndex));
        if (label) label.textContent = `${activeIndex + 1} / ${cards.length}`;
      }

      progress.style.setProperty('--voice-progress', String(rawProgress));
      bridge.classList.toggle('is-wheel-visible', rawProgress > .9);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateWheel);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', setGeometry, { passive: true });
    setGeometry();
  }

  function ensureStylesheet(href) {
    let link = document.querySelector(`link[href="${href}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
    }
    link.dataset.innerVoiceWheel = 'v2';
    document.head.append(link);
  }
})();
