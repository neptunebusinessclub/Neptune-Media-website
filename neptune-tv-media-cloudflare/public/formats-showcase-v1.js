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
})();