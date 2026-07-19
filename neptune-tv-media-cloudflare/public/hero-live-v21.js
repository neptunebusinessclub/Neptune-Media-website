(() => {
  'use strict';

  const HERO_VERSION = 'v27';
  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  const first = ['influenceur.se', 'caméraman', 'vidéaste'];
  const second = ["chef.fe d'entreprise", 'entrepreneur.se', 'expert.e dans mon domaine'];
  const fallbackPoster = '/assets/posters/poster-neptune-media.webp';

  const ensureCriticalStyles = () => {
    document.getElementById('hero-live-critical-v26')?.remove();
    if (document.getElementById('hero-live-critical-v27')) return;

    const style = document.createElement('style');
    style.id = 'hero-live-critical-v27';
    style.textContent = `
      .voice-hero{padding:clamp(38px,5vw,64px) 0 clamp(56px,7vw,92px)!important;background:radial-gradient(circle at 50% 8%,rgba(98,63,255,.16),transparent 26%),radial-gradient(circle at 50% 34%,rgba(34,158,255,.08),transparent 40%),#020611!important}
      .hero-grid--v21{display:block!important}
      .hero-v21{display:grid!important;gap:clamp(24px,3vw,34px)!important;justify-items:center!important;text-align:center!important}
      .hero-v21__copy{width:min(1320px,94vw)!important;display:grid!important;justify-items:center!important;gap:10px!important}
      .hero-v21__line{margin:0!important;display:flex!important;flex-wrap:nowrap!important;justify-content:center!important;align-items:baseline!important;gap:.24em!important;font-weight:820!important;letter-spacing:-.055em!important;white-space:nowrap!important}
      .hero-v21__line--primary{font-size:clamp(2.35rem,4.9vw,4.9rem)!important;line-height:.98!important;color:#f5f8ff!important}
      .hero-v21__line--secondary{font-size:clamp(1.85rem,3.9vw,3.75rem)!important;line-height:1!important;color:#dfe8f7!important}
      .hero-v21__label{color:#f4f7fb!important}
      .hero-v21__word{display:inline-block!important;min-width:0!important;text-align:left!important;background:linear-gradient(110deg,#68cfff 12%,#8c84ff 56%,#ff9a7a 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;transition:opacity .28s ease,transform .28s ease,filter .28s ease!important}
      .hero-v21__word.is-exiting{opacity:0!important;transform:translateY(-8px)!important;filter:blur(7px)!important}
      .hero-v21__word.is-entering{animation:heroWordIn .42s ease!important}
      .hero-v21__micro{margin:8px 0 0!important;color:#9aabc3!important;font-size:clamp(.95rem,1.3vw,1.08rem)!important;line-height:1.55!important}
      .hero-v21__actions{margin-top:10px!important;display:flex!important;flex-wrap:wrap!important;justify-content:center!important;gap:12px!important}
      .hero-v21__actions .btn{min-height:50px!important;padding:0 22px!important;border-radius:999px!important}
      .hero-v21__actions .btn-secondary{border:1px solid rgba(255,255,255,.14)!important;background:rgba(7,16,34,.72)!important;color:#f4f7fb!important;box-shadow:none!important}
      .hero-v21__live{position:relative!important;isolation:isolate!important;width:min(980px,100%)!important;margin-inline:auto!important;display:grid!important;justify-items:center!important}
      .hero-v21__live::before{content:"";position:absolute;z-index:0;left:-7%;right:-7%;top:7%;bottom:-13%;border-radius:44px;background:radial-gradient(ellipse at 50% 42%,rgba(78,196,255,.52) 0%,rgba(76,164,255,.34) 24%,rgba(109,90,255,.26) 48%,rgba(183,83,255,.13) 64%,transparent 82%);filter:blur(54px);opacity:.92;pointer-events:none}
      .hero-v21__live::after{content:"";position:absolute;z-index:0;left:7%;right:7%;top:14%;bottom:-5%;border-radius:34px;background:linear-gradient(135deg,rgba(69,197,255,.18),rgba(126,92,255,.16));filter:blur(22px);opacity:.9;pointer-events:none}
      .hero-v21__live-head{position:relative!important;z-index:2!important;margin:0 auto 12px!important;display:inline-flex!important;align-items:center!important;gap:10px!important;padding:8px 14px!important;border-radius:999px!important;background:rgba(6,14,28,.72)!important;border:1px solid rgba(255,255,255,.1)!important;color:#dfe8f7!important;font-size:.76rem!important;font-weight:760!important;letter-spacing:.08em!important;text-transform:uppercase!important}
      .hero-v21__live-dot{width:8px!important;height:8px!important;border-radius:50%!important;background:#ff4d5d!important;box-shadow:0 0 0 6px rgba(255,77,93,.14)!important}
      .hero-v21__video-frame{position:relative!important;z-index:1!important;width:100%!important;aspect-ratio:16/9!important;border:1px solid rgba(151,215,255,.32)!important;border-radius:24px!important;overflow:hidden!important;background:#071022!important;box-shadow:0 38px 100px rgba(0,0,0,.52),0 0 42px rgba(74,174,255,.18),0 0 78px rgba(116,91,255,.12)!important}
      .hero-v21__video-frame video{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;background:#071022!important}
      .hero-v21__watch{position:absolute!important;z-index:2!important;left:50%!important;bottom:18px!important;transform:translateX(-50%)!important;min-height:46px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0 20px!important;border-radius:999px!important;background:rgba(4,10,22,.84)!important;border:1px solid rgba(255,255,255,.18)!important;color:#fff!important;text-decoration:none!important;font-size:.88rem!important;font-weight:780!important;backdrop-filter:blur(12px)!important;box-shadow:0 12px 30px rgba(0,0,0,.28)!important}
      @keyframes heroWordIn{from{opacity:0;transform:translateY(8px);filter:blur(7px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
      @media(max-width:980px){.hero-v21__line--primary{font-size:clamp(2rem,5.1vw,3.3rem)!important}.hero-v21__line--secondary{font-size:clamp(1.55rem,4vw,2.65rem)!important}}
      @media(max-width:760px){.voice-hero{padding:32px 0 58px!important}.hero-v21{gap:22px!important}.hero-v21__line{white-space:normal!important;flex-wrap:wrap!important;gap:6px!important}.hero-v21__word{text-align:center!important}.hero-v21__actions{display:grid!important;grid-template-columns:1fr!important;width:min(420px,100%)!important}.hero-v21__actions .btn{width:100%!important}.hero-v21__video-frame{border-radius:18px!important}.hero-v21__watch{bottom:12px!important;min-height:42px!important;font-size:.82rem!important}}
    `;
    document.head.append(style);
  };

  const isShort = (episode) => {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
    const duration = Number(episode?.durationSeconds || 0);
    return metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(declared) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
  };

  const resolveHorsNormeEpisode = async () => {
    try {
      const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('catalog_unavailable');
      const data = await response.json();
      const programs = new Map((data.programs || []).map((program) => [program.id, program]));
      return (data.episodes || []).filter((episode) => !isShort(episode)).find((episode) => {
        const program = programs.get(episode.programId) || {};
        const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
        return /hors\s*norme/i.test([program.name, program.title, episode.title, metadata.format, metadata.program, metadata.tags].flat().filter(Boolean).join(' '));
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
    ensureCriticalStyles();
    const hero = document.querySelector('.voice-hero');
    const heroGrid = hero?.querySelector('.hero-grid');
    if (!hero || !heroGrid || hero.dataset.heroRefresh === HERO_VERSION) return;

    hero.dataset.heroRefresh = HERO_VERSION;
    document.body.dataset.heroRefresh = HERO_VERSION;

    const stage = document.createElement('div');
    stage.className = 'hero-v21';
    stage.innerHTML = `
      <div class="hero-v21__copy">
        <p class="hero-v21__line hero-v21__line--primary"><span class="hero-v21__label">Je ne suis pas un.e</span><span class="hero-v21__word" data-hero-word-primary>${first[0]}</span></p>
        <p class="hero-v21__line hero-v21__line--secondary"><span class="hero-v21__label">Je suis un.e</span><span class="hero-v21__word" data-hero-word-secondary>${second[0]}</span></p>
        <p class="hero-v21__micro">Votre audience n'attend que ça ... et vos clients aussi.</p>
        <div class="hero-v21__actions"><a class="btn btn-primary" href="https://media.neptunebusiness.com/">Je veux être visible</a><a class="btn btn-secondary" href="#formats">Je choisis mon format</a></div>
      </div>
      <div class="hero-v21__live" aria-busy="true">
        <div class="hero-v21__live-head"><span class="hero-v21__live-dot"></span><span>Hors Norme · En direct sur Neptune TV</span></div>
        <div class="hero-v21__video-frame"><video muted playsinline preload="auto" poster="${fallbackPoster}" aria-label="Émission Hors Norme de Neptune Business en direct"></video><a class="hero-v21__watch" href="/emissions/">Regarder l'émission</a></div>
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
        return true;
      } catch (_) {
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
        video.addEventListener('loadedmetadata', () => {
          if (video.duration > 40 && video.currentTime < 1) {
            try { video.currentTime = 8; } catch (_) {}
          }
          attemptPlay();
        }, { once: true });
        video.addEventListener('canplay', attemptPlay, { once: true });
        frame.addEventListener('click', (event) => {
          if (event.target.closest('.hero-v21__watch')) return;
          video.paused ? attemptPlay() : video.pause();
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
      setTimeout(() => {
        primaryNode.textContent = first[index];
        secondaryNode.textContent = second[index];
        primaryNode.classList.remove('is-exiting');
        secondaryNode.classList.remove('is-exiting');
        primaryNode.classList.add('is-entering');
        secondaryNode.classList.add('is-entering');
      }, 260);
      setTimeout(() => {
        primaryNode.classList.remove('is-entering');
        secondaryNode.classList.remove('is-entering');
        locked = false;
      }, 680);
    };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(swap, 2600);
  });
})();
