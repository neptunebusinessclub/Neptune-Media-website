(() => {
  'use strict';

  const target = document.querySelector('.proof-by-content');
  if (!target || target.dataset.visibilityShowcase === 'v19') return;

  const topVideos = [
    ['12DRb3sYrlMItuiDLFHcVsIPlb1uj-gRO', 'Événements simplifiés'],
    ['1HJ9f3fqtLCbHIQd3VP-jPriJ1AqsGh04', 'Varier ses formats'],
    ['1j98Znzfa5Os0yMbLFliNc-xs2QjXDEDs', 'Stratégie réseaux sociaux'],
    ['1XJvvLpPZjE1iBIouEMq4anOklVgR-Jo5', 'Identité visuelle'],
    ['1JyqyrdC2jl0220Tq_mQj_GeMjL6apKCD', 'Outils pour entrepreneurs'],
    ['1MIYByFtn07PFBi4kpJEGZkd6mwZMBnqV', 'Trouver ses clients'],
    ['1hgNV7sZCCNxoLfanhARyft4wnBLjKP0T', 'Obtenir plus de clients'],
    ['1GBsDfNbBZsS3EkjMsLD-vPUrjyI8q_yN', 'Plus de vues en vidéo']
  ];

  const bottomVideos = [
    ['1DGr3ApLkFaFdET7PMBiPzPNlk6VlgX0l', 'Valoriser son expertise'],
    ['1O2ogncx900FW9CkGgivhJuL-U4p_Psr8', 'Réseautage professionnel'],
    ['1aGylCxfH7zN6_SpHAhJIJlUYsJp4T8mT', 'Vaincre la procrastination'],
    ['1zDzVMdq8KdbaV_UdqiQdRMwV_lC1YCLO', 'Rituels d’entrepreneur'],
    ['1I8e4Z-zJIO9tScNT_RAkNFlSH_E7qg19', 'Créer de l’interaction'],
    ['1rkSqza2gmcZdjEbafnipG3syB4CzHW1Q', 'Lancer son activité'],
    ['1LGOX4JbIJA5mnoTyfMAuHO3VYm8KG3j_', 'Mieux se connaître'],
    ['1o4QLddIcvG3pwKX7hDBKnmiSuKRuLIjj', 'Passer à l’action'],
    ['1u_jxmnIZxmStpFosyD-zt14rC5wMCOQF', 'Raconter une épreuve'],
    ['13RxRGG5VWtDctQr3BeFf83Ye-3Bbjcr8', 'La rencontre décisive'],
    ['1fpEtauiJ3FLAAg4wsruBy9IU6JDtgamj', 'Rebondir après une association'],
    ['1DdjzPCIEWDxrye50rv2nZeMwBYRVf2FP', 'Première expérience TV']
  ];

  const videoUrl = (id) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  const posterUrl = (id) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w600`;

  const card = ([id, title], size) => `
    <article class="visibility-short visibility-short--${size}">
      <video
        muted
        loop
        playsinline
        preload="none"
        poster="${posterUrl(id)}"
        data-showcase-video
        data-src="${videoUrl(id)}"
        aria-label="${title.replace(/"/g, '&quot;')}"
      ></video>
      <span class="visibility-short__shade" aria-hidden="true"></span>
      <span class="visibility-short__label">${title}</span>
    </article>`;

  const track = (items, size) => {
    const cards = items.map((item) => card(item, size)).join('');
    return `<div class="visibility-marquee__group">${cards}</div><div class="visibility-marquee__group" aria-hidden="true">${cards}</div>`;
  };

  target.dataset.visibilityShowcase = 'v19';
  target.className = 'visibility-showcase';
  target.id = 'a-voir';
  target.innerHTML = `
    <div class="visibility-showcase__intro container">
      <span class="eyebrow">Une production. Des semaines de visibilité.</span>
      <h2><strong>+30 contenus minimum</strong> garantis pour gagner en visibilité.</h2>
      <p>Une émission devient une bibliothèque de shorts, d’extraits et de prises de parole prêtes à publier.</p>
    </div>
    <div class="visibility-showcase__stage" aria-label="Exemples de contenus courts produits par Neptune Media">
      <div class="visibility-marquee visibility-marquee--top">
        <div class="visibility-marquee__track">${track(topVideos, 'large')}</div>
      </div>
      <div class="visibility-marquee visibility-marquee--bottom">
        <div class="visibility-marquee__track">${track(bottomVideos, 'small')}</div>
      </div>
    </div>
    <div class="visibility-showcase__footer container">
      <span>Formats verticaux · sous-titrés · prêts à publier</span>
      <a class="btn btn-primary" href="#formats">Découvrir les formats</a>
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
    }, { rootMargin: '320px 0px', threshold: 0.05 });
    videos.forEach((video) => observer.observe(video));
  } else {
    videos.slice(0, 8).forEach(loadAndPlay);
  }

  document.addEventListener('visibilitychange', () => {
    videos.forEach((video) => {
      if (document.hidden) video.pause();
      else if (video.getBoundingClientRect().bottom > -200 && video.getBoundingClientRect().top < innerHeight + 200) loadAndPlay(video);
    });
  });
})();
