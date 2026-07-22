(() => {
  'use strict';

  const SELECTOR = '#experience-details, #experience';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let triggerObserver = null;

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    ensureStyles();
    mountGiftSection();

    const mutationObserver = new MutationObserver(() => mountGiftSection());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => mutationObserver.disconnect(), 6000);
  });

  function mountGiftSection() {
    const target = document.querySelector(SELECTOR);
    if (!target) return;
    if (target.classList.contains('gift-club-v2')) return;

    triggerObserver?.disconnect();

    const section = document.createElement('section');
    section.className = 'section gift-club-v2';
    section.id = 'experience-details';
    section.dataset.aidaStage = 'action';
    section.dataset.giftClubVersion = '2';
    section.innerHTML = `
      <div class="container gift-club-v2__inner">
        <header class="gift-club-v2__header">
          <span class="gift-club-v2__eyebrow">Attendez, ce n’est pas fini</span>
          <h2>Quoi&nbsp;? Vous êtes encore là&nbsp;?</h2>
          <p class="gift-club-v2__subtitle">C'est vrai on a oublié de vous offrir quelque chose...</p>
          <p class="gift-club-v2__copy">Parce qu'on croit que vous avez des affaires à faire au sein du réseau.</p>
        </header>

        <div class="gift-club-v2__stage" aria-label="Un cadeau révèle un an offert au Neptune Business Club">
          <div class="gift-club-v2__orbit gift-club-v2__orbit--one" aria-hidden="true"></div>
          <div class="gift-club-v2__orbit gift-club-v2__orbit--two" aria-hidden="true"></div>
          <div class="gift-club-v2__halo" aria-hidden="true"></div>

          <div class="gift-box-v2__float">
            <div class="gift-box-v2" aria-hidden="true">
              <span class="gift-box-v2__particle gift-box-v2__particle--1"></span>
              <span class="gift-box-v2__particle gift-box-v2__particle--2"></span>
              <span class="gift-box-v2__particle gift-box-v2__particle--3"></span>
              <span class="gift-box-v2__particle gift-box-v2__particle--4"></span>
              <span class="gift-box-v2__particle gift-box-v2__particle--5"></span>
              <span class="gift-box-v2__particle gift-box-v2__particle--6"></span>

              <div class="gift-box-v2__card">
                <span>Votre cadeau</span>
                <strong><em>1 an offert</em> au Neptune Business Club</strong>
              </div>

              <div class="gift-box-v2__lid">
                <span class="gift-box-v2__lid-top"></span>
                <span class="gift-box-v2__lid-front"></span>
                <span class="gift-box-v2__lid-side"></span>
                <i class="gift-box-v2__ribbon gift-box-v2__ribbon--lid"></i>
              </div>

              <div class="gift-box-v2__base">
                <span class="gift-box-v2__base-front"></span>
                <span class="gift-box-v2__base-side"></span>
                <span class="gift-box-v2__base-top"></span>
                <i class="gift-box-v2__ribbon gift-box-v2__ribbon--vertical"></i>
                <i class="gift-box-v2__ribbon gift-box-v2__ribbon--horizontal"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="gift-club-v2__action">
          <a class="gift-club-v2__cta" href="https://media.neptunebusiness.com/" data-funnel data-track="gift_club_booking">
            <span>Je réserve ma place</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>`;

    target.replaceWith(section);
    initialiseTrigger(section);
  }

  function initialiseTrigger(section) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      section.classList.add('is-gift-triggered');
      return;
    }

    triggerObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        section.classList.add('is-gift-triggered');
        observer.disconnect();
        break;
      }
    }, { threshold: 0.28, rootMargin: '0px 0px -12% 0px' });

    triggerObserver.observe(section);
  }

  function ensureStyles() {
    document.getElementById('gift-club-section-styles')?.remove();
    if (document.getElementById('gift-club-v2-styles')) return;

    const style = document.createElement('style');
    style.id = 'gift-club-v2-styles';
    style.textContent = `
      .gift-club-v2{
        position:relative;
        isolation:isolate;
        overflow:hidden;
        padding:clamp(5.5rem,8vw,8.5rem) 0 clamp(5rem,7vw,7.5rem);
        color:#f8fbff;
        background:
          radial-gradient(circle at 50% 57%,rgba(85,79,255,.2),transparent 31%),
          radial-gradient(circle at 50% 72%,rgba(255,83,190,.1),transparent 27%),
          linear-gradient(180deg,#020611 0%,#040817 54%,#02050e 100%);
      }
      .gift-club-v2::before{
        content:"";
        position:absolute;
        inset:0;
        z-index:-2;
        opacity:.26;
        background-image:
          linear-gradient(rgba(96,145,255,.065) 1px,transparent 1px),
          linear-gradient(90deg,rgba(96,145,255,.065) 1px,transparent 1px);
        background-size:44px 44px;
        mask-image:radial-gradient(circle at 50% 52%,black,transparent 74%);
      }
      .gift-club-v2::after{
        content:"";
        position:absolute;
        left:50%;
        bottom:-42%;
        z-index:-1;
        width:min(1180px,92vw);
        aspect-ratio:1;
        border:1px solid rgba(109,151,255,.11);
        border-radius:50%;
        transform:translateX(-50%);
        box-shadow:0 0 140px rgba(75,74,255,.12),inset 0 0 110px rgba(190,70,255,.055);
      }
      .gift-club-v2__inner{max-width:1180px;text-align:center}
      .gift-club-v2__header{
        max-width:980px;
        margin:0 auto;
        opacity:0;
        transform:translateY(24px);
        transition:opacity .72s ease,transform .9s cubic-bezier(.2,.72,.22,1);
      }
      .gift-club-v2.is-gift-triggered .gift-club-v2__header{opacity:1;transform:none}
      .gift-club-v2__eyebrow{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:.75rem;
        margin-bottom:1.15rem;
        color:#71d7ff;
        font-size:.7rem;
        font-weight:900;
        letter-spacing:.22em;
        text-transform:uppercase;
      }
      .gift-club-v2__eyebrow::before,
      .gift-club-v2__eyebrow::after{
        content:"";
        width:42px;
        height:1px;
        background:linear-gradient(90deg,transparent,#4de3ff,#a95aff);
      }
      .gift-club-v2__eyebrow::after{transform:scaleX(-1)}
      .gift-club-v2__header h2{
        margin:0;
        color:#fff;
        font-size:clamp(3rem,6vw,6rem);
        line-height:.94;
        letter-spacing:-.06em;
        text-wrap:balance;
      }
      .gift-club-v2__subtitle{
        margin:1.25rem auto 0;
        color:#d2d9e7;
        font-size:clamp(1.05rem,1.75vw,1.35rem);
        line-height:1.5;
      }
      .gift-club-v2__copy{
        max-width:720px;
        margin:.6rem auto 0;
        color:#8fa0b8;
        font-size:clamp(.96rem,1.35vw,1.1rem);
        line-height:1.55;
      }
      .gift-club-v2__stage{
        position:relative;
        display:grid;
        place-items:center;
        min-height:clamp(430px,55vw,610px);
        margin-top:clamp(1.2rem,3vw,2.2rem);
        perspective:1400px;
      }
      .gift-club-v2__halo{
        position:absolute;
        width:min(570px,70vw);
        aspect-ratio:1;
        border-radius:50%;
        opacity:.32;
        transform:scale(.72);
        background:radial-gradient(circle,rgba(86,206,255,.38) 0,rgba(122,77,255,.2) 34%,rgba(255,79,182,.09) 54%,transparent 72%);
        filter:blur(18px);
        transition:opacity 1.2s ease .45s,transform 1.6s cubic-bezier(.2,.72,.2,1) .35s;
      }
      .gift-club-v2.is-gift-triggered .gift-club-v2__halo{opacity:1;transform:scale(1)}
      .gift-club-v2__orbit{
        position:absolute;
        border:1px solid rgba(112,155,255,.13);
        border-radius:50%;
        opacity:0;
        transform:scale(.72) rotate(-8deg);
        transition:opacity 1.1s ease .7s,transform 1.8s cubic-bezier(.2,.72,.2,1) .55s;
      }
      .gift-club-v2__orbit--one{width:min(690px,82vw);aspect-ratio:1.65}
      .gift-club-v2__orbit--two{width:min(560px,70vw);aspect-ratio:1.35;transform:scale(.7) rotate(13deg)}
      .gift-club-v2.is-gift-triggered .gift-club-v2__orbit{opacity:.75;transform:scale(1) rotate(0)}
      .gift-box-v2__float{position:relative;z-index:2;will-change:transform}
      .gift-club-v2.is-gift-triggered .gift-box-v2__float{animation:giftV2Float 5s ease-in-out 2.45s infinite}
      .gift-box-v2{
        position:relative;
        width:min(390px,48vw);
        aspect-ratio:1.02;
        transform-style:preserve-3d;
        transform:rotateX(10deg) rotateY(-15deg) translateY(30px) scale(.82);
        opacity:0;
        filter:drop-shadow(0 42px 42px rgba(0,0,0,.5));
        transition:opacity .65s ease .2s,transform 1.15s cubic-bezier(.16,.8,.22,1) .18s;
        will-change:transform,opacity;
      }
      .gift-club-v2.is-gift-triggered .gift-box-v2{opacity:1;transform:rotateX(4deg) rotateY(5deg) translateY(0) scale(1)}
      .gift-box-v2__base,.gift-box-v2__lid{position:absolute;left:10%;width:80%;transform-style:preserve-3d;backface-visibility:hidden}
      .gift-box-v2__base{bottom:8%;height:57%}
      .gift-box-v2__base-front,.gift-box-v2__base-side,.gift-box-v2__base-top,.gift-box-v2__lid-top,.gift-box-v2__lid-front,.gift-box-v2__lid-side{
        position:absolute;
        display:block;
        border:1px solid rgba(255,255,255,.22);
        background:linear-gradient(145deg,#194586 0%,#352382 44%,#791d91 100%);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset -18px -18px 34px rgba(3,5,25,.32);
        backface-visibility:hidden;
      }
      .gift-box-v2__base-front{inset:0;transform:translateZ(34px);border-radius:10px 10px 18px 18px}
      .gift-box-v2__base-side{top:0;right:-34px;width:34px;height:100%;transform-origin:left;transform:rotateY(90deg);border-radius:0 8px 8px 0;background:linear-gradient(180deg,#281e72,#4d176f)}
      .gift-box-v2__base-top{top:-34px;left:0;width:100%;height:34px;transform-origin:bottom;transform:rotateX(90deg);background:linear-gradient(90deg,#245ba6,#832da0)}
      .gift-box-v2__lid{
        top:25%;
        height:22%;
        z-index:6;
        transform-origin:50% 100%;
        transform:translateZ(38px);
        transition:transform 1.2s cubic-bezier(.18,.82,.2,1) .58s;
        will-change:transform;
      }
      .gift-club-v2.is-gift-triggered .gift-box-v2__lid{transform:translateZ(38px) translateY(-28px) rotateX(-120deg) rotateZ(-4deg)}
      .gift-box-v2__lid-top{inset:0;transform:translateZ(30px);border-radius:13px;background:linear-gradient(135deg,#2867b7,#7130b2 58%,#c93298)}
      .gift-box-v2__lid-front{left:0;right:0;bottom:-30px;height:30px;transform-origin:top;transform:rotateX(-90deg);border-radius:0 0 9px 9px;background:linear-gradient(90deg,#193e84,#7e237f)}
      .gift-box-v2__lid-side{top:0;right:-30px;width:30px;height:100%;transform-origin:left;transform:rotateY(90deg);border-radius:0 8px 8px 0;background:linear-gradient(180deg,#2d348e,#84258d)}
      .gift-box-v2__ribbon{position:absolute;z-index:8;display:block;background:linear-gradient(180deg,#ff8d56,#ffd067 52%,#ff6f87);box-shadow:0 0 22px rgba(255,132,92,.45),inset 0 1px 0 rgba(255,255,255,.58)}
      .gift-box-v2__ribbon--vertical{top:0;bottom:0;left:43%;width:14%;transform:translateZ(36px)}
      .gift-box-v2__ribbon--horizontal{left:0;right:0;top:42%;height:15%;transform:translateZ(37px)}
      .gift-box-v2__ribbon--lid{top:0;bottom:0;left:43%;width:14%;transform:translateZ(31px);border-radius:3px}
      .gift-box-v2__card{
        position:absolute;
        left:5%;
        right:5%;
        top:16%;
        z-index:4;
        display:grid;
        align-content:center;
        min-height:49%;
        padding:clamp(1rem,2.2vw,1.8rem);
        border:1px solid rgba(255,255,255,.38);
        border-radius:22px;
        opacity:0;
        transform:translateY(82px) translateZ(25px) rotateX(12deg) scale(.75);
        background:radial-gradient(circle at 20% 15%,rgba(105,214,255,.34),transparent 34%),linear-gradient(135deg,rgba(9,25,52,.99),rgba(38,17,77,.99));
        box-shadow:0 30px 72px rgba(0,0,0,.48),0 0 54px rgba(111,89,255,.24),inset 0 1px 0 rgba(255,255,255,.13);
        text-align:center;
        transition:opacity .7s ease 1.06s,transform 1.1s cubic-bezier(.16,.82,.2,1) 1s;
        will-change:transform,opacity;
      }
      .gift-club-v2.is-gift-triggered .gift-box-v2__card{opacity:1;transform:translateY(-92px) translateZ(25px) rotateX(0) scale(1)}
      .gift-box-v2__card span{margin-bottom:.72rem;color:#72dcff;font-size:.67rem;font-weight:900;letter-spacing:.22em;text-transform:uppercase}
      .gift-box-v2__card strong{color:#fff;font-size:clamp(1.15rem,2.35vw,1.9rem);line-height:1.08;letter-spacing:-.035em}
      .gift-box-v2__card em{display:block;margin-bottom:.25rem;color:transparent;background:linear-gradient(90deg,#5ce5ff,#a979ff,#ff719f);background-clip:text;-webkit-background-clip:text;font-size:1.38em;font-style:normal}
      .gift-box-v2__particle{position:absolute;z-index:10;width:9px;aspect-ratio:1;border-radius:3px;opacity:0;background:linear-gradient(135deg,#56e7ff,#c878ff,#ff9670);box-shadow:0 0 18px rgba(124,190,255,.7)}
      .gift-box-v2__particle--1{left:9%;top:18%;--tx:-62px;--ty:-92px;--rot:160deg;--delay:1.18s}
      .gift-box-v2__particle--2{right:8%;top:21%;--tx:68px;--ty:-102px;--rot:-135deg;--delay:1.24s}
      .gift-box-v2__particle--3{left:24%;top:5%;--tx:-24px;--ty:-88px;--rot:230deg;--delay:1.3s}
      .gift-box-v2__particle--4{right:24%;top:7%;--tx:28px;--ty:-78px;--rot:-210deg;--delay:1.35s}
      .gift-box-v2__particle--5{left:49%;top:1%;--tx:-4px;--ty:-108px;--rot:280deg;--delay:1.4s}
      .gift-box-v2__particle--6{right:4%;top:38%;--tx:82px;--ty:-34px;--rot:145deg;--delay:1.46s}
      .gift-club-v2.is-gift-triggered .gift-box-v2__particle{animation:giftV2Particle 1.25s cubic-bezier(.2,.72,.2,1) var(--delay) forwards}
      .gift-club-v2__action{
        display:flex;
        justify-content:center;
        margin-top:clamp(.3rem,1.5vw,1rem);
        opacity:0;
        transform:translateY(24px);
        pointer-events:none;
        transition:opacity .7s ease 1.75s,transform .85s cubic-bezier(.2,.72,.2,1) 1.7s;
      }
      .gift-club-v2.is-gift-triggered .gift-club-v2__action{opacity:1;transform:none;pointer-events:auto}
      .gift-club-v2__cta{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:.8rem;
        min-height:60px;
        padding:1rem 1.55rem;
        border:1px solid rgba(255,255,255,.34);
        border-radius:999px;
        color:#04111d;
        background:linear-gradient(105deg,#65e0ff 0%,#54a7ff 42%,#b878ff 74%,#ff779e 100%);
        box-shadow:0 18px 46px rgba(80,163,255,.34),inset 0 1px 0 rgba(255,255,255,.58);
        font-weight:900;
        text-decoration:none;
        transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;
      }
      .gift-club-v2__cta svg{width:20px;height:20px;transition:transform .22s ease}
      .gift-club-v2__cta:hover,.gift-club-v2__cta:focus-visible{transform:translateY(-3px);filter:saturate(1.08) brightness(1.04);box-shadow:0 23px 58px rgba(91,169,255,.44),inset 0 1px 0 rgba(255,255,255,.64)}
      .gift-club-v2__cta:hover svg,.gift-club-v2__cta:focus-visible svg{transform:translateX(4px)}
      @keyframes giftV2Float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
      @keyframes giftV2Particle{0%{opacity:0;transform:translate(0,0) rotate(0) scale(.45)}28%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(1)}}
      @media (max-width:700px){
        .gift-club-v2{padding:4.6rem 0 4.8rem}
        .gift-club-v2__eyebrow::before,.gift-club-v2__eyebrow::after{width:25px}
        .gift-club-v2__header h2{font-size:clamp(2.65rem,13.5vw,4.25rem)}
        .gift-club-v2__subtitle{margin-top:.9rem;font-size:1rem}
        .gift-club-v2__copy{font-size:.94rem}
        .gift-club-v2__stage{min-height:430px;margin-top:.4rem}
        .gift-box-v2{width:min(330px,76vw)}
        .gift-club-v2__halo{width:min(470px,92vw)}
        .gift-club-v2__cta{width:min(100%,360px)}
      }
      @media (prefers-reduced-motion:reduce){
        .gift-club-v2__header,.gift-box-v2,.gift-club-v2__halo,.gift-club-v2__orbit,.gift-box-v2__lid,.gift-box-v2__card,.gift-club-v2__action{transition:none!important}
        .gift-club-v2__header,.gift-box-v2,.gift-club-v2__halo,.gift-club-v2__orbit,.gift-box-v2__card,.gift-club-v2__action{opacity:1!important;transform:none!important}
        .gift-box-v2__lid{transform:translateZ(38px) translateY(-28px) rotateX(-120deg) rotateZ(-4deg)!important}
        .gift-box-v2__float,.gift-box-v2__particle{animation:none!important}
      }`;

    document.head.append(style);
  }
})();