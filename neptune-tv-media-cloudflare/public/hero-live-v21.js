(() => {
  'use strict';

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  const first = ['influenceur.se', 'caméraman', 'vidéaste'];
  const second = ["chef.fe d'entreprise", 'entrepreneur.se', 'expert.e dans votre domaine'];
  const fallbackPoster = '/assets/posters/poster-neptune-media.webp';

  const isShort = (episode) => {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])]
      .filter(Boolean)
      .join(' ');
    const duration = Number(episode?.durationSeconds || 0);
    return metadata.short === true
      || metadata.vertical === true
      || /short|reel|vertical|portrait/i.test(declared)
      || (!metadata.fullEpisode && duration > 0 && duration <= 90);
  };

  const resolveHorsNormeEpisode = async () => {
    try {
      const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('catalog_unavailable');
      const data = await response.json();
      const programs = new Map((data.programs || []).map((program) => [program.id, program]));
      const episodes = (data.episodes || []).filter((episode) => !isShort(episode));
      return episodes.find((episode) => {
        const program = programs.get(episode.programId) || {};
        const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
        const haystack = [program.name, program.title, episode.title, metadata.format, metadata.program, metadata.tags]
          .flat()
          .filter(Boolean)
          .join(' ');
        return /hors\s*norme/i.test(haystack);
      }) || null;
    } catch (error) {
      console.error('hero_hors_norme_unavailable', error);
      return null;
    }
  };

  ready(async () => {
    const hero = document.querySelector('.voice-hero');
    const heroGrid = hero?.querySelector('.hero-grid');
    if (!hero || !heroGrid || hero.dataset.heroRefresh === 'v23') return;

    hero.dataset.heroRefresh = 'v23';
    document.body.dataset.heroRefresh = 'v23';

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
      <div class="hero-v21__live" aria-busy="true">
        <div class="hero-v21__live-head"><span class="hero-v21__live-dot"></span><span>Hors Norme · En direct sur Neptune TV</span></div>
        <div class="hero-v21__video-frame">
          <video muted autoplay loop playsinline preload="metadata" poster="${fallbackPoster}" aria-label="Émission Hors Norme de Neptune Business en direct"></video>
          <a class="hero-v21__watch" href="/emissions/">Regarder l'émission</a>
        </div>
      </div>`;

    heroGrid.replaceChildren(stage);
    heroGrid.classList.add('hero-grid--v21');

    const live = stage.querySelector('.hero-v21__live');
    const video = stage.querySelector('.hero-v21__video-frame video');
    const watch = stage.querySelector('.hero-v21__watch');
    const episode = await resolveHorsNormeEpisode();

    if (episode?.videoUrl) {
      video.poster = episode.posterUrl || fallbackPoster;
      video.src = episode.videoUrl;
      video.load();
      video.play().catch(() => {});
      watch.href = `/emissions/?episode=${encodeURIComponent(episode.slug || episode.id)}`;
      watch.setAttribute('aria-label', `Regarder ${episode.title}`);
      live.dataset.episodeId = episode.id;
      live.dataset.program = 'hors-norme';
    }
    live.setAttribute('aria-busy', 'false');

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

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.setInterval(swap, 2600);
  });
})();