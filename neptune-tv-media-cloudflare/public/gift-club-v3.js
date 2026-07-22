(() => {
  'use strict';

  const TARGET_SELECTOR = '#experience-details, #experience';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mutationObserver = null;

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    mountGiftSection();

    mutationObserver = new MutationObserver(() => mountGiftSection());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => mutationObserver?.disconnect(), 8000);
  });

  function mountGiftSection() {
    const target = document.querySelector(TARGET_SELECTOR);
    if (!target) return;

    if (target.classList.contains('gift-club-v3')) {
      initialiseReveal(target);
      return;
    }

    const section = document.createElement('section');
    section.className = 'section gift-club-v3 is-gift-pending';
    section.id = 'experience-details';
    section.dataset.aidaStage = 'action';
    section.dataset.giftClubVersion = '3';
    section.innerHTML = `
      <div class="container gift-club-v3__inner">
        <header class="gift-club-v3__header">
          <span class="gift-club-v3__eyebrow">Attendez, ce n’est pas fini</span>
          <h2>Quoi&nbsp;? Vous êtes encore là&nbsp;?</h2>
          <p class="gift-club-v3__subtitle">C'est vrai on a oublié de vous offrir quelque chose...</p>
          <p class="gift-club-v3__copy">Parce qu'on croit que vous avez des affaires à faire au sein du réseau.</p>
        </header>

        <div class="gift-club-v3__stage" aria-label="Un cadeau révèle un an offert au Neptune Business Club">
          <div class="gift-club-v3__orbit gift-club-v3__orbit--one" aria-hidden="true"></div>
          <div class="gift-club-v3__orbit gift-club-v3__orbit--two" aria-hidden="true"></div>
          <div class="gift-club-v3__halo" aria-hidden="true"></div>

          <div class="gift-box-v3__float">
            <div class="gift-box-v3" aria-hidden="true">
              <span class="gift-box-v3__particle gift-box-v3__particle--1"></span>
              <span class="gift-box-v3__particle gift-box-v3__particle--2"></span>
              <span class="gift-box-v3__particle gift-box-v3__particle--3"></span>
              <span class="gift-box-v3__particle gift-box-v3__particle--4"></span>
              <span class="gift-box-v3__particle gift-box-v3__particle--5"></span>
              <span class="gift-box-v3__particle gift-box-v3__particle--6"></span>

              <div class="gift-box-v3__card">
                <span>Votre cadeau</span>
                <strong><em>1 an offert</em> au Neptune Business Club</strong>
              </div>

              <div class="gift-box-v3__lid">
                <span class="gift-box-v3__lid-top"></span>
                <span class="gift-box-v3__lid-front"></span>
                <span class="gift-box-v3__lid-side"></span>
                <i class="gift-box-v3__ribbon gift-box-v3__ribbon--lid"></i>
              </div>

              <div class="gift-box-v3__base">
                <span class="gift-box-v3__base-front"></span>
                <span class="gift-box-v3__base-side"></span>
                <span class="gift-box-v3__base-top"></span>
                <i class="gift-box-v3__ribbon gift-box-v3__ribbon--vertical"></i>
                <i class="gift-box-v3__ribbon gift-box-v3__ribbon--horizontal"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="gift-club-v3__action">
          <a class="gift-club-v3__cta" href="https://media.neptunebusiness.com/" data-funnel data-track="gift_club_booking">
            <span>Je réserve ma place</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>`;

    target.replaceWith(section);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => initialiseReveal(section)));
  }

  function initialiseReveal(section) {
    if (section.dataset.giftRevealBound === '1') return;
    section.dataset.giftRevealBound = '1';

    let observer = null;
    let frame = 0;
    let fallbackTimer = 0;

    const trigger = () => {
      if (section.classList.contains('is-gift-triggered')) return;
      section.classList.remove('is-gift-pending');
      section.classList.add('is-gift-triggered');
      observer?.disconnect();
      window.removeEventListener('scroll', requestCheck);
      window.removeEventListener('resize', requestCheck);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };

    const isVisible = (margin = 0) => {
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < viewport * (1 + margin) && rect.bottom > viewport * 0.04;
    };

    const check = () => {
      frame = 0;
      if (isVisible()) trigger();
    };

    const requestCheck = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(check);
    };

    if (reducedMotion || !('IntersectionObserver' in window)) {
      trigger();
      return;
    }

    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) trigger();
    }, { threshold: [0, 0.01, 0.05], rootMargin: '0px 0px -4% 0px' });

    observer.observe(section);
    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck, { passive: true });

    check();
    window.setTimeout(check, 250);
    fallbackTimer = window.setTimeout(() => {
      if (isVisible(0.35)) trigger();
    }, 1400);
  }
})();