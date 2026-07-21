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

    section.classList.add('problem-solution-section--chat');
    installChatStyles();
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
      const readingLine = viewportHeight * (window.innerWidth <= 760 ? 0.5 : 0.54);
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
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

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

      const problemCard = step.querySelector('.problem-card');
      const responseCard = step.querySelector('.response-card');
      const problem = problemCard?.querySelector('blockquote');
      const answer = responseCard?.querySelector('h3');

      if (problem) problem.textContent = item.problem;
      if (answer) answer.textContent = item.answer;

      if (problemCard) problemCard.querySelector('.pair-label').textContent = 'Vous';
      if (responseCard) responseCard.querySelector('.pair-label').textContent = 'Réponse';

      step.querySelector('.problem-solution-link')?.remove();
      problemCard?.querySelectorAll(':scope > p').forEach((paragraph) => paragraph.remove());
      responseCard?.querySelectorAll(':scope > p').forEach((paragraph) => paragraph.remove());
    });

    if (conclusion) {
      conclusion.innerHTML = '<p>C’est un investissement, on le sait mais attendez de savoir la suite…</p>';
    }
  }

  function installChatStyles() {
    if (document.getElementById('problem-solution-chat-v5')) return;

    const style = document.createElement('style');
    style.id = 'problem-solution-chat-v5';
    style.textContent = `
      body[data-final-ux="v12"] .problem-solution-section--chat{
        padding:clamp(64px,6vw,90px) 0 clamp(70px,6vw,96px)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-head{
        width:min(920px,100%)!important;
        margin:0 auto clamp(28px,4vw,42px)!important;
        text-align:center!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-head .eyebrow{
        justify-content:center!important;
        margin-bottom:14px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-head h2{
        max-width:12ch!important;
        margin:0 auto!important;
        font-size:clamp(2.2rem,4.3vw,4.15rem)!important;
        line-height:1.02!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-subtitle{
        max-width:32ch!important;
        margin:14px auto 0!important;
        color:#e4ebf7!important;
        font-size:clamp(1.04rem,1.55vw,1.32rem)!important;
        font-weight:760!important;
        line-height:1.35!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-list{
        width:min(980px,100%)!important;
        margin:0 auto!important;
        display:grid!important;
        gap:16px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-list::before,
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-link{
        display:none!important;
        content:none!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-pair{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:10px!important;
        min-height:0!important;
        opacity:.22!important;
        filter:saturate(.75)!important;
        transition:opacity .45s ease,filter .45s ease!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-pair.is-active{
        opacity:1!important;
        filter:none!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-pair.is-past{
        opacity:.62!important;
        filter:saturate(.88)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card{
        position:relative!important;
        width:fit-content!important;
        max-width:min(74%,720px)!important;
        min-height:auto!important;
        padding:16px 20px 18px!important;
        border-radius:26px!important;
        box-shadow:0 16px 42px rgba(0,0,0,.22)!important;
        overflow:visible!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-card{
        justify-self:start!important;
        align-self:start!important;
        transform:translate3d(-28px,18px,0) scale(.985)!important;
        opacity:.25!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .response-card{
        justify-self:end!important;
        align-self:end!important;
        transform:translate3d(28px,18px,0) scale(.985)!important;
        opacity:.25!important;
        background:linear-gradient(155deg,rgba(8,27,39,.98),rgba(6,17,31,.99))!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-card::before,
      body[data-final-ux="v12"] .problem-solution-section--chat .response-card::before{
        opacity:.75!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-card::after,
      body[data-final-ux="v12"] .problem-solution-section--chat .response-card::after{
        content:""!important;
        position:absolute!important;
        width:18px!important;
        height:18px!important;
        bottom:16px!important;
        border:inherit!important;
        background:inherit!important;
        transform:rotate(45deg)!important;
        box-shadow:inherit!important;
        border-top:none!important;
        border-left:none!important;
        border-radius:2px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-card::after{
        left:18px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .response-card::after{
        right:18px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-pair.is-active .problem-solution-card,
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-pair.is-past .problem-solution-card{
        transform:none!important;
        opacity:1!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card-top{
        justify-content:flex-start!important;
        gap:10px!important;
        margin-bottom:10px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .pair-index,
      body[data-final-ux="v12"] .problem-solution-section--chat .pair-label{
        min-height:28px!important;
        padding:5px 10px!important;
        font-size:.62rem!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card blockquote,
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card h3{
        max-width:24ch!important;
        margin:0!important;
        color:#f8fbff!important;
        font-size:clamp(1.24rem,1.8vw,1.72rem)!important;
        font-weight:860!important;
        line-height:1.12!important;
        letter-spacing:-.038em!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card p,
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card .pair-note,
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-head .problem-solution-intro{
        display:none!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion{
        width:min(860px,100%)!important;
        margin:32px auto 0!important;
        padding:18px 22px!important;
        text-align:center!important;
        border-radius:999px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion strong{
        display:none!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion::before{
        width:84px!important;
        margin:0 auto 12px!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion p{
        margin:0!important;
        max-width:none!important;
        color:#f7f9ff!important;
        font-size:clamp(1.02rem,1.5vw,1.2rem)!important;
        font-weight:780!important;
        line-height:1.35!important;
        white-space:nowrap!important;
      }
      @media (max-width:760px){
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-head h2{
          max-width:12ch!important;
          font-size:clamp(2rem,11vw,3.15rem)!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-subtitle{
          max-width:24ch!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card{
          max-width:88%!important;
          padding:15px 17px 17px!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card blockquote,
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-card h3{
          max-width:none!important;
          font-size:clamp(1.15rem,5vw,1.42rem)!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion{
          border-radius:24px!important;
        }
        body[data-final-ux="v12"] .problem-solution-section--chat .problem-solution-conclusion p{
          white-space:normal!important;
        }
      }
    `;
    document.head.append(style);
  }
})();
