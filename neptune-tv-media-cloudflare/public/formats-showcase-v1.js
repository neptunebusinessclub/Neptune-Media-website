(() => {
  'use strict';

  const EXACT_MEDIA = {
    '.format-carousel__visual--hn1': '/assets/formats/exact-hn1.b64',
    '.format-carousel__visual--hn2': '/assets/formats/exact-hn2.b64',
    '.format-carousel__visual--cl1': '/assets/formats/exact-cl1.b64',
    '.format-carousel__visual--cl2': '/assets/formats/exact-cl2.b64',
    '.format-carousel__visual--cl3': '/assets/formats/exact-cl3.b64',
  };

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    loadExactMedia();
    ensureBookingCta();
    ensureGiftExperience();
    document.querySelectorAll('[data-format-carousel]').forEach(initCarousel);
  });

  async function loadExactMedia() {
    await Promise.all(Object.entries(EXACT_MEDIA).map(async ([selector, url]) => {
      const visual = document.querySelector(selector);
      if (!visual) return;

      try {
        const response = await fetch(`${url}?v=2`, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const base64 = (await response.text()).trim();
        if (!base64.startsWith('UklG')) throw new Error('Invalid WebP payload');
        visual.style.backgroundImage = `url("data:image/webp;base64,${base64}")`;
        visual.dataset.exactMedia = '1';
      } catch (error) {
        console.error('formats_exact_media_failed', { selector, error });
      }
    }));
  }

  function ensureBookingCta() {
    const section = document.querySelector('#formats.formats-showcase');
    const inner = section?.querySelector('.formats-showcase__inner');
    if (!inner || inner.querySelector('[data-formats-booking-cta]')) return;

    const cta = document.createElement('div');
    cta.className = 'formats-showcase__booking';
    cta.dataset.formatsBookingCta = '1';
    cta.innerHTML = `
      <div class="formats-showcase__booking-copy">
        <span>Votre place sur le plateau</span>
        <h3>Choisissez votre format. Réservez votre créneau.</h3>
        <p>Consultez les prochaines disponibilités et bloquez votre passage en quelques clics.</p>
      </div>
      <a class="formats-showcase__booking-button" href="https://media.neptunebusiness.com/" data-funnel data-track="formats_showcase_booking">
        <span>Je réserve mon créneau</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>`;

    inner.append(cta);
    ensureBookingCtaStyles();
  }

  function ensureBookingCtaStyles() {
    if (document.getElementById('formats-showcase-booking-styles')) return;

    const style = document.createElement('style');
    style.id = 'formats-showcase-booking-styles';
    style.textContent = `
      .formats-showcase__booking{
        position:relative;
        isolation:isolate;
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:clamp(1.25rem,3vw,3rem);
        align-items:center;
        max-width:1120px;
        margin:clamp(1.5rem,3vw,2.4rem) auto 0;
        padding:clamp(1.4rem,3vw,2.25rem);
        overflow:hidden;
        border:1px solid transparent;
        border-radius:24px;
        background:
          linear-gradient(110deg,rgba(8,20,40,.96),rgba(13,9,34,.97)) padding-box,
          linear-gradient(110deg,rgba(61,196,255,.78),rgba(131,79,255,.72),rgba(255,91,180,.68)) border-box;
        box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.06);
      }
      .formats-showcase__booking::before{
        content:"";
        position:absolute;
        inset:-70% auto auto -8%;
        z-index:-1;
        width:56%;
        aspect-ratio:1;
        border-radius:50%;
        background:radial-gradient(circle,rgba(55,184,255,.2),transparent 68%);
        pointer-events:none;
      }
      .formats-showcase__booking-copy span{
        display:block;
        margin-bottom:.55rem;
        color:#70ceff;
        font-size:.7rem;
        font-weight:900;
        letter-spacing:.2em;
        text-transform:uppercase;
      }
      .formats-showcase__booking-copy h3{
        margin:0;
        color:#fff;
        font-size:clamp(1.45rem,2.7vw,2.25rem);
        line-height:1.05;
        letter-spacing:-.035em;
      }
      .formats-showcase__booking-copy p{
        max-width:62ch;
        margin:.65rem 0 0;
        color:#bdc9da;
        font-size:.95rem;
        line-height:1.55;
      }
      .formats-showcase__booking-button{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:.75rem;
        min-height:56px;
        padding:.95rem 1.35rem;
        border:1px solid rgba(255,255,255,.28);
        border-radius:999px;
        color:#04101d;
        background:linear-gradient(105deg,#68dcff 0%,#4ca8ff 43%,#b573ff 100%);
        box-shadow:0 14px 38px rgba(74,167,255,.28),inset 0 1px 0 rgba(255,255,255,.48);
        font-weight:900;
        text-decoration:none;
        white-space:nowrap;
        transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;
      }
      .formats-showcase__booking-button svg{width:20px;height:20px;transition:transform .22s ease}
      .formats-showcase__booking-button:hover,
      .formats-showcase__booking-button:focus-visible{
        transform:translateY(-2px);
        box-shadow:0 18px 44px rgba(86,177,255,.38),inset 0 1px 0 rgba(255,255,255,.55);
        filter:saturate(1.08) brightness(1.04);
      }
      .formats-showcase__booking-button:hover svg,
      .formats-showcase__booking-button:focus-visible svg{transform:translateX(3px)}
      @media (max-width:760px){
        .formats-showcase__booking{grid-template-columns:1fr;align-items:stretch;border-radius:21px}
        .formats-showcase__booking-button{width:100%;white-space:normal;text-align:center}
      }
      @media (prefers-reduced-motion:reduce){
        .formats-showcase__booking-button,
        .formats-showcase__booking-button svg{transition:none}
      }`;

    document.head.append(style);
  }

  function ensureGiftExperience() {
    const target = document.querySelector('#experience-details, #experience');
    if (!target || target.classList.contains('gift-club-section')) return;

    const section = document.createElement('section');
    section.className = 'section gift-club-section';
    section.id = 'experience-details';
    section.dataset.aidaStage = 'action';
    section.dataset.giftClubVersion = '1';
    section.innerHTML = `
      <div class="gift-club-section__scroll" data-gift-scroll>
        <div class="gift-club-section__sticky">
          <div class="container gift-club-section__inner">
            <header class="gift-club-section__header">
              <span class="gift-club-section__eyebrow">Attendez, ce n’est pas fini</span>
              <h2>Quoi&nbsp;? Vous êtes encore là&nbsp;?</h2>
              <p>C'est vrai on a oublié de vous offrir quelque chose...</p>
            </header>

            <div class="gift-club-section__scene" aria-label="Un cadeau s’ouvre et révèle un an offert au Neptune Business Club">
              <div class="gift-club-section__halo" aria-hidden="true"></div>
              <div class="gift-box-3d" aria-hidden="true">
                <span class="gift-box-3d__particle gift-box-3d__particle--1"></span>
                <span class="gift-box-3d__particle gift-box-3d__particle--2"></span>
                <span class="gift-box-3d__particle gift-box-3d__particle--3"></span>
                <span class="gift-box-3d__particle gift-box-3d__particle--4"></span>
                <span class="gift-box-3d__particle gift-box-3d__particle--5"></span>
                <div class="gift-box-3d__card">
                  <span>Votre cadeau</span>
                  <strong><em>1 an offert</em> au Neptune Business Club</strong>
                </div>
                <div class="gift-box-3d__lid">
                  <span class="gift-box-3d__lid-top"></span>
                  <span class="gift-box-3d__lid-front"></span>
                  <span class="gift-box-3d__lid-side"></span>
                  <i class="gift-box-3d__ribbon gift-box-3d__ribbon--lid"></i>
                </div>
                <div class="gift-box-3d__base">
                  <span class="gift-box-3d__base-front"></span>
                  <span class="gift-box-3d__base-side"></span>
                  <span class="gift-box-3d__base-top"></span>
                  <i class="gift-box-3d__ribbon gift-box-3d__ribbon--vertical"></i>
                  <i class="gift-box-3d__ribbon gift-box-3d__ribbon--horizontal"></i>
                </div>
              </div>
              <span class="gift-club-section__scroll-hint">Faites défiler pour ouvrir</span>
            </div>

            <div class="gift-club-section__reveal">
              <p>Parce qu'on croit que vous avez des affaires à faire au sein du réseau.</p>
              <a class="gift-club-section__cta" href="https://media.neptunebusiness.com/" data-funnel data-track="gift_club_booking">
                <span>Je réserve ma place</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>`;

    target.replaceWith(section);
    ensureGiftStyles();
    initGiftScroll(section);
  }

  function ensureGiftStyles() {
    if (document.getElementById('gift-club-section-styles')) return;

    const style = document.createElement('style');
    style.id = 'gift-club-section-styles';
    style.textContent = `
      .gift-club-section{
        --gift-progress:0;
        --gift-open:0;
        --gift-reveal:0;
        --gift-action:0;
        position:relative;
        isolation:isolate;
        min-height:220vh;
        padding:0;
        overflow:clip;
        color:#f8fbff;
        background:
          radial-gradient(circle at 50% 48%,rgba(84,75,255,.2),transparent 34%),
          radial-gradient(circle at 50% 65%,rgba(255,89,190,.1),transparent 29%),
          linear-gradient(180deg,#020611 0%,#030817 55%,#02050e 100%);
      }
      .gift-club-section::before{
        content:"";
        position:absolute;
        inset:0;
        z-index:-2;
        opacity:.28;
        background-image:
          linear-gradient(rgba(95,145,255,.07) 1px,transparent 1px),
          linear-gradient(90deg,rgba(95,145,255,.07) 1px,transparent 1px);
        background-size:44px 44px;
        mask-image:radial-gradient(circle at 50% 48%,black,transparent 72%);
      }
      .gift-club-section::after{
        content:"";
        position:absolute;
        inset:16% 10% auto;
        height:64%;
        z-index:-1;
        border-radius:50%;
        border:1px solid rgba(99,151,255,.1);
        transform:scale(calc(.72 + var(--gift-progress) * .35));
        opacity:calc(.22 + var(--gift-reveal) * .35);
        box-shadow:0 0 120px rgba(85,84,255,.12),inset 0 0 90px rgba(196,73,255,.07);
        pointer-events:none;
      }
      .gift-club-section__scroll{height:220vh}
      .gift-club-section__sticky{
        position:sticky;
        top:0;
        display:grid;
        align-items:center;
        min-height:100vh;
        min-height:100svh;
        padding:clamp(4.8rem,8vh,7rem) 0 clamp(2.5rem,5vh,4rem);
      }
      .gift-club-section__inner{
        display:grid;
        grid-template-columns:minmax(0,.92fr) minmax(320px,1.08fr);
        grid-template-areas:"header scene" "reveal scene";
        gap:clamp(1.4rem,4vw,4.8rem);
        align-items:center;
        max-width:1240px;
      }
      .gift-club-section__header{
        grid-area:header;
        align-self:end;
        opacity:calc(1 - var(--gift-open) * .38);
        transform:translateY(calc(var(--gift-open) * -18px));
      }
      .gift-club-section__eyebrow{
        display:inline-flex;
        align-items:center;
        gap:.7rem;
        margin-bottom:1rem;
        color:#70d7ff;
        font-size:.7rem;
        font-weight:900;
        letter-spacing:.22em;
        text-transform:uppercase;
      }
      .gift-club-section__eyebrow::before{
        content:"";
        width:38px;
        height:1px;
        background:linear-gradient(90deg,#4ce4ff,#a65bff);
      }
      .gift-club-section__header h2{
        max-width:650px;
        margin:0;
        color:#fff;
        font-size:clamp(3rem,6.3vw,6.3rem);
        line-height:.91;
        letter-spacing:-.06em;
        text-wrap:balance;
      }
      .gift-club-section__header p{
        max-width:590px;
        margin:1.3rem 0 0;
        color:#c3cedd;
        font-size:clamp(1rem,1.65vw,1.28rem);
        line-height:1.55;
      }
      .gift-club-section__scene{
        grid-area:scene;
        position:relative;
        display:grid;
        place-items:center;
        min-height:min(72vh,720px);
        perspective:1300px;
      }
      .gift-club-section__halo{
        position:absolute;
        width:min(45vw,560px);
        aspect-ratio:1;
        border-radius:50%;
        background:radial-gradient(circle,rgba(93,174,255,.3) 0,rgba(131,77,255,.18) 34%,rgba(255,83,180,.08) 52%,transparent 72%);
        filter:blur(calc(12px + var(--gift-reveal) * 12px));
        opacity:calc(.55 + var(--gift-reveal) * .45);
        transform:scale(calc(.72 + var(--gift-open) * .32));
      }
      .gift-box-3d{
        position:relative;
        width:min(35vw,430px);
        aspect-ratio:1.05;
        transform-style:preserve-3d;
        transform:
          rotateX(calc(8deg - var(--gift-open) * 6deg))
          rotateY(calc(-14deg + var(--gift-progress) * 20deg))
          translateY(calc(20px - var(--gift-open) * 22px))
          scale(calc(.86 + var(--gift-open) * .12));
        filter:drop-shadow(0 42px 40px rgba(0,0,0,.48));
      }
      .gift-box-3d__base,
      .gift-box-3d__lid{
        position:absolute;
        left:10%;
        width:80%;
        transform-style:preserve-3d;
      }
      .gift-box-3d__base{bottom:10%;height:58%}
      .gift-box-3d__base-front,
      .gift-box-3d__base-side,
      .gift-box-3d__base-top,
      .gift-box-3d__lid-top,
      .gift-box-3d__lid-front,
      .gift-box-3d__lid-side{
        position:absolute;
        display:block;
        border:1px solid rgba(255,255,255,.22);
        background:linear-gradient(145deg,#173f83 0%,#342281 42%,#741b8d 100%);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset -18px -18px 34px rgba(3,5,25,.32);
      }
      .gift-box-3d__base-front{inset:0;transform:translateZ(34px);border-radius:10px 10px 18px 18px}
      .gift-box-3d__base-side{top:0;right:-34px;width:34px;height:100%;transform-origin:left;transform:rotateY(90deg);border-radius:0 8px 8px 0;background:linear-gradient(180deg,#271d70,#4b176e)}
      .gift-box-3d__base-top{top:-34px;left:0;width:100%;height:34px;transform-origin:bottom;transform:rotateX(90deg);background:linear-gradient(90deg,#2256a0,#7c2a9c)}
      .gift-box-3d__lid{
        top:25%;
        height:22%;
        z-index:6;
        transform-origin:50% 100%;
        transform:
          translateZ(38px)
          translateY(calc(var(--gift-open) * -22px))
          rotateX(calc(var(--gift-open) * -118deg))
          rotateZ(calc(var(--gift-open) * -4deg));
      }
      .gift-box-3d__lid-top{inset:0;transform:translateZ(30px);border-radius:13px;background:linear-gradient(135deg,#2764b3,#6d2ead 58%,#c22f93)}
      .gift-box-3d__lid-front{left:0;right:0;bottom:-30px;height:30px;transform-origin:top;transform:rotateX(-90deg);border-radius:0 0 9px 9px;background:linear-gradient(90deg,#183b80,#7a217e)}
      .gift-box-3d__lid-side{top:0;right:-30px;width:30px;height:100%;transform-origin:left;transform:rotateY(90deg);border-radius:0 8px 8px 0;background:linear-gradient(180deg,#2b3189,#7f238a)}
      .gift-box-3d__ribbon{position:absolute;z-index:8;display:block;background:linear-gradient(180deg,#ff8c56,#ffcc62 52%,#ff6d84);box-shadow:0 0 22px rgba(255,132,92,.42),inset 0 1px 0 rgba(255,255,255,.55)}
      .gift-box-3d__ribbon--vertical{top:0;bottom:0;left:43%;width:14%;transform:translateZ(36px)}
      .gift-box-3d__ribbon--horizontal{left:0;right:0;top:42%;height:15%;transform:translateZ(37px)}
      .gift-box-3d__ribbon--lid{top:0;bottom:0;left:43%;width:14%;transform:translateZ(31px);border-radius:3px}
      .gift-box-3d__card{
        position:absolute;
        left:7%;
        right:7%;
        top:16%;
        z-index:4;
        display:grid;
        align-content:center;
        min-height:48%;
        padding:clamp(1rem,2.2vw,1.8rem);
        border:1px solid rgba(255,255,255,.36);
        border-radius:22px;
        background:
          radial-gradient(circle at 20% 15%,rgba(105,214,255,.32),transparent 33%),
          linear-gradient(135deg,rgba(9,25,52,.98),rgba(36,17,73,.98));
        box-shadow:0 28px 70px rgba(0,0,0,.45),0 0 50px rgba(111,89,255,.22),inset 0 1px 0 rgba(255,255,255,.12);
        opacity:var(--gift-reveal);
        transform:
          translateY(calc(100px - var(--gift-reveal) * 185px))
          translateZ(25px)
          rotateX(calc(12deg - var(--gift-reveal) * 12deg))
          scale(calc(.72 + var(--gift-reveal) * .28));
        text-align:center;
      }
      .gift-box-3d__card span{
        margin-bottom:.7rem;
        color:#72d8ff;
        font-size:.67rem;
        font-weight:900;
        letter-spacing:.22em;
        text-transform:uppercase;
      }
      .gift-box-3d__card strong{color:#fff;font-size:clamp(1.15rem,2.4vw,2rem);line-height:1.08;letter-spacing:-.035em}
      .gift-box-3d__card em{display:block;margin-bottom:.25rem;color:transparent;background:linear-gradient(90deg,#5be2ff,#a778ff,#ff709f);background-clip:text;-webkit-background-clip:text;font-size:1.35em;font-style:normal}
      .gift-box-3d__particle{
        position:absolute;
        z-index:10;
        width:9px;
        aspect-ratio:1;
        border-radius:3px;
        opacity:var(--gift-reveal);
        background:linear-gradient(135deg,#56e7ff,#c878ff,#ff9670);
        box-shadow:0 0 16px currentColor;
      }
      .gift-box-3d__particle--1{left:8%;top:18%;transform:translate(calc(var(--gift-reveal) * -48px),calc(var(--gift-reveal) * -78px)) rotate(calc(var(--gift-reveal) * 140deg))}
      .gift-box-3d__particle--2{right:8%;top:22%;transform:translate(calc(var(--gift-reveal) * 56px),calc(var(--gift-reveal) * -92px)) rotate(calc(var(--gift-reveal) * -120deg))}
      .gift-box-3d__particle--3{left:22%;top:6%;transform:translate(calc(var(--gift-reveal) * -16px),calc(var(--gift-reveal) * -72px)) rotate(calc(var(--gift-reveal) * 210deg))}
      .gift-box-3d__particle--4{right:24%;top:8%;transform:translate(calc(var(--gift-reveal) * 22px),calc(var(--gift-reveal) * -64px)) rotate(calc(var(--gift-reveal) * -190deg))}
      .gift-box-3d__particle--5{left:49%;top:2%;transform:translateY(calc(var(--gift-reveal) * -82px)) rotate(calc(var(--gift-reveal) * 250deg))}
      .gift-club-section__scroll-hint{
        position:absolute;
        bottom:4%;
        left:50%;
        color:#8da0bb;
        font-size:.7rem;
        font-weight:800;
        letter-spacing:.16em;
        text-transform:uppercase;
        opacity:calc(1 - var(--gift-open) * 1.3);
        transform:translateX(-50%) translateY(calc(var(--gift-open) * 18px));
        white-space:nowrap;
      }
      .gift-club-section__scroll-hint::after{content:"";display:block;width:1px;height:32px;margin:.75rem auto 0;background:linear-gradient(#62ddff,transparent)}
      .gift-club-section__reveal{
        grid-area:reveal;
        align-self:start;
        max-width:620px;
        opacity:var(--gift-action);
        transform:translateY(calc(36px - var(--gift-action) * 36px));
        pointer-events:none;
      }
      .gift-club-section__reveal p{
        margin:0 0 1.3rem;
        color:#d4dcea;
        font-size:clamp(1.05rem,1.8vw,1.35rem);
        line-height:1.55;
      }
      .gift-club-section__cta{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:.8rem;
        min-height:58px;
        padding:1rem 1.45rem;
        border:1px solid rgba(255,255,255,.34);
        border-radius:999px;
        color:#04111d;
        background:linear-gradient(105deg,#65e0ff 0%,#54a7ff 42%,#b878ff 74%,#ff779e 100%);
        box-shadow:0 18px 46px rgba(80,163,255,.34),inset 0 1px 0 rgba(255,255,255,.55);
        font-weight:900;
        text-decoration:none;
        pointer-events:auto;
        transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;
      }
      .gift-club-section__cta svg{width:20px;height:20px;transition:transform .22s ease}
      .gift-club-section__cta:hover,
      .gift-club-section__cta:focus-visible{transform:translateY(-3px);filter:saturate(1.08) brightness(1.04);box-shadow:0 22px 56px rgba(91,169,255,.44),inset 0 1px 0 rgba(255,255,255,.62)}
      .gift-club-section__cta:hover svg,
      .gift-club-section__cta:focus-visible svg{transform:translateX(4px)}
      @media (max-width:900px){
        .gift-club-section{min-height:235vh}
        .gift-club-section__scroll{height:235vh}
        .gift-club-section__sticky{padding-top:4.6rem}
        .gift-club-section__inner{grid-template-columns:1fr;grid-template-areas:"header" "scene" "reveal";gap:.8rem;text-align:center}
        .gift-club-section__header{align-self:auto}
        .gift-club-section__header h2,.gift-club-section__header p,.gift-club-section__reveal{margin-left:auto;margin-right:auto}
        .gift-club-section__eyebrow{justify-content:center}
        .gift-club-section__scene{min-height:45vh}
        .gift-box-3d{width:min(72vw,390px)}
        .gift-club-section__halo{width:min(82vw,500px)}
        .gift-club-section__reveal{align-self:auto}
      }
      @media (max-width:560px){
        .gift-club-section__sticky{padding-top:4.2rem;padding-bottom:1.5rem}
        .gift-club-section__header h2{font-size:clamp(2.7rem,14vw,4.2rem)}
        .gift-club-section__header p{margin-top:.85rem;font-size:.96rem}
        .gift-club-section__scene{min-height:43vh}
        .gift-box-3d{width:min(78vw,330px)}
        .gift-club-section__reveal p{font-size:1rem}
        .gift-club-section__cta{width:100%}
      }
      @media (prefers-reduced-motion:reduce){
        .gift-club-section{min-height:auto;padding:5rem 0}
        .gift-club-section__scroll{height:auto}
        .gift-club-section__sticky{position:relative;min-height:auto;padding:0}
        .gift-club-section__header,.gift-club-section__reveal{opacity:1;transform:none}
        .gift-club-section__reveal{pointer-events:auto}
        .gift-box-3d{transform:rotateX(2deg) rotateY(4deg)}
        .gift-box-3d__lid{transform:translateZ(38px) translateY(-22px) rotateX(-118deg) rotateZ(-4deg)}
        .gift-box-3d__card{opacity:1;transform:translateY(-85px) translateZ(25px) scale(1)}
        .gift-box-3d__particle{opacity:1}
        .gift-club-section__scroll-hint{display:none}
        .gift-club-section__cta,.gift-club-section__cta svg{transition:none}
      }`;

    document.head.append(style);
  }

  function initGiftScroll(section) {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reveal = section.querySelector('.gift-club-section__reveal');

    if (reducedMotion) {
      section.style.setProperty('--gift-progress', '1');
      section.style.setProperty('--gift-open', '1');
      section.style.setProperty('--gift-reveal', '1');
      section.style.setProperty('--gift-action', '1');
      if (reveal) reveal.style.pointerEvents = 'auto';
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / scrollable, 0, 1);
      const open = smoothstep(.1, .48, progress);
      const card = smoothstep(.34, .7, progress);
      const action = smoothstep(.64, .9, progress);

      section.style.setProperty('--gift-progress', progress.toFixed(4));
      section.style.setProperty('--gift-open', open.toFixed(4));
      section.style.setProperty('--gift-reveal', card.toFixed(4));
      section.style.setProperty('--gift-action', action.toFixed(4));
      if (reveal) reveal.style.pointerEvents = action > .72 ? 'auto' : 'none';
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    update();
  }

  function initCarousel(root) {
    if (root.dataset.carouselBound === '1') return;
    root.dataset.carouselBound = '1';

    const track = root.querySelector('[data-format-track]');
    const slides = [...root.querySelectorAll('[data-format-slide]')];
    const dots = [...root.querySelectorAll('[data-format-dot]')];
    const previous = root.querySelector('[data-format-prev]');
    const next = root.querySelector('[data-format-next]');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const interval = Math.max(3200, Number(root.dataset.interval || 4800));

    if (!track || slides.length < 2) return;

    let index = 0;
    let timer = 0;
    let paused = false;

    const render = (nextIndex, announce = false) => {
      index = (nextIndex + slides.length) % slides.length;
      track.style.setProperty('--active-index', String(index));
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.setAttribute('aria-current', active ? 'true' : 'false');
        dot.setAttribute('aria-label', `Afficher l’image ${dotIndex + 1} sur ${slides.length}`);
      });
      if (announce) root.setAttribute('aria-label', `Image ${index + 1} sur ${slides.length}`);
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = 0;
    };

    const start = () => {
      stop();
      if (reducedMotion || paused || document.hidden) return;
      timer = window.setInterval(() => render(index + 1), interval);
    };

    previous?.addEventListener('click', () => {
      render(index - 1, true);
      start();
    });

    next?.addEventListener('click', () => {
      render(index + 1, true);
      start();
    });

    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => {
      render(dotIndex, true);
      start();
    }));

    root.addEventListener('mouseenter', () => {
      paused = true;
      stop();
    });

    root.addEventListener('mouseleave', () => {
      paused = false;
      start();
    });

    root.addEventListener('focusin', () => {
      paused = true;
      stop();
    });

    root.addEventListener('focusout', (event) => {
      if (root.contains(event.relatedTarget)) return;
      paused = false;
      start();
    });

    document.addEventListener('visibilitychange', start);
    render(0);
    start();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  }
})();
