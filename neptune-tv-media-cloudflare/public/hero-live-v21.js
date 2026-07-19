(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  const first = ['influenceur.se', 'caméraman', 'vidéaste'];
  const second = ["chef.fe d'entreprise", 'entrepreneur.se', 'expert.e dans votre domaine'];

  ready(() => {
    const hero = document.querySelector('.voice-hero');
    const heroGrid = hero?.querySelector('.hero-grid');
    if (!hero || !heroGrid || hero.dataset.heroRefresh === 'v21') return;

    const mediaWrap = hero.querySelector('.hero-media-wrap, .hero-media, .hero-grid > :last-child');
    if (!mediaWrap) return;

    hero.dataset.heroRefresh = 'v21';
    document.body.dataset.heroRefresh = 'v21';

    const stage = document.createElement('div');
    stage.className = 'hero-v21';
    stage.innerHTML = `
      <div class="hero-v21__copy">
        <p class="hero-v21__line hero-v21__line--primary">
          <span class="hero-v21__label">Je ne suis pas un.e</span>
          <span class="hero-v21__word" data-hero-word-primary>${first[0]}</span>
        </p>
        <p class="hero-v21__line hero-v21__line--secondary">
          <span class="hero-v21__label">Je suis un.e</span>
          <span class="hero-v21__word" data-hero-word-secondary>${second[0]}</span>
        </p>
        <p class="hero-v21__micro">Votre audience n'attend que ça ... et vos clients aussi.</p>
        <div class="hero-v21__actions">
          <a class="btn btn-primary" href="https://media.neptunebusiness.com/">Je veux être visible</a>
          <a class="btn btn-secondary" href="#formats">Je choisis mon format</a>
        </div>
      </div>
      <div class="hero-v21__live">
        <div class="hero-v21__live-head">
          <span class="hero-v21__live-dot"></span>
          <span>En direct sur Neptune TV</span>
        </div>
      </div>
    `;

    const liveSlot = stage.querySelector('.hero-v21__live');
    liveSlot.appendChild(mediaWrap);

    heroGrid.replaceChildren(stage);
    heroGrid.classList.add('hero-grid--v21');

    const primaryNode = stage.querySelector('[data-hero-word-primary]');
    const secondaryNode = stage.querySelector('[data-hero-word-secondary]');
    let index = 0;
    let locked = false;

    const swap = () => {
      if (locked) return;
      locked = true;
      index = (index + 1) % first.length;
      primaryNode.classList.add('is-exiting');
      secondaryNode.classList.add('is-exiting');

      window.setTimeout(() => {
        primaryNode.textContent = first[index];
        secondaryNode.textContent = second[index];
        primaryNode.classList.remove('is-exiting');
        secondaryNode.classList.remove('is-exiting');
        primaryNode.classList.add('is-entering');
        secondaryNode.classList.add('is-entering');
      }, 260);

      window.setTimeout(() => {
        primaryNode.classList.remove('is-entering');
        secondaryNode.classList.remove('is-entering');
        locked = false;
      }, 680);
    };

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setInterval(swap, 2600);
    }
  });
})();
