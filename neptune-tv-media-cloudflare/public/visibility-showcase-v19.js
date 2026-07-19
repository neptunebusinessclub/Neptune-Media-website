(() => {
  'use strict';

  const target = document.querySelector('.proof-by-content');
  if (!target || target.dataset.visibilityShowcase === 'v21') return;

  /* Exclusively Hors Norme + Jeu Connexio rushes. No workshop reels. */
  const topVideos = [
    ['1wXefDhQ-hJ7pVfcMqN0lBzVwEwGJWOTt', 'Votre entrepreneuriat mis en lumière'],
    ['1WIv_dedZftlp8zvIL6PDC0AIcuA2PYwT', 'Accident et renaissance'],
    ['1FettXDX4Ta48yR89gKxjJP4DbC4z5XJx', 'Le moment qui change tout'],
    ['1UuxhkVfnqflldz7yqxlTlT_WQD6X7CZR', 'La solution vidéo professionnelle'],
    ['1DGr3ApLkFaFdET7PMBiPzPNlk6VlgX0l', 'Valoriser son expertise'],
    ['1aGylCxfH7zN6_SpHAhJIJlUYsJp4T8mT', 'Vaincre la procrastination'],
    ['1I8e4Z-zJIO9tScNT_RAkNFlSH_E7qg19', 'Créer de l’interaction'],
    ['1LGOX4JbIJA5mnoTyfMAuHO3VYm8KG3j_', 'Mieux se connaître'],
    ['1u_jxmnIZxmStpFosyD-zt14rC5wMCOQF', 'Raconter une épreuve'],
    ['1fpEtauiJ3FLAAg4wsruBy9IU6JDtgamj', 'Rebondir après une association'],
    ['1DdjzPCIEWDxrye50rv2nZeMwBYRVf2FP', 'Première expérience TV'],
    ['1JVphyztdw7B7M41ZMbNa_CGqRrt07LME', 'Une histoire hors norme']
  ];

  const bottomVideos = [
    ['1O2ogncx900FW9CkGgivhJuL-U4p_Psr8', 'Réseautage professionnel'],
    ['1zDzVMdq8KdbaV_UdqiQdRMwV_lC1YCLO', 'Rituels d’entrepreneur'],
    ['1rkSqza2gmcZdjEbafnipG3syB4CzHW1Q', 'Lancer son activité'],
    ['1o4QLddIcvG3pwKX7hDBKnmiSuKRuLIjj', 'Passer à l’action'],
    ['13RxRGG5VWtDctQr3BeFf83Ye-3Bbjcr8', 'La rencontre décisive'],
    ['1hnTykE0R1q8BX7VOvt0Wcu7WuVxS-6Fp', 'Dépasser ce qui vous bloque'],
    ['1j-NkoBy9_l2mE6Eluons0V-th1HmTCdB', 'Valoriser son expertise'],
    ['17cwNl-cbFtZ-fZxkosF-EXqrZk0_LXTS', 'Sortir des idées reçues'],
    ['1SD8pRBP6-on1veuSB6XoQKsK2f-NeFRr', 'Élever la qualité'],
    ['18mZY9YMyNPCW2aE1x5OE44PDEvicYsi9', 'Éviter les erreurs de réseautage'],
    ['1dNPLDxx574dbqxHJ_Z4_KPjQTypbKgKz', 'Grandir à plusieurs'],
    ['1u5060C_LbJSAmBgeYCdEEhaUaCuo7xxv', 'Apprendre de ses erreurs'],
    ['1yzhkXgzM97Q0OGAX6RN_ZHSy5q6bmMVl', 'Assumer sa valeur'],
    ['10hYWJoIrz75WjKiWpIIthk9zRU8hUwFe', 'Créer de vraies connexions'],
    ['1noS4Pd1s8bt7gzokkpbfAeXOxroBgvq4', 'Une histoire spontanée'],
    ['1DdjzPCIEWDxrye50rv2nZeMwBYRVf2FP', 'Le stress du premier direct']
  ];

  const videoUrl = (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  const posterUrl = (id) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w600`;

  const card = ([id, title], size) => `
    <article class="visibility-short visibility-short--${size}">
      <video muted loop playsinline preload="none" poster="${posterUrl(id)}" data-showcase-video data-src="${videoUrl(id)}" aria-label="${title.replace(/"/g, '&quot;')}"></video>
      <span class="visibility-short__shade" aria-hidden="true"></span>
      <span class="visibility-short__label">${title}</span>
    </article>`;

  const track = (items, size) => {
    const cards = items.map((item) => card(item, size)).join('');
    return Array.from({ length: 4 }, (_, index) => `<div class="visibility-marquee__group"${index ? ' aria-hidden="true"' : ''}>${cards}</div>`).join('');
  };

  target.dataset.visibilityShowcase = 'v21';
  target.className = 'visibility-showcase';
  target.id = 'a-voir';
  target.innerHTML = `
    <div class="visibility-showcase__intro container">
      <span class="eyebrow">Une production. Des semaines de visibilité.</span>
      <h2><strong>+30 contenus minimum</strong> garantis pour gagner en visibilité.</h2>
      <p>Une émission devient une bibliothèque de shorts, d’extraits et de prises de parole prêtes à publier.</p>
    </div>
    <div class="visibility-showcase__stage" aria-label="Exemples de contenus courts produits par Neptune Media">
      <div class="visibility-marquee visibility-marquee--top"><div class="visibility-marquee__track">${track(topVideos, 'large')}</div></div>
      <div class="visibility-marquee visibility-marquee--bottom"><div class="visibility-marquee__track">${track(bottomVideos, 'small')}</div></div>
    </div>
    <div class="visibility-showcase__footer container">
      <div class="visibility-delivery">
        <p class="visibility-delivery__title">Tout ça livré en <strong>moins de 15 jours</strong> dans votre espace client.</p>
        <p class="visibility-delivery__subtitle">accessible dès votre réservation confirmée</p>
      </div>
      <a class="visibility-showcase__next" href="#formats">
        <span>Pas encore convaincu ? <strong>Voyez la suite</strong></span>
        <span class="visibility-showcase__next-arrow" aria-hidden="true">↓</span>
      </a>
    </div>`;

  const videos = [...target.querySelectorAll('[data-showcase-video]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const loadAndPlay = (video) => {
    if (!video.src) {
      video.src = video.dataset.src;
      video.load();
    }
    if (!reducedMotion) video.play().catch(() => {});
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) loadAndPlay(video);
        else video.pause();
      });
    }, { rootMargin: '360px 50%', threshold: 0.01 });
    videos.forEach((video) => observer.observe(video));
  } else {
    videos.slice(0, 16).forEach(loadAndPlay);
  }

  document.addEventListener('visibilitychange', () => {
    videos.forEach((video) => {
      if (document.hidden) video.pause();
      else if (video.getBoundingClientRect().bottom > -200 && video.getBoundingClientRect().top < innerHeight + 200) loadAndPlay(video);
    });
  });
})();