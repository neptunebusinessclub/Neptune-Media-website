(() => {
  'use strict';

  if (document.documentElement.dataset.scrollPipeline3dBound === '1') return;
  document.documentElement.dataset.scrollPipeline3dBound = '1';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const previousSection = document.querySelector('.inner-voice-section#probleme');
    if (!previousSection) return;

    const section = document.createElement('section');
    section.className = 'neptune-scroll-pipeline';
    section.id = 'parcours';
    section.dataset.aidaStage = 'interest';
    section.setAttribute('aria-labelledby', 'pipeline-title');
    section.innerHTML = pipelineMarkup();
    previousSection.replaceWith(section);
    document.querySelectorAll('a[href="#experience"]').forEach((link) => link.setAttribute('href', '#parcours'));

    initialisePipeline(section);
  });

  function pipelineMarkup() {
    return `
      <div class="np-scroll-shell" data-pipeline-shell>
        <div class="np-sticky">
          <div class="np-ambient" aria-hidden="true">
            <span class="np-orbit np-orbit--one"></span>
            <span class="np-orbit np-orbit--two"></span>
            <span class="np-orbit np-orbit--three"></span>
            <span class="np-light-beam"></span>
          </div>

          <div class="container np-layout">
            <header class="np-heading">
              <span class="np-eyebrow"><i aria-hidden="true"></i> De votre choix à vos contenus</span>
              <h2 id="pipeline-title">Vous choisissez. <span>Neptune prend la suite.</span></h2>
              <p>Faites défiler : chaque étape se met en place jusqu’à la livraison dans votre espace client.</p>
            </header>

            <div class="np-stage" aria-label="Parcours de production Neptune Media">
              <div class="np-depth-grid" aria-hidden="true"></div>
              <div class="np-track" data-pipeline-track>
                ${stepMarkup({
                  index: '01',
                  kicker: 'Votre point de départ',
                  title: 'Choisissez votre format',
                  copy: 'Hors Norme pour raconter ce qui vous a construit. Concept Libre pour mettre en scène une expertise, une offre ou une idée.',
                  meta: '2 formats · 1 choix clair',
                  accent: '#56dcff',
                  glow: '86 220 255',
                  icon: formatIcon()
                })}
                ${stepMarkup({
                  index: '02',
                  kicker: 'Votre agenda',
                  title: 'Choisissez la date',
                  copy: 'Vous voyez les prochains passages disponibles et sélectionnez le créneau qui convient réellement à votre emploi du temps.',
                  meta: 'Créneaux visibles immédiatement',
                  accent: '#6f8cff',
                  glow: '111 140 255',
                  icon: calendarIcon()
                })}
                ${stepMarkup({
                  index: '03',
                  kicker: 'Votre place est confirmée',
                  title: 'Réservez',
                  copy: 'L’offre, les livrables et les conditions sont affichés avant validation. Votre réservation déclenche automatiquement la suite.',
                  meta: 'Paiement sécurisé · Confirmation instantanée',
                  accent: '#a66cff',
                  glow: '166 108 255',
                  icon: bookingIcon()
                })}
                ${stepMarkup({
                  index: '04',
                  kicker: 'Vous n’arrivez pas à froid',
                  title: 'Préparation',
                  copy: 'Votre espace client vous guide pour préparer les idées fortes. Pas de texte à apprendre, pas de caméra à gérer.',
                  meta: 'Guidé avant le tournage',
                  accent: '#ed67d8',
                  glow: '237 103 216',
                  icon: preparationIcon()
                })}
                ${stepMarkup({
                  index: '05',
                  kicker: 'Le plateau est prêt',
                  title: 'Jour J',
                  copy: 'L’équipe, la lumière et la réalisation sont en place. L’interviewer vous guide : vous restez concentré sur ce que vous avez à dire.',
                  meta: 'Vous parlez · Neptune produit',
                  accent: '#ff719f',
                  glow: '255 113 159',
                  icon: studioIcon()
                })}
                ${stepMarkup({
                  index: '06',
                  kicker: 'Tout est centralisé',
                  title: 'Prêt à publier',
                  copy: 'Votre émission et les contenus prévus arrivent dans votre espace client, organisés et directement exploitables sur vos supports.',
                  meta: 'Livraison suivie dans votre espace',
                  accent: '#ffbe68',
                  glow: '255 190 104',
                  icon: deliveryIcon(),
                  action: '<a class="np-card-action" data-funnel data-track="pipeline_reservation" href="https://media.neptunebusiness.com/">Je réserve mon passage <span aria-hidden="true">↗</span></a>'
                })}
              </div>
            </div>

            <div class="np-controls">
              <div class="np-progress-copy" aria-live="polite">
                <strong data-pipeline-status>01 / 06</strong>
                <span data-pipeline-label>Choisissez votre format</span>
              </div>
              <div class="np-progress-rail" aria-hidden="true"><span data-pipeline-fill></span></div>
              <div class="np-step-nav" role="navigation" aria-label="Aller à une étape du parcours">
                ${['Choisir le format', 'Choisir la date', 'Réserver', 'Se préparer', 'Jour J', 'Recevoir les contenus']
                  .map((label, index) => `<button type="button" data-pipeline-dot="${index}" aria-label="${label}"${index === 0 ? ' aria-current="step"' : ''}><span>${String(index + 1).padStart(2, '0')}</span></button>`)
                  .join('')}
              </div>
              <span class="np-scroll-hint" aria-hidden="true">Faites défiler <i></i></span>
            </div>
          </div>
        </div>
      </div>`;
  }

  function stepMarkup({ index, kicker, title, copy, meta, accent, glow, icon, action = '' }) {
    return `
      <article class="np-step" data-pipeline-step style="--step-accent:${accent};--step-glow:${glow};" aria-hidden="${index === '01' ? 'false' : 'true'}">
        <span class="np-step-number" aria-hidden="true">${index}</span>
        <div class="np-visual" aria-hidden="true">
          <span class="np-visual-orbit np-visual-orbit--outer"></span>
          <span class="np-visual-orbit np-visual-orbit--inner"></span>
          <span class="np-visual-shadow"></span>
          <div class="np-icon-core">${icon}</div>
        </div>
        <div class="np-step-copy">
          <small>${kicker}</small>
          <h3>${title}</h3>
          <p>${copy}</p>
          <span class="np-step-meta"><i aria-hidden="true"></i>${meta}</span>
          ${action}
        </div>
      </article>`;
  }

  function initialisePipeline(section) {
    const shell = section.querySelector('[data-pipeline-shell]');
    const steps = [...section.querySelectorAll('[data-pipeline-step]')];
    const dots = [...section.querySelectorAll('[data-pipeline-dot]')];
    const fill = section.querySelector('[data-pipeline-fill]');
    const status = section.querySelector('[data-pipeline-status]');
    const label = section.querySelector('[data-pipeline-label]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 768px)');
    const labels = steps.map((step) => step.querySelector('h3')?.textContent || 'Étape');
    let activeIndex = -1;
    let ticking = false;
    let mobileObserver = null;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function setActive(index, force = false) {
      const next = clamp(index, 0, steps.length - 1);
      if (!force && next === activeIndex) return;
      activeIndex = next;

      steps.forEach((step, stepIndex) => {
        const active = stepIndex === next;
        step.dataset.active = String(active);
        step.setAttribute('aria-hidden', desktop.matches && !reducedMotion.matches ? String(!active) : 'false');
        const action = step.querySelector('a,button');
        if (action) action.tabIndex = desktop.matches && !reducedMotion.matches && !active ? -1 : 0;
      });

      dots.forEach((dot, dotIndex) => {
        if (dotIndex === next) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });

      if (status) status.textContent = `${String(next + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      if (label) label.textContent = labels[next];
      section.style.setProperty('--active-step', String(next));
    }

    function renderDesktop() {
      const rect = shell.getBoundingClientRect();
      const scrollRange = Math.max(1, shell.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / scrollRange, 0, 1);
      const position = progress * (steps.length - 1);
      const spread = Math.min(window.innerWidth * 0.38, 510);

      section.style.setProperty('--pipeline-progress', progress.toFixed(4));
      if (fill) fill.style.transform = `scaleX(${progress})`;

      steps.forEach((step, index) => {
        const delta = index - position;
        const distance = Math.abs(delta);
        const x = delta * spread;
        const z = 72 - distance * 315;
        const y = Math.min(distance * 26 + distance * distance * 3, 90);
        const rotateY = clamp(delta * -17, -42, 42);
        const rotateX = clamp(distance * 2.4, 0, 8);
        const scale = clamp(1 - distance * 0.135, 0.66, 1);
        const opacity = clamp(1 - distance * 0.48, 0.05, 1);
        const blur = clamp(distance * 2.25, 0, 6);

        step.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        step.style.opacity = opacity.toFixed(3);
        step.style.filter = `blur(${blur.toFixed(2)}px)`;
        step.style.zIndex = String(100 - Math.round(distance * 10));
        step.style.pointerEvents = distance < 0.52 ? 'auto' : 'none';
      });

      setActive(Math.round(position));
    }

    function resetInlineStyles() {
      steps.forEach((step) => {
        step.style.removeProperty('transform');
        step.style.removeProperty('opacity');
        step.style.removeProperty('filter');
        step.style.removeProperty('z-index');
        step.style.removeProperty('pointer-events');
      });
      if (fill) fill.style.removeProperty('transform');
    }

    function requestRender() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (desktop.matches && !reducedMotion.matches) renderDesktop();
      });
    }

    function bindMobileObserver() {
      mobileObserver?.disconnect();
      mobileObserver = null;
      if (desktop.matches && !reducedMotion.matches) return;
      resetInlineStyles();
      setActive(0, true);
      if (!('IntersectionObserver' in window)) return;
      mobileObserver = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = steps.indexOf(visible.target);
        if (index >= 0) {
          setActive(index);
          if (fill) fill.style.transform = `scaleX(${index / (steps.length - 1)})`;
        }
      }, { rootMargin: '-25% 0px -45% 0px', threshold: [0.15, 0.4, 0.7] });
      steps.forEach((step) => mobileObserver.observe(step));
    }

    function goTo(index) {
      const next = clamp(index, 0, steps.length - 1);
      if (desktop.matches && !reducedMotion.matches) {
        const shellTop = window.scrollY + shell.getBoundingClientRect().top;
        const scrollRange = Math.max(1, shell.offsetHeight - window.innerHeight);
        window.scrollTo({
          top: shellTop + (next / (steps.length - 1)) * scrollRange,
          behavior: 'smooth'
        });
      } else {
        steps[next].scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
      }
    }

    dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));

    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender, { passive: true });
    desktop.addEventListener?.('change', () => {
      bindMobileObserver();
      requestRender();
    });
    reducedMotion.addEventListener?.('change', () => {
      bindMobileObserver();
      requestRender();
    });

    section.classList.add('is-ready');
    bindMobileObserver();
    if (desktop.matches && !reducedMotion.matches) renderDesktop();
    else requestRender();
  }

  function formatIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="29" y="42" width="94" height="63" rx="12"/><rect x="57" y="70" width="94" height="67" rx="12"/><path d="m92 88 22 14-22 14V88Z"/><path d="M45 121h35M45 133h22"/></svg>`;
  }

  function calendarIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="34" y="39" width="112" height="106" rx="17"/><path d="M34 70h112M65 29v22M115 29v22"/><path d="M57 91h14M83 91h14M109 91h14M57 115h14M83 115h14"/><circle cx="116" cy="122" r="17"/><path d="m108 122 6 6 11-13"/></svg>`;
  }

  function bookingIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="29" y="51" width="122" height="80" rx="18"/><path d="M29 76h122M48 104h35"/><path d="M119 38c12 8 22 9 22 9v22c0 17-10 28-22 34-12-6-22-17-22-34V47s10-1 22-9Z"/><path d="m109 69 7 7 14-16"/></svg>`;
  }

  function preparationIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="40" y="29" width="100" height="128" rx="17"/><path d="M69 29v-7h42v7M65 63h49M65 91h49M65 119h34"/><path d="m53 62 5 5 8-10M53 90l5 5 8-10M53 118l5 5 8-10"/><path d="M114 118h13M120.5 111.5v13"/></svg>`;
  }

  function studioIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="55" y="55" width="70" height="55" rx="13"/><path d="m125 70 27-14v53l-27-14M78 110v24M63 134h30"/><circle cx="90" cy="82" r="15"/><path d="M41 31v30M27 61h28M139 31v30M125 61h28"/><path d="M29 31h24l-5 16H34l-5-16ZM127 31h24l-5 16h-14l-5-16Z"/></svg>`;
  }

  function deliveryIcon() {
    return `<svg viewBox="0 0 180 180" fill="none"><rect x="27" y="35" width="126" height="97" rx="16"/><path d="M27 61h126M46 49h1M58 49h1M70 49h1"/><rect x="45" y="78" width="41" height="33" rx="7"/><path d="m60 86 14 9-14 9V86ZM99 81h35M99 95h27M99 109h20"/><path d="M68 145h44M90 132v13"/><circle cx="139" cy="126" r="19"/><path d="m130 126 7 7 13-16"/></svg>`;
  }
})();
