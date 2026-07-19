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

  const playableSource = (episode) => {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    return metadata.previewUrl || metadata.trailerUrl || metadata.teaserUrl || episode?.videoUrl || '';
  };

  ready(async () => {
    const hero = document.querySelector('.voice-hero');
    const heroGrid = hero?.querySelector('.hero-grid');
    if (!hero || !heroGrid || hero.dataset.heroRefresh === 'v24') return;

    hero.dataset.heroRefresh = 'v24';
    document.body.dataset.heroRefresh = 'v24';

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
          <video muted playsinline preload="auto" poster="${fallbackPoster}" aria-label="Émission Hors Norme de Neptune Business en direct"></video>
          <a class="hero-v21__watch" href="/emissions/">Regarder l'émission</a>
        </div>
      </div>`;

    heroGrid.replaceChildren(stage);
    heroGrid.classList.add('hero-grid--v21');

    const live = stage.querySelector('.hero-v21__live');
    const frame = stage.querySelector('.hero-v21__video-frame');
    const video = frame.querySelector('video');
    const watch = stage.querySelector('.hero-v21__watch');
    const episode = await resolveHorsNormeEpisode();

    const attemptPlay = async () => {
      if (!video.src || document.hidden) return false;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      try {
        await video.play();
        frame.dataset.playing = 'true';
        frame.removeAttribute('data-stalled');
        return true;
      } catch (error) {
        frame.dataset.playing = 'false';
        return false;
      }
    };

    if (episode) {
      const source = playableSource(episode);
      video.poster = episode.posterUrl || fallbackPoster;
      watch.href = `/emissions/?episode=${encodeURIComponent(episode.slug || episode.id)}`;
      watch.setAttribute('aria-label', `Regarder ${episode.title}`);
      live.dataset.episodeId = episode.id;
      live.dataset.program = 'hors-norme';

      if (source) {
        video.src = source;
        video.autoplay = true;
        video.loop = true;
        video.load();

        const startPlayback = () => {
          if (Number.isFinite(video.duration) && video.duration > 40 && video.currentTime < 1) {
            try { video.currentTime = Math.min(8, Math.max(0, video.duration - 2)); } catch (_) {}
          }
          attemptPlay();
        };

        video.addEventListener('loadedmetadata', startPlayback, { once: true });
        video.addEventListener('canplay', attemptPlay, { once: true });
        video.addEventListener('playing', () => { frame.dataset.playing = 'true'; });
        video.addEventListener('pause', () => { frame.dataset.playing = 'false'; });
        video.addEventListener('waiting', () => frame.setAttribute('data-stalled', 'true'));
        video.addEventListener('playing', () => frame.removeAttribute('data-stalled'));
        video.addEventListener('error', () => {
          frame.dataset.playing = 'false';
          frame.setAttribute('data-stalled', 'true');
        });

        frame.addEventListener('click', (event) => {
          if (event.target.closest('.hero-v21__watch')) return;
          if (video.paused) attemptPlay();
          else video.pause();
        });

        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) attemptPlay();
            else video.pause();
          }, { threshold: 0.25 });
          observer.observe(frame);
        }

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) video.pause();
          else attemptPlay();
        });
      }
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