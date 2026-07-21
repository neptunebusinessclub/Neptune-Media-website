(() => {
  'use strict';

  if (document.documentElement.dataset.problemSolutionV3Bound === '1') return;
  document.documentElement.dataset.problemSolutionV3Bound = '1';

  const CONTENT = [
    {
      problem: '« Mon entreprise est sérieuse mais je suis inconnu de mon marché. »',
      answer: 'Nous réalisons des émissions qui attirent vos futurs clients naturellement.'
    },
    {
      problem: '« Je sais qu\'il faut publier mais je ne sais pas quoi dire. »',
      answer: 'Nous préparons les bons angles avant d\'allumer la caméra.'
    },
    {
      problem: '« Je n’ai pas le temps de filmer, monter et recommencer chaque semaine. »',
      answer: 'Et nous non plus. C’est pour ça que nous avons perfectionné le tout en une demi-journée.'
    },
    {
      problem: '« J’ai déjà payé pour de belles vidéos qui n’ont rien changé. »',
      answer: 'Ça fait mal… Ici, vos émissions tourneront sur Neptune TV en continu et vous garderez vos contenus réutilisables à l’infini.'
    }
  ];

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const section = document.querySelector('#probleme.problem-solution-section');
    if (!section) return;

    if (!document.querySelector('#experience.journey-curve-section')) {
      section.classList.add('inner-voice-section');
      delete document.documentElement.dataset.journeyCurveBound;
      const journeyScript = document.createElement('script');
      journeyScript.src = '/scroll-pipeline-v2.js?v=9';
      journeyScript.dataset.restoreJourney = '1';
      document.head.append(journeyScript);
    }

    section.classList.add('problem-solution-section--compact');
    installCompactStyles();
    updateCopy(section);

    const steps = [...section.querySelectorAll('[data-problem-solution-step]')];
    const conclusion = section.querySelector('[data-problem-solution-conclusion]');
    const projection = document.querySelector('[data-projection-card]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!steps.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      steps.forEach((step, index) => {
        step.classList.toggle('is-active', index === 0);
        step.classList.toggle('is-past', index > 0);
      });
      conclusion?.classList.add('is-visible');
      projection?.classList.add('is-visible');
      return;
    }

    let frame = 0;
    let activeIndex = -1;

    const updateActiveStep = () => {
      frame = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const readingLine = viewportHeight * (window.innerWidth <= 760 ? .5 : .53);
      let closestIndex = 0;
      let closestDistance = Infinity;

      steps.forEach((step, index) => {
        const rect = step.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - readingLine);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== activeIndex) {
        activeIndex = closestIndex;
        steps.forEach((step, index) => {
          step.classList.toggle('is-active', index === activeIndex);
          step.classList.toggle('is-past', index < activeIndex);
        });
      }
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateActiveStep);
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .2, rootMargin: '0px 0px -8% 0px' });

    if (conclusion) revealObserver.observe(conclusion);
    if (projection) revealObserver.observe(projection);

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    requestAnimationFrame(updateActiveStep);
  });

  function updateCopy(section) {
    const title = section.querySelector('.problem-solution-head h2');
    const subtitle = section.querySelector('.problem-solution-subtitle');
    const intro = section.querySelector('.problem-solution-intro');
    const steps = [...section.querySelectorAll('[data-problem-solution-step]')];
    const conclusion = section.querySelector('[data-problem-solution-conclusion]');

    if (title) title.textContent = 'Vous avez besoin d’être visible, pas de vous former.';
    if (subtitle) subtitle.textContent = 'Alors arrêtez de chercher des solutions épuisantes.';
    intro?.remove();

    steps.forEach((step, index) => {
      const item = CONTENT[index];
      if (!item) return;

      const problem = step.querySelector('.problem-card blockquote');
      const answer = step.querySelector('.response-card h3');
      if (problem) problem.textContent = item.problem;
      if (answer) answer.textContent = item.answer;
      step.querySelectorAll('.problem-solution-card > p').forEach((paragraph) => paragraph.remove());
    });

    if (conclusion) {
      conclusion.innerHTML = '<p>C’est un investissement, on le sait mais attendez de savoir la suite…</p>';
    }
  }

  function installCompactStyles() {
    if (document.getElementById('problem-solution-compact-v4')) return;

    const style = document.createElement('style');
    style.id = 'problem-solution-compact-v4';
    style.textContent = `
      body[data-final-ux="v12"] .problem-solution-section--compact{
        padding:clamp(64px,6vw,88px) 0 clamp(68px,6vw,92px)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-head{
        width:min(1080px,100%)!important;
        margin:0 auto clamp(30px,4vw,46px)!important;
        text-align:center!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-head h2{
        max-width:none!important;
        font-size:clamp(2.15rem,4.2vw,4.15rem)!important;
        line-height:1.02!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-subtitle{
        max-width:none!important;
        margin-top:14px!important;
        font-size:clamp(1.02rem,1.65vw,1.35rem)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-list{
        gap:clamp(14px,1.8vw,20px)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-pair{
        grid-template-columns:minmax(0,1fr) 56px minmax(0,1fr)!important;
        gap:14px!important;
        min-height:190px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-card{
        min-height:190px!important;
        padding:clamp(20px,2.3vw,28px)!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-card-top{
        margin-bottom:16px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-card blockquote,
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-card h3{
        max-width:28ch!important;
        font-size:clamp(1.28rem,1.85vw,1.75rem)!important;
        line-height:1.12!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-conclusion{
        width:min(1000px,100%)!important;
        margin:clamp(28px,4vw,42px) auto 0!important;
        padding:18px 24px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-conclusion::before{
        margin-bottom:12px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-conclusion p{
        max-width:none!important;
        margin:0 auto!important;
        color:#f7f9ff!important;
        font-size:clamp(1.02rem,1.55vw,1.28rem)!important;
        font-weight:760!important;
        line-height:1.35!important;
        white-space:nowrap!important;
      }
      @media (max-width:760px){
        body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-pair{
          grid-template-columns:1fr!important;
          gap:10px!important;
          min-height:0!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-link{
          min-height:38px!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-card{
          min-height:150px!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--compact .problem-solution-conclusion p{
          white-space:normal!important;
        }
      }
    `;
    document.head.append(style);
  }
})();