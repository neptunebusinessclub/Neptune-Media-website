(() => {
  'use strict';

  if (document.documentElement.dataset.journeyCurveBound === '1') return;
  document.documentElement.dataset.journeyCurveBound = '1';

  const STEPS = [
    {
      number: '01',
      title: 'Choisir mon format',
      copy: 'Hors Norme ou Concept Libre : choisissez la façon la plus juste de raconter votre entreprise.',
      progress: 0,
      colors: ['#2dd4ff', '#446dff'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="7" width="22" height="18" rx="4"/><path d="M11 12h10M11 16h6M11 20h8"/></svg>'
    },
    {
      number: '02',
      title: 'Réserver mon créneau',
      copy: 'Sélectionnez la date qui vous convient. Votre passage et la suite du parcours sont confirmés.',
      progress: 0.24,
      colors: ['#6577ff', '#8b55ff'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="8" width="22" height="19" rx="4"/><path d="M10 5v6M22 5v6M5 13h22M11 18h4M18 18h3M11 22h3"/></svg>'
    },
    {
      number: '03',
      title: 'Préparer mon émission',
      copy: 'Quelques réponses guidées suffisent pour faire émerger les angles, idées et moments à raconter.',
      progress: 0.51,
      colors: ['#9b55ff', '#db4ed8'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 24.5 9.3 19 21 7.3a3 3 0 0 1 4.2 4.2L13.5 23.2 8 24.5Z"/><path d="m19 9 4 4M7 27h18"/></svg>'
    },
    {
      number: '04',
      title: 'Enregistrement au Studio',
      copy: 'Vous arrivez préparé. L’équipe, le plateau et l’interviewer prennent le relais pendant une demi-journée.',
      progress: 0.76,
      colors: ['#ef4fba', '#ff647f'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="8" width="24" height="17" rx="4"/><circle cx="12" cy="16.5" r="4"/><path d="M20 13h4M20 17h4M20 21h3"/></svg>'
    },
    {
      number: '05',
      title: 'Contenus prêts à être publiés',
      copy: 'Votre émission et vos contenus courts sont organisés pour alimenter jusqu’à trois mois de communication.',
      progress: 1,
      colors: ['#ff7a68', '#ffb23f'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="6" width="22" height="20" rx="4"/><path d="m13 12 8 4.5-8 4.5v-9Z"/><path d="M22 5v4M20 7h4"/></svg>'
    }
  ];

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    let section = document.querySelector('.journey-curve-section#experience');

    // Le parcours doit se trouver exactement avant la section « Ce que vous vous dites déjà ».
    // Si le HTML statique n'est pas présent, ce fallback l'insère sans remplacer la section suivante.
    if (!section) {
      const anchor = document.querySelector('.inner-voice-section#probleme');
      if (!anchor) return;

      section = document.createElement('section');
      section.className = 'section journey-curve-section';
      section.id = 'experience';
      section.dataset.aidaStage = 'desire';
      section.dataset.journeyCurve = 'v2';
      section.setAttribute('aria-labelledby', 'journey-curve-title');
      section.innerHTML = journeyMarkup();
      anchor.before(section);
    }

    document.querySelectorAll('a[href="#parcours"]').forEach((link) => link.setAttribute('href', '#experience'));
    initialiseJourney(section);
  });

  function journeyMarkup() {
    return `
      <div class="container journey-curve-container">
        <header class="journey-curve-head">
          <span class="journey-curve-eyebrow"><i aria-hidden="true"></i> Votre parcours Neptune</span>
          <h2 id="journey-curve-title">Résultat : une demi-journée pour <em>3 mois de communication programmée.</em></h2>
          <p>Zéro prise de tête : quelques clics, puis laissez-vous guider.</p>
        </header>

        <div class="journey-curve-map" data-journey-map>
          <svg class="journey-curve-svg journey-curve-svg--desktop" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            ${gradientDefinition('journey-gradient-desktop')}
            <path class="journey-curve-track" d="M110 110 C250 110 300 260 470 260 C690 260 760 160 1030 160 C1150 160 1140 520 880 520 C640 520 500 610 180 610"/>
            <path class="journey-curve-progress" data-journey-progress pathLength="1" stroke="url(#journey-gradient-desktop)" d="M110 110 C250 110 300 260 470 260 C690 260 760 160 1030 160 C1150 160 1140 520 880 520 C640 520 500 610 180 610"/>
          </svg>

          <svg class="journey-curve-svg journey-curve-svg--mobile" viewBox="0 0 360 850" preserveAspectRatio="none" aria-hidden="true">
            ${gradientDefinition('journey-gradient-mobile')}
            <path class="journey-curve-track" d="M64 62 C300 100 65 190 294 230 C65 280 298 370 68 410 C300 460 68 550 292 590 C70 650 300 740 70 790"/>
            <path class="journey-curve-progress" data-journey-progress pathLength="1" stroke="url(#journey-gradient-mobile)" d="M64 62 C300 100 65 190 294 230 C65 280 298 370 68 410 C300 460 68 550 292 590 C70 650 300 740 70 790"/>
          </svg>

          <ol class="journey-curve-steps" aria-label="Les cinq étapes de votre parcours Neptune Media">
            ${STEPS.map(stepMarkup).join('')}
          </ol>
        </div>

        <div class="journey-curve-summary" aria-label="Le résultat de votre passage">
          <span><b>1/2 journée</b><small>au Studio</small></span>
          <i aria-hidden="true"></i>
          <span><b>3 mois</b><small>de contenus programmés</small></span>
          <a data-funnel data-track="journey_reservation" href="https://media.neptunebusiness.com/">Choisir mon format <span aria-hidden="true">↗</span></a>
        </div>
      </div>`;
  }

  function gradientDefinition(id) {
    return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4ff"/><stop offset=".28" stop-color="#6577ff"/><stop offset=".52" stop-color="#a755ff"/><stop offset=".76" stop-color="#ef4fba"/><stop offset="1" stop-color="#ffb23f"/></linearGradient></defs>`;
  }

  function stepMarkup(step, index) {
    const [start, end] = step.colors;
    return `
      <li class="journey-curve-step journey-curve-step--${index + 1}${index === 0 ? ' is-current' : ''}"
          data-journey-step data-step-progress="${step.progress}"
          style="--step-start:${start};--step-end:${end};"${index === 0 ? ' aria-current="step"' : ''}>
        <div class="journey-curve-node" aria-hidden="true">
          <span class="journey-curve-number">${step.number}</span>
          <span class="journey-curve-icon">${step.icon}</span>
        </div>
        <div class="journey-curve-card">
          <small>Étape ${index + 1}</small>
          <h3>${step.title}</h3>
          <p>${step.copy}</p>
        </div>
      </li>`;
  }

  function initialiseJourney(section) {
    if (section.dataset.journeyInitialised === '1') return;
    section.dataset.journeyInitialised = '1';

    const paths = [...section.querySelectorAll('[data-journey-progress]')];
    const steps = [...section.querySelectorAll('[data-journey-step]')];
    if (!paths.length || !steps.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastIndex = -1;

    paths.forEach((path) => {
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
    });

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function update() {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      const start = viewport * 0.76;
      const end = viewport * 0.28;
      const travel = Math.max(1, rect.height + start - end);
      const progress = clamp((start - rect.top) / travel, 0, 1);
      const visualProgress = Number(progress.toFixed(4));

      paths.forEach((path) => {
        path.style.strokeDashoffset = String(1 - visualProgress);
      });
      section.style.setProperty('--journey-progress', String(visualProgress));

      let currentIndex = 0;
      steps.forEach((step, index) => {
        const threshold = Number(step.dataset.stepProgress || 0);
        if (visualProgress + 0.025 >= threshold) currentIndex = index;
      });

      if (currentIndex !== lastIndex) {
        lastIndex = currentIndex;
        steps.forEach((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          step.classList.toggle('is-done', done);
          step.classList.toggle('is-current', current);
          if (current) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
        });
      }
    }

    function requestUpdate() {
      if (frame) return;
      frame = requestAnimationFrame(update);
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    reducedMotion.addEventListener?.('change', requestUpdate);
    requestAnimationFrame(update);
  }
})();
