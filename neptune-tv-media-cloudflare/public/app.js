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
  bindAutoplay();
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
      renderCatalog();
      state.episodes.forEach((episode) => track('impression', { episodeId: episode.id }));
      const deepLink = new URLSearchParams(location.search).get('episode');
      if (deepLink) {
        const episode = state.episodes.find((item) => item.slug === deepLink || item.id === deepLink);
        if (episode) openEpisode(episode, null);
      }
    } catch (error) {
      console.error(error);
      bindFallbackVideos();
    }
  }

  function renderHero() {
    const episode = state.episodes[0];
    if (!episode) return;
    const heroVideo = qs('#heroPreview');
    const heroSource = qs('#heroPreviewSource');
    const heroTitle = qs('#heroEpisodeTitle');
    const heroPlay = qs('#heroPlay');
    if (heroVideo && heroSource) {
      heroVideo.pause();
      heroSource.src = episode.videoUrl;
      heroVideo.poster = episode.posterUrl || '/assets/posters/poster-neptune-media.webp';
      heroVideo.load();
      heroVideo.play().catch(() => {});
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

  function renderCatalog() {
    const grid = qs('#dynamicCatalog');
    if (!grid || !state.episodes.length) {
      bindFallbackVideos();
      return;
    }
    grid.innerHTML = state.episodes.map((episode) => `
      <button class="media-card" type="button" data-episode-id="${escapeHtml(episode.id)}">
        <img loading="lazy" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt="Miniature de ${escapeHtml(episode.title)}">
        <span class="card-play">▶</span>
        <span class="media-card-copy">
          <span class="media-card-meta"><span>${escapeHtml(programName(episode.programId))}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span></span>
          <h3>${escapeHtml(episode.title)}</h3>
          <p>${escapeHtml(episode.description || 'Une histoire entrepreneuriale racontée sur le plateau Neptune Media.')}</p>
        </span>
      </button>`).join('');
    qsa('[data-episode-id]', grid).forEach((button) => {
      button.addEventListener('click', () => {
        const episode = state.episodes.find((item) => item.id === button.dataset.episodeId);
        if (episode) openEpisode(episode, button);
      });
    });
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
    qsa('[data-faq]').forEach((item) => {
      const button = qs('button', item);
      button?.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
      });
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
    window.addEventListener('pagehide', flushWatchTime);
  }

  function bindAutoplay() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    }, { threshold: 0.35 });
    qsa('video[data-autoplay]').forEach((video) => observer.observe(video));
  }

  function openEpisode(episode, trigger) {
    if (!modal || !player) return;
    state.current = episode;
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
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    state.current = null;
    state.currentAd = null;
    hideAdUi();
    lastTrigger?.focus?.();
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
  function formatDuration(seconds) { const value = Number(seconds || 0); return value < 60 ? `${value}s` : `${Math.floor(value / 60)} min ${value % 60}s`; }
  function today() { return new Date().toISOString().slice(0, 10); }
})();
