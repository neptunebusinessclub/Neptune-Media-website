(() => {
  'use strict';

  if (document.documentElement.dataset.backstageStudioV3Bound === '1') return;
  document.documentElement.dataset.backstageStudioV3Bound = '1';

  const section = document.querySelector('#solution');
  if (!section) return;

  section.className = 'section backstage-studio-section';
  section.dataset.aidaStage = 'desire';
  section.dataset.backstageVersion = 'v3';
  section.removeAttribute('style');
  delete section.dataset.revealBound;
  delete section.dataset.revealDelay;
  section.classList.remove('neptune-reveal', 'is-visible');

  section.innerHTML = `
    <div class="container backstage-studio-section__inner">
      <header class="backstage-studio-section__header" data-backstage-reveal>
        <span class="eyebrow">Dans les coulisses</span>
        <h2>Une équipe et un studio complet <span>à votre unique disposition.</span></h2>
        <p class="backstage-studio-section__subtitle">C'est simple, vous ne réfléchissez pas et en plus c'est sur-mesure.</p>
        <p class="backstage-studio-section__copy">Venez accompagné avec votre équipe, ça leur fera plaisir, le Jeu Connexio est fait pour ça.</p>
      </header>

      <div class="backstage-studio-section__story" aria-label="Quelques extraits de l'expérience Neptune Media">
        <article class="backstage-shot backstage-shot--hero" data-backstage-reveal style="--backstage-order:0">
          <img src="/assets/posters/studio-wide.webp" alt="Une équipe réunie sur le plateau Neptune Media pour vivre le Jeu Connexio" loading="lazy" decoding="async">
          <div class="backstage-shot__veil" aria-hidden="true"></div>
          <div class="backstage-shot__meta">
            <span><i>01</i> Vous arrivez ensemble</span>
            <strong>Le plateau devient votre terrain de jeu.</strong>
          </div>
        </article>

        <article class="backstage-shot backstage-shot--portrait backstage-shot--studio" data-backstage-reveal style="--backstage-order:1">
          <video muted loop playsinline preload="metadata" poster="/assets/posters/studio-wide.webp" aria-label="Découverte du plateau Neptune Media">
            <source src="https://drive.google.com/uc?export=download&id=1zNuZx-QK9qeZvxfwHkHoQ4s-cZs68Ls-">
          </video>
          <div class="backstage-shot__veil" aria-hidden="true"></div>
          <div class="backstage-shot__meta">
            <span><i>02</i> Le studio prend vie</span>
            <strong>Caméras, lumière et décor sont déjà prêts.</strong>
          </div>
          <button class="backstage-shot__control" type="button" aria-label="Mettre la vidéo en pause" data-backstage-control><span aria-hidden="true">Ⅱ</span></button>
        </article>

        <article class="backstage-shot backstage-shot--portrait backstage-shot--team" data-backstage-reveal style="--backstage-order:2">
          <video muted loop playsinline preload="metadata" poster="/assets/posters/studio-wide.webp" aria-label="L'équipe suit l'émission depuis les coulisses">
            <source src="https://drive.google.com/uc?export=download&id=16EQ9ZB_bX6l5RxdWr4KURGhKgLKjYoCs">
          </video>
          <div class="backstage-shot__veil" aria-hidden="true"></div>
          <div class="backstage-shot__meta">
            <span><i>03</i> Votre équipe participe</span>
            <strong>Elle découvre, réagit et partage le moment avec vous.</strong>
          </div>
          <button class="backstage-shot__control" type="button" aria-label="Mettre la vidéo en pause" data-backstage-control><span aria-hidden="true">Ⅱ</span></button>
        </article>

        <article class="backstage-shot backstage-shot--portrait backstage-shot--control-room" data-backstage-reveal style="--backstage-order:3">
          <video muted loop playsinline preload="metadata" poster="/assets/posters/studio-wide.webp" aria-label="La régie Neptune Media pilote la réalisation en direct">
            <source src="https://drive.google.com/uc?export=download&id=1WlyVRXsKSxMsDov2mapvWhEoak5e8y57">
          </video>
          <div class="backstage-shot__veil" aria-hidden="true"></div>
          <div class="backstage-shot__meta">
            <span><i>04</i> Neptune gère le reste</span>
            <strong>La régie veille à chaque image pendant que vous vivez l'expérience.</strong>
          </div>
          <button class="backstage-shot__control" type="button" aria-label="Mettre la vidéo en pause" data-backstage-control><span aria-hidden="true">Ⅱ</span></button>
        </article>
      </div>

      <div class="backstage-studio-section__signature" data-backstage-reveal style="--backstage-order:4">
        <span aria-hidden="true"></span>
        <p>Vous venez avec les bonnes personnes. <strong>Neptune s'occupe de tout le reste.</strong></p>
      </div>
    </div>`;

  const revealTargets = [...section.querySelectorAll('[data-backstage-reveal]')];
  const videos = [...section.querySelectorAll('video')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.addEventListener('error', () => {
      const card = video.closest('.backstage-shot');
      if (card) card.classList.add('is-video-unavailable');
    });
  });

  section.classList.add('is-backstage-ready');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-backstage-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-backstage-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -10% 0px' });

    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.42) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        syncControl(video);
      });
    }, { threshold: [0, 0.42, 0.75] });

    videos.forEach((video) => playbackObserver.observe(video));
  }

  section.querySelectorAll('[data-backstage-control]').forEach((button) => {
    const card = button.closest('.backstage-shot');
    const video = card?.querySelector('video');
    if (!video) return;

    button.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
      window.setTimeout(() => syncControl(video), 0);
    });

    video.addEventListener('play', () => syncControl(video));
    video.addEventListener('pause', () => syncControl(video));
  });

  function syncControl(video) {
    const button = video.closest('.backstage-shot')?.querySelector('[data-backstage-control]');
    if (!button) return;
    const paused = video.paused;
    button.setAttribute('aria-label', paused ? 'Lire la vidéo' : 'Mettre la vidéo en pause');
    const icon = button.querySelector('span');
    if (icon) icon.textContent = paused ? '▶' : 'Ⅱ';
  }
})();
