(() => {
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  const FUNNEL_BASE = 'https://media.neptunebusiness.com/';
  const SESSION_KEY = 'neptune_media_session';
  const AD_CAP_KEY = 'neptune_media_ad_caps';
  const sessionId = getSessionId();
  const state = {
    programs: [], episodes: [], ads: [], current: null, currentAd: null,
    mode: 'content', lastReportedTime: 0, thresholds: new Set(), skipTimer: null,
    heroPreviewLoaded: false, heroPreviewTimer: null,
  };

  const modal = qs('[data-video-modal]');
  const player = modal ? qs('video', modal) : null;
  const modalTitle = modal ? qs('[data-video-title]', modal) : null;
  const closeButton = modal ? qs('[data-video-close]', modal) : null;
  const modalAdLabel = qs('#modalAdLabel');
  const modalSkip = qs('#modalSkip');
  let lastTrigger = null;

  const buildFunnelUrl = (format = '', episode = '') => {
    const url = new URL(FUNNEL_BASE);
    url.searchParams.set('utm_source', 'webtv');
    url.searchParams.set('utm_medium', episode ? 'episode' : 'website');
    url.searchParams.set('utm_campaign', 'neptune_media');
    url.searchParams.set('session_id', sessionId);
    if (format) {
      url.searchParams.set('format', format);
      url.searchParams.set('offre', format);
      url.searchParams.set('utm_content', format);
    }
    if (episode) url.searchParams.set('episode', episode);
    return url.toString();
  };

  qsa('[data-funnel]').forEach((link) => {
    link.href = buildFunnelUrl(link.dataset.format || '');
    link.addEventListener('click', () => { if (state.current) track('booking_click'); });
  });

  bindNavigation();
  bindFaq();
  bindModal();
  bootstrapCatalog();

  async function bootstrapCatalog() {
    try {
      const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('catalog_unavailable');
      const data = await response.json();
      state.programs = data.programs || [];
      state.episodes = [...(data.episodes || [])].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
      state.ads = data.ads || [];
      renderHero();
      bindAutoplay();
      renderCatalog();
      renderHomeLive();
      window.dispatchEvent(new CustomEvent('neptune:catalog-ready', { detail: { count: state.episodes.length } }));
      state.episodes.forEach((episode) => track('impression', { episodeId: episode.id }));
      const deepLink = new URLSearchParams(location.search).get('episode');
      if (deepLink) {
        const episode = state.episodes.find((item) => item.slug === deepLink || item.id === deepLink);
        if (episode) openEpisode(episode, null);
      }
    } catch (error) {
      console.error(error);
      setHeroLoading(false);
      renderHomeLive('error');
      bindFallbackVideos();
      window.dispatchEvent(new CustomEvent('neptune:catalog-error'));
    }
  }

  function renderHero() {
    const episode = state.episodes[0];
    if (!episode) {
      setHeroLoading(false);
      return;
    }
    const heroVideo = qs('#heroPreview');
    const heroSource = qs('#heroPreviewSource');
    const heroTitle = qs('#heroEpisodeTitle');
    const heroPlay = qs('#heroPlay');
    const motionToggle = qs('#heroMotionToggle');
    if (heroVideo && heroSource) {
      clearTimeout(state.heroPreviewTimer);
      state.heroPreviewLoaded = false;
      heroVideo.pause();
      heroSource.removeAttribute('src');
      heroSource.dataset.src = previewSourceFor(episode);
      heroVideo.poster = episode.posterUrl || '/assets/posters/poster-neptune-media.webp';
      heroVideo.load();
      if (motionToggle) {
        motionToggle.hidden = !heroSource.dataset.src;
        if (!motionToggle.dataset.previewBound) {
          motionToggle.dataset.previewBound = '1';
          motionToggle.addEventListener('click', () => loadHeroPreview(true));
        }
      }
      setHeroLoading(false);
      if (heroSource.dataset.src) scheduleHeroPreview();
    }
    if (heroTitle) heroTitle.textContent = episode.title;
    if (heroPlay) {
      heroPlay.dataset.episodeId = episode.id;
      heroPlay.dataset.videoSrc = episode.videoUrl;
      heroPlay.dataset.videoPoster = episode.posterUrl || '';
      heroPlay.dataset.videoTitle = episode.title;
      heroPlay.onclick = () => openEpisode(episode, heroPlay);
    }
  }

  function previewSourceFor(episode) {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const explicit = metadata.previewUrl || metadata.trailerUrl || metadata.teaserUrl || '';
    if (explicit) return String(explicit);
    const duration = Number(episode?.durationSeconds || 0);
    return duration > 0 && duration <= 90 ? String(episode.videoUrl || '') : '';
  }

  function canAutoPreview() {
    const connection = navigator.connection || {};
    const slowConnection = /(^|-)2g$/.test(String(connection.effectiveType || ''));
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !connection.saveData && !slowConnection;
  }

  function setHeroLoading(loading) {
    const media = qs('#heroPreview')?.closest('.hero-media');
    if (!media) return;
    media.toggleAttribute('data-loading', Boolean(loading));
    media.setAttribute('aria-busy', String(Boolean(loading)));
  }

  function heroPreviewIsVisible(video = qs('#heroPreview')) {
    if (!video || document.hidden) return false;
    const rect = video.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function scheduleHeroPreview() {
    clearTimeout(state.heroPreviewTimer);
    if (!canAutoPreview() || !heroPreviewIsVisible()) return;
    state.heroPreviewTimer = window.setTimeout(() => {
      if (heroPreviewIsVisible()) loadHeroPreview(true);
    }, 900);
  }

  function loadHeroPreview(autoplay = false) {
    const heroVideo = qs('#heroPreview');
    const heroSource = qs('#heroPreviewSource');
    if (!heroVideo || !heroSource) return;
    if (!state.heroPreviewLoaded) {
      const source = heroSource.dataset.src;
      if (!source) {
        setHeroLoading(false);
        return;
      }
      setHeroLoading(true);
      heroSource.src = source;
      state.heroPreviewLoaded = true;
      heroVideo.load();
      heroVideo.addEventListener('loadeddata', () => setHeroLoading(false), { once: true });
      heroVideo.addEventListener('error', () => setHeroLoading(false), { once: true });
    }
    if (autoplay && canAutoPreview()) heroVideo.play().catch(() => setHeroLoading(false));
  }

  function renderHomeLive(status = 'ready') {
    const card = qs('[data-home-live]');
    if (!card) return;
    const badge = qs('[data-home-live-badge]', card);
    const title = qs('[data-home-live-title]', card);
    const copy = qs('[data-home-live-copy]', card);
    const action = qs('[data-home-live-action]', card);
    const liveEpisodes = state.episodes.filter((episode) => !isShortEpisode(episode) && episode.metadata?.live !== false && (episode.metadata?.fullEpisode || String(episode.videoUrl || '').startsWith('/media/')));
    card.setAttribute('aria-busy', 'false');
    if (status === 'error') {
      badge.dataset.state = 'error';
      badge.textContent = 'Indisponible';
      title.textContent = 'Le programme ne peut pas être vérifié.';
      copy.textContent = 'Ouvrez le direct pour réessayer ou consultez les émissions disponibles.';
      action.href = '/direct/';
      action.textContent = 'Vérifier le direct';
      return;
    }
    if (liveEpisodes.length) {
      badge.dataset.state = 'live';
      badge.textContent = 'En direct';
      title.textContent = 'Neptune Media à l’antenne.';
      copy.textContent = 'Rejoignez la diffusion en cours ou choisissez une émission du programme.';
      action.href = '/direct/';
      action.textContent = 'Voir le direct';
      return;
    }
    badge.dataset.state = 'offline';
    badge.textContent = 'À la demande';
    title.textContent = 'Aucun direct pour le moment.';
    copy.textContent = 'Les émissions déjà publiées restent disponibles immédiatement.';
    action.href = '/emissions/';
    action.textContent = 'Voir les émissions';
  }

  function renderCatalog() {
    const fullGrid = qs('#dynamicCatalog');
    if (!fullGrid || !state.episodes.length) {
      bindFallbackVideos();
      return;
    }
    const fullShell = fullGrid.closest('[data-content-rail]');
    const shortsShell = ensureShortsRail(fullShell);
    const shortsGrid = qs('#shortsCatalog');
    const fullEpisodes = state.episodes.filter((episode) => !isShortEpisode(episode)).slice(0, 8);
    const shorts = state.episodes.filter(isShortEpisode).slice(0, 12);

    fullGrid.dataset.railTrack = '';
    fullGrid.dataset.mediaKind = 'episode';
    fullShell?.setAttribute('data-media-kind', 'episode');
    const fullTitle = qs('.content-rail-head h3', fullShell || document);
    if (fullTitle) fullTitle.textContent = 'Émissions';

    renderMediaRail(fullGrid, fullEpisodes, 'episode');
    if (shortsGrid) renderMediaRail(shortsGrid, shorts, 'short');
    if (fullShell) fullShell.hidden = fullEpisodes.length === 0;
    if (shortsShell) shortsShell.hidden = shorts.length === 0;
  }

  function ensureShortsRail(afterShell) {
    let shell = qs('[data-content-rail][data-media-kind="short"]');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.className = 'content-rail-shell shorts-rail-shell';
    shell.dataset.contentRail = '';
    shell.dataset.mediaKind = 'short';
    shell.innerHTML = `<div class="content-rail-head"><h3>Shorts</h3><div class="content-rail-controls" aria-label="Faire défiler les shorts"><button class="rail-control" type="button" data-rail-prev aria-label="Shorts précédents">←</button><button class="rail-control" type="button" data-rail-next aria-label="Shorts suivants">→</button></div></div><div class="video-grid shorts-grid" id="shortsCatalog" data-rail-track data-media-kind="short" aria-live="polite"></div>`;
    afterShell?.after(shell);
    return shell;
  }

  function renderMediaRail(grid, episodes, kind) {
    grid.innerHTML = episodes.map((episode) => mediaCardMarkup(episode, kind)).join('');
    qsa('[data-episode-id]', grid).forEach((button) => {
      button.addEventListener('click', () => {
        const episode = state.episodes.find((item) => item.id === button.dataset.episodeId);
        if (episode) openEpisode(episode, button);
      });
    });
  }

  function mediaCardMarkup(episode, kind) {
    const program = programName(episode.programId);
    const format = formatLabel(program);
    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : String(metadata.tags || '');
    const search = [episode.title, episode.description, program, metadata.guestName, metadata.guestCompany, tags].filter(Boolean).join(' ');
    const className = kind === 'short' ? 'media-card media-card--short' : 'media-card media-card--episode';
    return `<button class="${className}" type="button" data-media-item data-media-kind="${kind}" data-episode-id="${escapeHtml(episode.id)}" data-episode-slug="${escapeHtml(episode.slug || episode.id)}" data-program="${escapeHtml(format)}" data-search="${escapeHtml(search)}" aria-label="Regarder ${escapeHtml(episode.title)}">
      <img loading="lazy" decoding="async" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt="Miniature de ${escapeHtml(episode.title)}">
      <span class="card-play" aria-hidden="true">▶</span>
      <span class="media-card-copy"><span class="media-card-meta"><span>${escapeHtml(format)}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span></span><h3>${escapeHtml(episode.title)}</h3></span>
      <span class="watch-progress" aria-hidden="true" hidden><i></i></span>
    </button>`;
  }

  function isShortEpisode(episode) {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
    const duration = Number(episode?.durationSeconds || 0);
    return metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
  }

  function bindFallbackVideos() {
    qsa('[data-video-src]').forEach((trigger) => {
      if (trigger.dataset.bound) return;
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', () => {
        const episode = {
          id: trigger.dataset.episodeId || trigger.dataset.track || crypto.randomUUID(),
          slug: trigger.dataset.track || '',
          title: trigger.dataset.videoTitle || 'Extrait Neptune Media',
          description: '',
          videoUrl: trigger.dataset.videoSrc,
          posterUrl: trigger.dataset.videoPoster || '',
          captionsUrl: trigger.dataset.captionsSrc || '',
          transcript: trigger.dataset.transcript || '',
          programId: '',
        };
        openEpisode(episode, trigger);
      });
    });
  }

  function bindNavigation() {
    const menuButton = qs('[data-menu-toggle]');
    const nav = qs('[data-nav]');
    if (!menuButton || !nav) return;
    const closeMenu = () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
    };
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
    });
    qsa('a', nav).forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => { if (window.innerWidth > 860) closeMenu(); });
  }

  function bindFaq() {
    if (document.documentElement.dataset.faqBound === '1') return;
    document.documentElement.dataset.faqBound = '1';
    const close = (item) => {
      const button = qs(':scope > button', item);
      const answer = qs('.faq-answer', item);
      item.classList.remove('is-open');
      if (button) {
        button.setAttribute('aria-expanded', 'false');
        const icon = button.lastElementChild;
        if (icon) icon.textContent = '+';
      }
      if (answer) answer.hidden = true;
    };
    qsa('[data-faq]').forEach(close);
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      const item = button?.closest('[data-faq]');
      if (!button || !item || button.parentElement !== item) return;
      const answer = qs('.faq-answer', item);
      if (!answer) return;
      const open = !item.classList.contains('is-open');
      qsa('[data-faq].is-open').forEach((other) => { if (other !== item) close(other); });
      if (!open) return close(item);
      item.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      const icon = button.lastElementChild;
      if (icon) icon.textContent = '−';
      answer.hidden = false;
    });
  }

  function bindModal() {
    closeButton?.addEventListener('click', closeVideo);
    modal?.addEventListener('click', (event) => { if (event.target === modal) closeVideo(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeVideo();
    });
    modalSkip?.addEventListener('click', () => startContent());
    player?.addEventListener('play', onPlay);
    player?.addEventListener('pause', onPause);
    player?.addEventListener('timeupdate', onTimeUpdate);
    player?.addEventListener('ended', onEnded);
    player?.addEventListener('loadedmetadata', syncModalAspect);
    window.addEventListener('pagehide', flushWatchTime);
  }

  function bindAutoplay() {
    if (!('IntersectionObserver' in window)) {
      scheduleHeroPreview();
      return;
    }
    const heroVideo = qs('#heroPreview');
    if (!heroVideo || heroVideo.dataset.previewObserved) return;
    heroVideo.dataset.previewObserved = '1';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (state.heroPreviewLoaded && canAutoPreview()) video.play().catch(() => {});
          else scheduleHeroPreview();
        } else {
          clearTimeout(state.heroPreviewTimer);
          video.pause();
        }
      });
    }, { threshold: 0.45 });
    observer.observe(heroVideo);
  }

  function openEpisode(episode, trigger) {
    if (!modal || !player) return;
    clearTimeout(state.heroPreviewTimer);
    qs('#heroPreview')?.pause();
    state.current = episode;
    modal.dataset.mediaKind = isShortEpisode(episode) ? 'short' : 'episode';
    modal.removeAttribute('data-player-aspect');
    modal.style.removeProperty('--player-aspect');
    state.thresholds.clear();
    state.lastReportedTime = 0;
    lastTrigger = trigger || document.activeElement;
    if (modalTitle) modalTitle.textContent = episode.title || 'Extrait Neptune Media';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    track('view');
    const preroll = chooseAd('preroll');
    if (preroll?.assetUrl) startAd(preroll);
    else startContent();
    closeButton?.focus();
    window.dispatchEvent(new CustomEvent('neptune:episode-opened', { detail: { episode } }));
  }

  function closeVideo() {
    if (!modal || !player) return;
    flushWatchTime();
    clearInterval(state.skipTimer);
    player.pause();
    player.removeAttribute('src');
    player.removeAttribute('poster');
    player.load();
    modal.classList.remove('is-open');
    modal.removeAttribute('data-media-kind');
    modal.removeAttribute('data-player-aspect');
    modal.style.removeProperty('--player-aspect');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    state.current = null;
    state.currentAd = null;
    hideAdUi();
    lastTrigger?.focus?.();
    if (state.heroPreviewLoaded && canAutoPreview() && heroPreviewIsVisible()) {
      window.setTimeout(() => qs('#heroPreview')?.play().catch(() => {}), 180);
    }
  }

  function syncModalAspect() {
    if (!modal || !player || !player.videoWidth || !player.videoHeight) return;
    const ratio = player.videoWidth / player.videoHeight;
    modal.dataset.playerAspect = ratio < .92 ? 'portrait' : 'landscape';
    modal.style.setProperty('--player-aspect', `${player.videoWidth} / ${player.videoHeight}`);
  }

  function syncModalAspect() {
    if (!modal || !player || !player.videoWidth || !player.videoHeight) return;
    const ratio = player.videoWidth / player.videoHeight;
    modal.dataset.playerAspect = ratio < .92 ? 'portrait' : 'landscape';
    modal.style.setProperty('--player-aspect', `${player.videoWidth} / ${player.videoHeight}`);
  }

  function syncModalAspect() {
    if (!modal || !player || !player.videoWidth || !player.videoHeight) return;
    const ratio = player.videoWidth / player.videoHeight;
    modal.dataset.playerAspect = ratio < .92 ? 'portrait' : 'landscape';
    modal.style.setProperty('--player-aspect', `${player.videoWidth} / ${player.videoHeight}`);
  }

  function startContent() {
    if (!state.current || !player) return;
    clearInterval(state.skipTimer);
    hideAdUi();
    state.mode = 'content';
    state.currentAd = null;
    player.src = state.current.videoUrl;
    player.poster = state.current.posterUrl || '';
    player.controls = true;
    state.lastReportedTime = 0;
    player.play().catch(() => {});
  }

  function startAd(ad) {
    if (!player) return;
    state.mode = 'ad';
    state.currentAd = ad;
    incrementAdCap(ad.id);
    player.src = ad.assetUrl;
    player.poster = '';
    player.controls = true;
    if (modalAdLabel) modalAdLabel.hidden = false;
    if (modalSkip) {
      modalSkip.hidden = false;
      modalSkip.disabled = true;
      let remaining = 5;
      modalSkip.innerHTML = `Passer dans <span>${remaining}</span>s`;
      clearInterval(state.skipTimer);
      state.skipTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(state.skipTimer);
          modalSkip.disabled = false;
          modalSkip.textContent = 'Passer la publicité';
        } else modalSkip.innerHTML = `Passer dans <span>${remaining}</span>s`;
      }, 1000);
    }
    trackAd('impression');
    player.play().catch(() => {});
  }

  function hideAdUi() {
    if (modalAdLabel) modalAdLabel.hidden = true;
    if (modalSkip) { modalSkip.hidden = true; modalSkip.disabled = true; }
  }

  function chooseAd(placement) {
    const candidates = state.ads.filter((ad) => ad.placement === placement && ad.active !== false && !adCapReached(ad));
    return candidates[Math.floor(Math.random() * candidates.length)] || null;
  }

  function adCapReached(ad) {
    const caps = getAdCaps();
    return Number(caps[ad.id] || 0) >= Number(ad.frequencyCap || 3);
  }

  function incrementAdCap(id) {
    const caps = getAdCaps();
    caps[id] = Number(caps[id] || 0) + 1;
    localStorage.setItem(AD_CAP_KEY, JSON.stringify({ day: today(), caps }));
  }

  function getAdCaps() {
    try {
      const saved = JSON.parse(localStorage.getItem(AD_CAP_KEY) || '{}');
      return saved.day === today() ? (saved.caps || {}) : {};
    } catch { return {}; }
  }

  function onPlay() {
    if (state.mode === 'ad') trackAd('play');
    else track('play', { position: player.currentTime });
  }

  function onPause() {
    if (state.mode === 'content' && player.currentTime > 0 && !player.ended) {
      flushWatchTime();
      track('pause', { position: player.currentTime });
    }
  }

  function onTimeUpdate() {
    if (state.mode !== 'content' || !state.current || !player.duration) return;
    const delta = player.currentTime - state.lastReportedTime;
    if (delta >= 10) {
      track('watch', { delta, position: player.currentTime });
      state.lastReportedTime = player.currentTime;
    }
    const percent = player.currentTime / player.duration;
    for (const [threshold, event] of [[.25, 'progress_25'], [.5, 'progress_50'], [.75, 'progress_75']]) {
      if (percent >= threshold && !state.thresholds.has(event)) {
        state.thresholds.add(event);
        track(event, { position: player.currentTime });
      }
    }
  }

  function onEnded() {
    if (state.mode === 'ad') {
      trackAd('complete');
      startContent();
    } else {
      flushWatchTime();
      track('complete', { position: player.duration || player.currentTime });
      const postroll = chooseAd('postroll');
      if (postroll?.assetUrl) startAd(postroll);
    }
  }

  function flushWatchTime() {
    if (state.mode !== 'content' || !state.current || !player) return;
    const delta = player.currentTime - state.lastReportedTime;
    if (delta > 1) {
      track('watch', { delta, position: player.currentTime }, true);
      state.lastReportedTime = player.currentTime;
    }
  }

  function track(event, extra = {}, beacon = false) {
    const episodeId = extra.episodeId || state.current?.id;
    if (!episodeId) return;
    const payload = JSON.stringify({
      event, episodeId, sessionId,
      position: Number(extra.position || 0),
      delta: Number(extra.delta || 0),
      referrer: document.referrer,
      device: { width: innerWidth, touch: navigator.maxTouchPoints > 0, language: navigator.language },
    });
    if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  }

  function trackAd(event) {
    if (!state.currentAd) return;
    fetch('/api/ad-track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ event, adId: state.currentAd.id, episodeId: state.current?.id, sessionId }),
    }).catch(() => {});
  }

  qsa('[data-track]').forEach((element) => {
    element.addEventListener('click', () => {
      const eventName = element.dataset.track;
      if (window.plausible && eventName) window.plausible(eventName);
      if (window.gtag && eventName) window.gtag('event', eventName);
    });
  });

  function getSessionId() {
    let value = localStorage.getItem(SESSION_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, value);
    }
    return value;
  }
  function programName(id) { return state.programs.find((program) => program.id === id)?.name || 'Neptune Media'; }
  function formatLabel(name) { return /hors\s*norme/i.test(String(name || '')) ? 'Hors Norme' : 'Concept Libre'; }
  function formatDuration(seconds) { const value = Number(seconds || 0); return value < 60 ? `${value}s` : `${Math.floor(value / 60)} min ${value % 60}s`; }
  function today() { return new Date().toISOString().slice(0, 10); }
})();
