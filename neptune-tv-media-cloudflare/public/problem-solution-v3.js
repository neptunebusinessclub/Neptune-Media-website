(() => {
  'use strict';

  if (document.documentElement.dataset.problemChatV6Bound === '1') return;
  document.documentElement.dataset.problemChatV6Bound = '1';

  const exchanges = [
    {
      problem: '« Mon entreprise est sérieuse mais je suis inconnu de mon marché. »',
      answer: 'Nous réalisons des émissions qui attirent vos futurs clients naturellement.'
    },
    {
      problem: '« Je sais qu’il faut publier mais je ne sais pas quoi dire. »',
      answer: 'Nous préparons les bons angles avant d’allumer la caméra.'
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

    ensureJourneyBefore(section);
    renderChat(section);
    installStyles();
    initialiseReveal(section);
  });

  function ensureJourneyBefore(section) {
    const existingJourney = document.querySelector('#experience.journey-curve-section');
    if (existingJourney) {
      section.classList.remove('inner-voice-section');
      return;
    }

    section.classList.add('inner-voice-section');
    delete document.documentElement.dataset.journeyCurveBound;

    const script = document.createElement('script');
    script.src = '/scroll-pipeline-v2.js?v=10';
    script.dataset.restoreJourney = '1';
    script.addEventListener('load', () => {
      requestAnimationFrame(() => section.classList.remove('inner-voice-section'));
    }, { once: true });
    document.head.append(script);
  }

  function renderChat(section) {
    section.classList.remove('problem-solution-section--compact', 'problem-solution-section--chat', 'inner-voice-section');
    section.classList.add('problem-solution-section--chat-v6');

    const messages = exchanges.map((item, index) => `
      <article class="ps-chat-exchange" data-chat-exchange style="--chat-index:${index}">
        <div class="ps-chat-bubble ps-chat-bubble--problem">
          <span class="ps-chat-sender"><i aria-hidden="true"></i>Vous</span>
          <p>${item.problem}</p>
        </div>
        <div class="ps-chat-bubble ps-chat-bubble--answer">
          <span class="ps-chat-sender"><i aria-hidden="true"></i>Neptune Media</span>
          <p>${item.answer}</p>
        </div>
      </article>
    `).join('');

    section.innerHTML = `
      <div class="container ps-chat-container">
        <header class="ps-chat-header">
          <span class="eyebrow">Ce que vous vous dites déjà</span>
          <h2>Vous avez besoin d’être visible, pas de vous former.</h2>
          <p>Alors arrêtez de chercher des solutions épuisantes.</p>
        </header>

        <div class="ps-chat-thread" aria-label="Problèmes rencontrés et réponses de Neptune Media">
          ${messages}
        </div>

        <div class="ps-chat-conclusion" data-chat-conclusion>
          <span>C’est un investissement, on le sait mais attendez de savoir la suite…</span>
          <i aria-hidden="true">↓</i>
        </div>
      </div>
    `;
  }

  function initialiseReveal(section) {
    const exchanges = [...section.querySelectorAll('[data-chat-exchange]')];
    const conclusion = section.querySelector('[data-chat-conclusion]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      exchanges.forEach((exchange) => exchange.classList.add('is-visible'));
      conclusion?.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -12% 0px' });

    exchanges.forEach((exchange) => observer.observe(exchange));
    if (conclusion) observer.observe(conclusion);
  }

  function installStyles() {
    if (document.getElementById('problem-solution-chat-v6-styles')) return;

    const style = document.createElement('style');
    style.id = 'problem-solution-chat-v6-styles';
    style.textContent = `
      body[data-final-ux="v12"] .problem-solution-section--chat-v6{
        position:relative!important;
        overflow:hidden!important;
        padding:clamp(76px,7vw,108px) 0 clamp(80px,7vw,112px)!important;
        background:
          radial-gradient(circle at 15% 20%,rgba(53,196,255,.07),transparent 28rem),
          radial-gradient(circle at 84% 40%,rgba(140,87,255,.08),transparent 32rem),
          linear-gradient(180deg,#020611 0%,#050a17 52%,#020611 100%)!important;
      }
      body[data-final-ux="v12"] .problem-solution-section--chat-v6::before{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);
        background-size:58px 58px;
        mask-image:linear-gradient(180deg,transparent,#000 16%,#000 86%,transparent);
        opacity:.4;
      }
      body[data-final-ux="v12"] .ps-chat-container{
        position:relative;
        z-index:1;
        width:min(1120px,calc(100% - 32px))!important;
      }
      body[data-final-ux="v12"] .ps-chat-header{
        width:min(940px,100%);
        margin:0 auto clamp(42px,5vw,64px);
        text-align:center;
      }
      body[data-final-ux="v12"] .ps-chat-header .eyebrow{
        display:inline-flex!important;
        justify-content:center!important;
        margin:0 auto 16px!important;
      }
      body[data-final-ux="v12"] .ps-chat-header h2{
        max-width:18ch!important;
        margin:0 auto!important;
        color:#f8faff!important;
        font-size:clamp(2.5rem,5vw,5rem)!important;
        font-weight:920!important;
        line-height:.98!important;
        letter-spacing:-.058em!important;
        text-align:center!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .ps-chat-header>p{
        max-width:38ch!important;
        margin:18px auto 0!important;
        color:#d7e1ef!important;
        font-size:clamp(1.08rem,1.7vw,1.42rem)!important;
        font-weight:720!important;
        line-height:1.35!important;
        text-align:center!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .ps-chat-thread{
        width:min(960px,100%);
        margin:0 auto;
        display:grid;
        gap:clamp(28px,4vw,44px);
      }
      body[data-final-ux="v12"] .ps-chat-exchange{
        display:grid;
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
        gap:clamp(28px,6vw,84px);
        align-items:center;
        opacity:.16;
        transform:translateY(34px);
        transition:opacity .7s cubic-bezier(.2,.72,.2,1),transform .7s cubic-bezier(.2,.72,.2,1);
      }
      body[data-final-ux="v12"] .ps-chat-exchange.is-visible{
        opacity:1;
        transform:none;
      }
      body[data-final-ux="v12"] .ps-chat-bubble{
        position:relative;
        width:fit-content;
        max-width:100%;
        padding:18px 22px;
        border:1px solid rgba(255,255,255,.1);
        box-shadow:0 18px 48px rgba(0,0,0,.26);
        backdrop-filter:blur(14px);
      }
      body[data-final-ux="v12"] .ps-chat-bubble::after{
        content:"";
        position:absolute;
        bottom:16px;
        width:14px;
        height:14px;
        transform:rotate(45deg);
        background:inherit;
      }
      body[data-final-ux="v12"] .ps-chat-bubble--problem{
        justify-self:start;
        border-radius:24px 24px 24px 7px;
        background:linear-gradient(145deg,rgba(8,19,38,.96),rgba(6,13,28,.98));
        border-color:rgba(76,204,255,.22);
      }
      body[data-final-ux="v12"] .ps-chat-bubble--problem::after{
        left:-7px;
        border-left:1px solid rgba(76,204,255,.22);
        border-bottom:1px solid rgba(76,204,255,.22);
      }
      body[data-final-ux="v12"] .ps-chat-bubble--answer{
        justify-self:end;
        border-radius:24px 24px 7px 24px;
        background:linear-gradient(145deg,rgba(27,20,62,.98),rgba(10,25,42,.98));
        border-color:rgba(164,100,255,.35);
        box-shadow:0 20px 55px rgba(77,42,160,.2),0 0 0 1px rgba(95,222,203,.04);
        transition-delay:.12s;
      }
      body[data-final-ux="v12"] .ps-chat-bubble--answer::after{
        right:-7px;
        border-right:1px solid rgba(164,100,255,.35);
        border-top:1px solid rgba(164,100,255,.35);
      }
      body[data-final-ux="v12"] .ps-chat-sender{
        display:flex;
        align-items:center;
        gap:8px;
        margin-bottom:9px;
        color:#91a4bb;
        font-size:.68rem;
        font-weight:850;
        letter-spacing:.12em;
        text-transform:uppercase;
      }
      body[data-final-ux="v12"] .ps-chat-sender i{
        width:7px;
        height:7px;
        border-radius:50%;
        background:#4bd5ff;
        box-shadow:0 0 14px rgba(75,213,255,.7);
      }
      body[data-final-ux="v12"] .ps-chat-bubble--answer .ps-chat-sender{
        color:#c7b9ff;
      }
      body[data-final-ux="v12"] .ps-chat-bubble--answer .ps-chat-sender i{
        background:linear-gradient(135deg,#7d6bff,#ef58bd);
        box-shadow:0 0 16px rgba(178,91,255,.65);
      }
      body[data-final-ux="v12"] .ps-chat-bubble p{
        max-width:30ch!important;
        margin:0!important;
        color:#f7f9ff!important;
        font-size:clamp(1.22rem,2vw,1.8rem)!important;
        font-weight:850!important;
        line-height:1.13!important;
        letter-spacing:-.035em!important;
        text-wrap:balance!important;
      }
      body[data-final-ux="v12"] .ps-chat-conclusion{
        width:min(980px,100%);
        margin:clamp(46px,6vw,72px) auto 0;
        padding:22px 30px;
        display:flex;
        justify-content:center;
        align-items:center;
        gap:16px;
        border:1px solid rgba(108,201,255,.24);
        border-radius:999px;
        background:linear-gradient(100deg,rgba(11,31,57,.96),rgba(26,18,61,.96),rgba(48,17,55,.92));
        box-shadow:0 24px 70px rgba(0,0,0,.32),inset 0 1px rgba(255,255,255,.05);
        opacity:0;
        transform:translateY(26px) scale(.99);
        transition:opacity .7s cubic-bezier(.2,.72,.2,1),transform .7s cubic-bezier(.2,.72,.2,1);
      }
      body[data-final-ux="v12"] .ps-chat-conclusion.is-visible{
        opacity:1;
        transform:none;
      }
      body[data-final-ux="v12"] .ps-chat-conclusion span{
        color:#fff;
        font-size:clamp(1.05rem,1.7vw,1.35rem);
        font-weight:850;
        line-height:1.3;
        text-align:center;
        white-space:nowrap;
      }
      body[data-final-ux="v12"] .ps-chat-conclusion i{
        width:36px;
        height:36px;
        flex:0 0 36px;
        display:grid;
        place-items:center;
        border-radius:50%;
        color:#fff;
        font-style:normal;
        background:linear-gradient(135deg,#4a7dff,#c34fe0,#ff795a);
        box-shadow:0 0 28px rgba(145,74,255,.35);
      }
      @media (max-width:760px){
        body[data-final-ux="v12"] .problem-solution-section--chat-v6{
          padding:68px 0 78px!important;
        }
        body[data-final-ux="v12"] .ps-chat-container{
          width:min(100% - 24px,1120px)!important;
        }
        body[data-final-ux="v12"] .ps-chat-header h2{
          max-width:12ch!important;
          font-size:clamp(2.15rem,11vw,3.45rem)!important;
        }
        body[data-final-ux="v12"] .ps-chat-header>p{
          max-width:25ch!important;
        }
        body[data-final-ux="v12"] .ps-chat-thread{
          gap:28px;
        }
        body[data-final-ux="v12"] .ps-chat-exchange{
          grid-template-columns:1fr;
          gap:10px;
        }
        body[data-final-ux="v12"] .ps-chat-bubble{
          max-width:88%;
          padding:15px 17px 17px;
        }
        body[data-final-ux="v12"] .ps-chat-bubble p{
          max-width:none!important;
          font-size:clamp(1.12rem,5vw,1.4rem)!important;
        }
        body[data-final-ux="v12"] .ps-chat-conclusion{
          padding:20px;
          border-radius:26px;
        }
        body[data-final-ux="v12"] .ps-chat-conclusion span{
          white-space:normal;
        }
      }
      @media (prefers-reduced-motion:reduce){
        body[data-final-ux="v12"] .ps-chat-exchange,
        body[data-final-ux="v12"] .ps-chat-conclusion{
          opacity:1!important;
          transform:none!important;
          transition:none!important;
        }
      }
    `;
    document.head.append(style);
  }
})();