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
      progress: 0.25,
      colors: ['#6577ff', '#8b55ff'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="8" width="22" height="19" rx="4"/><path d="M10 5v6M22 5v6M5 13h22M11 18h4M18 18h3M11 22h3"/></svg>'
    },
    {
      number: '03',
      title: 'Préparer mon émission',
      copy: 'Quelques réponses guidées suffisent pour faire émerger les angles, idées et moments à raconter.',
      progress: 0.5,
      colors: ['#9b55ff', '#db4ed8'],
      icon: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 24.5 9.3 19 21 7.3a3 3 0 0 1 4.2 4.2L13.5 23.2 8 24.5Z"/><path d="m19 9 4 4M7 27h18"/></svg>'
    },
    {
      number: '04',
      title: 'Enregistrement au Studio',
      copy: 'Vous arrivez préparé. L’équipe, le plateau et l’interviewer prennent le relais pendant une demi-journée.',
      progress: 0.75,
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
    installJourneyOverrides();

    let section = document.querySelector('.journey-curve-section#experience');

    if (!section) {
      const anchor = document.querySelector('.inner-voice-section#probleme');
      if (!anchor) return;

      section = document.createElement('section');
      section.className = 'section journey-curve-section';
      section.id = 'experience';
      section.dataset.aidaStage = 'desire';
      section.dataset.journeyCurve = 'v5';
      section.setAttribute('aria-labelledby', 'journey-curve-title');
      section.innerHTML = journeyMarkup();
      anchor.before(section);
    }

    document.querySelectorAll('a[href="#parcours"]').forEach((link) => link.setAttribute('href', '#experience'));
    initialiseJourney(section);
  });

  function installJourneyOverrides() {
    if (document.getElementById('journey-curve-v3-overrides')) return;

    const style = document.createElement('style');
    style.id = 'journey-curve-v3-overrides';
    style.textContent = `
      .journey-curve-map{
        aspect-ratio:auto!important;
        height:clamp(980px,88vw,1120px)!important;
        min-height:980px!important;
      }
      .journey-curve-step--1{left:9.17%!important;top:9.26%!important}
      .journey-curve-step--2{left:35%!important;top:29.17%!important}
      .journey-curve-step--3{left:85.83%!important;top:49.07%!important}
      .journey-curve-step--4{left:68.33%!important;top:69.91%!important}
      .journey-curve-step--5{left:15.83%!important;top:91.67%!important}
      .journey-curve-card{width:clamp(220px,21vw,300px)!important}
      .journey-curve-step--1 .journey-curve-card{left:106px!important;right:auto!important;top:-20px!important;bottom:auto!important;text-align:left!important}
      .journey-curve-step--2 .journey-curve-card{right:106px!important;left:auto!important;top:-20px!important;bottom:auto!important;text-align:right!important}
      .journey-curve-step--3 .journey-curve-card{right:106px!important;left:auto!important;top:-20px!important;bottom:auto!important;text-align:right!important}
      .journey-curve-step--4 .journey-curve-card{left:106px!important;right:auto!important;top:-20px!important;bottom:auto!important;text-align:left!important}
      .journey-curve-step--5 .journey-curve-card{left:106px!important;right:auto!important;top:auto!important;bottom:-18px!important;text-align:left!important}
      @media (max-width:1080px){
        .journey-curve-map{height:clamp(920px,100vw,1020px)!important;min-height:920px!important}
        .journey-curve-card{width:220px!important}
      }
      @media (max-width:820px){
        .journey-curve-map{height:1040px!important;min-height:1040px!important}
        .journey-curve-step--1{left:17.78%!important;top:6.73%!important}
        .journey-curve-step--2{left:81.67%!important;top:26.92%!important}
        .journey-curve-step--3{left:18.89%!important;top:48.08%!important}
        .journey-curve-step--4{left:81.11%!important;top:69.23%!important}
        .journey-curve-step--5{left:19.44%!important;top:93.27%!important}
        .journey-curve-card{width:min(230px,calc(100vw - 150px))!important}
        .journey-curve-step:nth-child(odd) .journey-curve-card{left:88px!important;right:auto!important;top:50%!important;bottom:auto!important;text-align:left!important}
        .journey-curve-step:nth-child(even) .journey-curve-card{right:88px!important;left:auto!important;top:50%!important;bottom:auto!important;text-align:right!important}
      }
      @media (max-width:520px){
        .journey-curve-map{height:980px!important;min-height:980px!important}
        .journey-curve-card{width:min(205px,calc(100vw - 132px))!important}
        .journey-curve-step:nth-child(odd) .journey-curve-card{left:77px!important}
        .journey-curve-step:nth-child(even) .journey-curve-card{right:77px!important}
      }
    `;
    document.head.append(style);
  }

  function journeyMarkup() {
    return `
      <div class="container journey-curve-container">
        <header class="journey-curve-head">
          <span class="journey-curve-eyebrow"><i aria-hidden="true"></i> Votre parcours Neptune</span>
          <h2 id="journey-curve-title">Résultat : une demi-journée pour <em>3 mois de communication programmée.</em></h2>
          <p>Zéro prise de tête : quelques clics, puis laissez-vous guider.</p>
        </header>

        <div class="journey-curve-map" data-journey-map>
          <svg class="journey-curve-svg journey-curve-svg--desktop" viewBox="0 0 1200 1080" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            ${gradientDefinition('journey-gradient-desktop')}
            <path class="journey-curve-track" d="M110 100 C260 100 260 315 420 315 C650 315 760 530 1030 530 C1160 530 1120 755 820 755 C580 755 500 990 190 990"/>
            <path class="journey-curve-progress" data-journey-progress pathLength="1" stroke="url(#journey-gradient-desktop)" d="M110 100 C260 100 260 315 420 315 C650 315 760 530 1030 530 C1160 530 1120 755 820 755 C580 755 500 990 190 990"/>
          </svg>

          <svg class="journey-curve-svg journey-curve-svg--mobile" viewBox="0 0 360 1040" preserveAspectRatio="none" aria-hidden="true">
            ${gradientDefinition('journey-gradient-mobile')}
            <path class="journey-curve-track" d="M64 70 C300 105 65 235 294 280 C65 330 298 450 68 500 C300 550 68 670 292 720 C70 790 300 915 70 970"/>
            <path class="journey-curve-progress" data-journey-progress pathLength="1" stroke="url(#journey-gradient-mobile)" d="M64 70 C300 105 65 235 294 280 C65 330 298 450 68 500 C300 550 68 670 292 720 C70 790 300 915 70 970"/>
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

    const map = section.querySelector('[data-journey-map]');
    const paths = [...section.querySelectorAll('[data-journey-progress]')];
    const steps = [...section.querySelectorAll('[data-journey-step]')];
    const nodes = steps.map((step) => step.querySelector('.journey-curve-node'));
    if (!map || !paths.length || !steps.length || nodes.some((node) => !node)) return;

    let frame = 0;
    let lastIndex = -1;
    let thresholds = steps.map((step) => Number(step.dataset.stepProgress || 0));

    paths.forEach((path) => {
      path.style.strokeDasharray = '1';
      path.style.strokeDashoffset = '1';
    });

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function activePath() {
      return paths.find((path) => {
        const svg = path.ownerSVGElement;
        const rect = svg?.getBoundingClientRect();
        return svg && getComputedStyle(svg).display !== 'none' && rect && rect.width > 0 && rect.height > 0;
      }) || paths[0];
    }

    function calibrateThresholds() {
      const path = activePath();
      const matrix = path.getScreenCTM?.();
      const totalLength = path.getTotalLength?.();
      if (!matrix || !Number.isFinite(totalLength) || totalLength <= 0) return;

      const samples = 520;
      const points = [];
      for (let index = 0; index <= samples; index += 1) {
        const distance = totalLength * (index / samples);
        const point = path.getPointAtLength(distance);
        points.push({
          progress: distance / totalLength,
          x: point.x * matrix.a + point.y * matrix.c + matrix.e,
          y: point.x * matrix.b + point.y * matrix.d + matrix.f
        });
      }

      const measured = nodes.map((node, index) => {
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let closest = points[0];
        let closestDistance = Infinity;

        points.forEach((point) => {
          const dx = point.x - centerX;
          const dy = point.y - centerY;
          const distance = dx * dx + dy * dy;
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = point;
          }
        });

        if (index === 0) return 0;
        if (index === nodes.length - 1) return 0.965;
        return closest.progress;
      });

      thresholds = measured.map((value, index) => {
        if (index === 0) return 0;
        if (index === measured.length - 1) return 0.965;
        return clamp(Math.max(value, measured[index - 1] + 0.06), 0, 0.92);
      });
    }

    function scrollProgress() {
      const mapRect = map.getBoundingClientRect();
      const firstRect = nodes[0].getBoundingClientRect();
      const lastRect = nodes[nodes.length - 1].getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;

      const firstOffset = firstRect.top - mapRect.top + firstRect.height / 2;
      const lastOffset = lastRect.top - mapRect.top + lastRect.height / 2;
      const firstCenter = mapRect.top + firstOffset;

      const startLine = viewport * 0.78;
      const completionLine = viewport * (window.innerWidth <= 820 ? 0.86 : 0.82);
      const travel = Math.max(1, (lastOffset - firstOffset) + startLine - completionLine);

      return clamp((startLine - firstCenter) / travel, 0, 1);
    }

    function update() {
      frame = 0;
      const rawProgress = scrollProgress();
      const endBoost = rawProgress > 0.68
        ? ((rawProgress - 0.68) / 0.32) * 0.14
        : 0;
      const visualProgress = Number(clamp(rawProgress + endBoost, 0, 1).toFixed(4));

      paths.forEach((path) => {
        path.style.strokeDashoffset = String(1 - visualProgress);
      });
      section.style.setProperty('--journey-progress', String(visualProgress));

      let currentIndex = 0;
      thresholds.forEach((threshold, index) => {
        if (visualProgress + 0.006 >= threshold) currentIndex = index;
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

    function recalibrate() {
      requestAnimationFrame(() => {
        calibrateThresholds();
        requestUpdate();
      });
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', recalibrate, { passive: true });

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(recalibrate);
      observer.observe(map);
    }

    requestAnimationFrame(() => {
      calibrateThresholds();
      update();
    });
  }
})();