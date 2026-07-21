(() => {
  'use strict';

  if (document.documentElement.dataset.scrollPipelineV2Bound === '1') return;
  document.documentElement.dataset.scrollPipelineV2Bound = '1';

  const STEPS = [
    {
      number: '01',
      kicker: 'Votre point de départ',
      title: 'Choisissez le format',
      copy: 'Hors Norme pour raconter ce qui vous a construit. Concept Libre pour mettre en scène une expertise, une offre ou une idée.',
      meta: '2 formats · 1 décision claire',
      accent: '#56dcff',
      rgb: '86 220 255',
      icon: formatIcon()
    },
    {
      number: '02',
      kicker: 'Votre agenda',
      title: 'Choisissez la date',
      copy: 'Les prochains passages disponibles sont affichés immédiatement. Vous sélectionnez simplement le créneau qui vous convient.',
      meta: 'Créneaux visibles en temps réel',
      accent: '#667dff',
      rgb: '102 125 255',
      icon: calendarIcon()
    },
    {
      number: '03',
      kicker: 'Votre place est confirmée',
      title: 'Réservez',
      copy: 'L’offre, les livrables et les conditions restent visibles avant validation. La confirmation déclenche automatiquement la suite.',
      meta: 'Paiement sécurisé · Confirmation immédiate',
      accent: '#9b62ff',
      rgb: '155 98 255',
      icon: bookingIcon()
    },
    {
      number: '04',
      kicker: 'Vous n’arrivez pas à froid',
      title: 'Préparation',
      copy: 'Votre espace client vous guide pour faire ressortir les idées fortes. Aucun texte à réciter et aucune technique à gérer.',
      meta: 'Préparé sans être formaté',
      accent: '#df55df',
      rgb: '223 85 223',
      icon: preparationIcon()
    },
    {
      number: '05',
      kicker: 'Le plateau est prêt',
      title: 'Jour J',
      copy: 'L’équipe, la lumière et la réalisation sont en place. L’interviewer vous guide pendant que Neptune prend en charge la production.',
      meta: 'Vous parlez · Neptune produit',
      accent: '#ff609f',
      rgb: '255 96 159',
      icon: studioIcon()
    },
    {
      number: '06',
      kicker: 'Tout est centralisé',
      title: 'Prêt à publier',
      copy: 'Votre émission et les contenus prévus arrivent organisés dans votre espace client, prêts à être utilisés sur vos supports.',
      meta: 'Livraison suivie dans votre espace',
      accent: '#ffb45f',
      rgb: '255 180 95',
      icon: deliveryIcon(),
      action: '<a class="npv2-action" data-funnel data-track="pipeline_reservation" href="https://media.neptunebusiness.com/">Je réserve mon passage <span aria-hidden="true">↗</span></a>'
    }
  ];

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const current = document.querySelector('.neptune-scroll-pipeline#parcours');
    const original = document.querySelector('.inner-voice-section#probleme');
    const target = current || original;
    if (!target) return;

    const section = document.createElement('section');
    section.className = 'neptune-scroll-pipeline neptune-scroll-pipeline--v2';
    section.id = 'parcours';
    section.dataset.aidaStage = 'interest';
    section.setAttribute('aria-labelledby', 'npv2-title');
    section.innerHTML = pipelineMarkup();
    target.replaceWith(section);

    document.querySelectorAll('a[href="#experience"],a[href="#probleme"]').forEach((link) => {
      link.setAttribute('href', '#parcours');
    });

    initialisePipeline(section);
  });

  function pipelineMarkup() {
    return `
      <div class="npv2-shell" data-pipeline-shell>
        <div class="npv2-sticky">
          <div class="npv2-background" aria-hidden="true">
            <span class="npv2-beam npv2-beam--one"></span>
            <span class="npv2-beam npv2-beam--two"></span>
            <span class="npv2-grid-lines"></span>
          </div>

          <div class="container npv2-wrap">
            <header class="npv2-head">
              <div>
                <span class="npv2-eyebrow"><i aria-hidden="true"></i> De la réservation à la publication</span>
                <h2 id="npv2-title">Six étapes. <span>Zéro zone floue.</span></h2>
              </div>
              <p>Faites défiler. La barre se remplit pendant que Neptune transforme votre réservation en contenus prêts à publier.</p>
            </header>

            <div class="npv2-experience">
              <aside class="npv2-showcase" aria-live="polite">
                <div class="npv2-showcase-top">
                  <span data-pipeline-status>01 / 06</span>
                  <span>Votre parcours Neptune</span>
                </div>

                <div class="npv2-portal" aria-hidden="true">
                  <span class="npv2-ring npv2-ring--outer"></span>
                  <span class="npv2-ring npv2-ring--middle"></span>
                  <span class="npv2-ring npv2-ring--inner"></span>
                  <span class="npv2-portal-glow"></span>
                  <div class="npv2-visuals">
                    ${STEPS.map((step, index) => `
                      <div class="npv2-visual${index === 0 ? ' is-active' : ''}" data-pipeline-visual="${index}" style="--step-accent:${step.accent};--step-rgb:${step.rgb};" aria-hidden="${index === 0 ? 'false' : 'true'}">
                        <span class="npv2-visual-number">${step.number}</span>
                        <div class="npv2-icon">${step.icon}</div>
                      </div>`).join('')}
                  </div>
                </div>

                <div class="npv2-current-copy">
                  <span data-pipeline-kicker>${STEPS[0].kicker}</span>
                  <strong data-pipeline-title>${STEPS[0].title}</strong>
                  <small data-pipeline-meta>${STEPS[0].meta}</small>
                </div>

                <span class="npv2-scroll-cue" aria-hidden="true"><i></i> Faites défiler</span>
              </aside>

              <div class="npv2-timeline" data-pipeline-timeline aria-label="Les six étapes de votre parcours Neptune Media">
                <div class="npv2-progress-line" data-pipeline-line aria-hidden="true">
                  <span class="npv2-progress-fill" data-pipeline-fill></span>
                  <i class="npv2-progress-pulse" data-pipeline-pulse></i>
                </div>

                <div class="npv2-steps" role="list">
                  ${STEPS.map((step, index) => stepMarkup(step, index)).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function stepMarkup(step, index) {
    return `
      <article class="npv2-step" role="listitem" data-pipeline-step data-state="${index === 0 ? 'active' : 'upcoming'}" style="--step-accent:${step.accent};--step-rgb:${step.rgb};">
        <button class="npv2-marker" type="button" data-pipeline-go="${index}" aria-label="Aller à l’étape ${index + 1} : ${step.title}"${index === 0 ? ' aria-current="step"' : ''}>
          <span>${step.number}</span>
        </button>
        <div class="npv2-step-copy">
          <small>${step.kicker}</small>
          <h3>${step.title}</h3>
          <p>${step.copy}</p>
          <span class="npv2-meta"><i aria-hidden="true"></i>${step.meta}</span>
          ${step.action || ''}
        </div>
      </article>`;
  }

  function initialisePipeline(section) {
    const shell = section.querySelector('[data-pipeline-shell]');
    const timeline = section.querySelector('[data-pipeline-timeline]');
    const line = section.querySelector('[data-pipeline-line]');
    const fill = section.querySelector('[data-pipeline-fill]');
    const pulse = section.querySelector('[data-pipeline-pulse]');
    const steps = [...section.querySelectorAll('[data-pipeline-step]')];
    const visuals = [...section.querySelectorAll('[data-pipeline-visual]')];
    const controls = [...section.querySelectorAll('[data-pipeline-go]')];
    const status = section.querySelector('[data-pipeline-status]');
    const currentKicker = section.querySelector('[data-pipeline-kicker]');
    const currentTitle = section.querySelector('[data-pipeline-title]');
    const currentMeta = section.querySelector('[data-pipeline-meta]');
    const desktop = matchMedia('(min-width: 768px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    if (!shell || !timeline || !line || !fill || !pulse || !steps.length) return;

    const metrics = { start: 0, range: 1, lineHeight: 1 };
    let targetProgress = 0;
    let renderedProgress = 0;
    let activeIndex = -1;
    let animationFrame = 0;
    let measureFrame = 0;
    let lastTime = performance.now();
    let sectionIsNear = true;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function measure() {
      measureFrame = 0;
      const pageY = window.scrollY || window.pageYOffset || 0;

      if (desktop.matches && !reducedMotion.matches) {
        const rect = shell.getBoundingClientRect();
        metrics.start = pageY + rect.top;
        metrics.range = Math.max(1, shell.offsetHeight - window.innerHeight);
      } else {
        const rect = timeline.getBoundingClientRect();
        const timelineTop = pageY + rect.top;
        metrics.start = timelineTop - window.innerHeight * 0.56;
        metrics.range = Math.max(1, rect.height - window.innerHeight * 0.18);
      }

      metrics.lineHeight = Math.max(1, line.getBoundingClientRect().height);
      updateTarget();
      startAnimation();
    }

    function scheduleMeasure() {
      if (measureFrame) return;
      measureFrame = requestAnimationFrame(measure);
    }

    function updateTarget() {
      const pageY = window.scrollY || window.pageYOffset || 0;
      targetProgress = clamp((pageY - metrics.start) / metrics.range, 0, 1);
    }

    function startAnimation() {
      if (animationFrame || !sectionIsNear) return;
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }

    function animate(now) {
      animationFrame = 0;
      const delta = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const smoothing = reducedMotion.matches ? 1 : 1 - Math.exp(-delta * 13.5);
      renderedProgress += (targetProgress - renderedProgress) * smoothing;

      if (Math.abs(targetProgress - renderedProgress) < 0.00035) {
        renderedProgress = targetProgress;
      }

      render(renderedProgress);

      if (renderedProgress !== targetProgress && sectionIsNear) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    function render(progress) {
      const precise = progress.toFixed(5);
      fill.style.transform = `scaleY(${precise})`;
      pulse.style.transform = `translate3d(-50%, ${(progress * metrics.lineHeight - 7.5).toFixed(2)}px, 0)`;

      const nextIndex = clamp(Math.round(progress * (steps.length - 1)), 0, steps.length - 1);
      setActive(nextIndex);
    }

    function setActive(index, force = false) {
      if (!force && index === activeIndex) return;
      activeIndex = index;

      steps.forEach((step, stepIndex) => {
        step.dataset.state = stepIndex === index ? 'active' : stepIndex < index ? 'done' : 'upcoming';
      });

      controls.forEach((control, controlIndex) => {
        if (controlIndex === index) control.setAttribute('aria-current', 'step');
        else control.removeAttribute('aria-current');
      });

      visuals.forEach((visual, visualIndex) => {
        const active = visualIndex === index;
        visual.classList.toggle('is-active', active);
        visual.setAttribute('aria-hidden', String(!active));
      });

      const step = STEPS[index];
      if (status) status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`;
      if (currentKicker) currentKicker.textContent = step.kicker;
      if (currentTitle) currentTitle.textContent = step.title;
      if (currentMeta) currentMeta.textContent = step.meta;
      section.style.setProperty('--active-rgb', step.rgb);
    }

    function goTo(index) {
      const next = clamp(index, 0, steps.length - 1);
      if (desktop.matches && !reducedMotion.matches) {
        window.scrollTo({
          top: metrics.start + (next / (steps.length - 1)) * metrics.range,
          behavior: 'smooth'
        });
      } else {
        steps[next].scrollIntoView({
          behavior: reducedMotion.matches ? 'auto' : 'smooth',
          block: 'center'
        });
      }
    }

    controls.forEach((control, index) => control.addEventListener('click', () => goTo(index)));

    window.addEventListener('scroll', () => {
      if (!sectionIsNear) return;
      updateTarget();
      startAnimation();
    }, { passive: true });

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    window.addEventListener('orientationchange', scheduleMeasure, { passive: true });
    window.addEventListener('load', scheduleMeasure, { once: true });

    desktop.addEventListener?.('change', scheduleMeasure);
    reducedMotion.addEventListener?.('change', () => {
      scheduleMeasure();
      setActive(activeIndex < 0 ? 0 : activeIndex, true);
    });

    if ('IntersectionObserver' in window) {
      const proximityObserver = new IntersectionObserver(([entry]) => {
        sectionIsNear = entry.isIntersecting;
        if (sectionIsNear) {
          updateTarget();
          startAnimation();
        } else if (animationFrame) {
          cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      }, { rootMargin: '120% 0px 120% 0px', threshold: 0 });
      proximityObserver.observe(section);
    }

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(shell);
      resizeObserver.observe(timeline);
    }

    document.fonts?.ready?.then(scheduleMeasure).catch(() => {});

    setActive(0, true);
    measure();
    section.classList.add('is-ready');
  }

  function formatIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="29" y="42" width="94" height="63" rx="12"/><rect x="57" y="70" width="94" height="67" rx="12"/><path d="m92 88 22 14-22 14V88Z"/><path d="M45 121h35M45 133h22"/></svg>';
  }

  function calendarIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="34" y="39" width="112" height="106" rx="17"/><path d="M34 70h112M65 29v22M115 29v22"/><path d="M57 91h14M83 91h14M109 91h14M57 115h14M83 115h14"/><circle cx="116" cy="122" r="17"/><path d="m108 122 6 6 11-13"/></svg>';
  }

  function bookingIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="29" y="51" width="122" height="80" rx="18"/><path d="M29 76h122M48 104h35"/><path d="M119 38c12 8 22 9 22 9v22c0 17-10 28-22 34-12-6-22-17-22-34V47s10-1 22-9Z"/><path d="m109 69 7 7 14-16"/></svg>';
  }

  function preparationIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="40" y="29" width="100" height="128" rx="17"/><path d="M69 29v-7h42v7M65 63h49M65 91h49M65 119h34"/><path d="m53 62 5 5 8-10M53 90l5 5 8-10M53 118l5 5 8-10"/><path d="M114 118h13M120.5 111.5v13"/></svg>';
  }

  function studioIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="55" y="55" width="70" height="55" rx="13"/><path d="m125 70 27-14v53l-27-14M78 110v24M63 134h30"/><circle cx="90" cy="82" r="15"/><path d="M41 31v30M27 61h28M139 31v30M125 61h28"/><path d="M29 31h24l-5 16H34l-5-16ZM127 31h24l-5 16h-14l-5-16Z"/></svg>';
  }

  function deliveryIcon() {
    return '<svg viewBox="0 0 180 180" fill="none"><rect x="27" y="35" width="126" height="97" rx="16"/><path d="M27 61h126M46 49h1M58 49h1M70 49h1"/><rect x="45" y="78" width="41" height="33" rx="7"/><path d="m60 86 14 9-14 9V86ZM99 81h35M99 95h27M99 109h20"/><path d="M68 145h44M90 132v13"/><circle cx="139" cy="126" r="19"/><path d="m130 126 7 7 13-16"/></svg>';
  }
})();
