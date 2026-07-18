export async function mountLiveChannel(root, providedCatalog) {
  if (!root || root.dataset.liveMounted) return;
  root.dataset.liveMounted = '1';
  const video = root.querySelector('[data-live-video]');
  const title = root.querySelector('[data-live-title]');
  const program = root.querySelector('[data-live-program]');
  const playlist = root.querySelector('[data-live-playlist]');
  const sound = root.querySelector('[data-live-sound]');
  const resync = root.querySelector('[data-live-resync]');
  const nowLabel = root.querySelector('[data-live-now]');
  const nextLabel = root.querySelector('[data-live-next]');
  const stage = video?.closest('.live-stage') || video?.parentElement;

  let catalog;
  try {
    catalog = providedCatalog || await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } }).then((response) => {
      if (!response.ok) throw new Error('catalog_unavailable');
      return response.json();
    });
  } catch (error) {
    root.dataset.liveState = 'error';
    if (title) title.textContent = 'Le direct ne peut pas être chargé.';
    if (nowLabel) nowLabel.textContent = 'Connexion interrompue';
    if (nextLabel) nextLabel.textContent = 'Réessayez ou regardez une émission';
    root.dispatchEvent(new CustomEvent('neptune:live-error', { bubbles: true, detail: { reason: error?.message || 'catalog_unavailable' } }));
    return;
  }

  const activeProgramIds = new Set((catalog.programs || []).filter(isActiveProgram).map((item) => item.id));
  const episodes = (catalog.episodes || [])
    .filter((item) => activeProgramIds.has(item.programId) && item.status === 'published' && item.slug && item.videoUrl && item.posterUrl && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/')))
    .sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const ads = (catalog.ads || []).filter((item) => item.assetType === 'video' && item.assetUrl && ['preroll', 'midroll', 'postroll'].includes(item.placement));
  const schedule = buildSchedule(episodes, ads);
  const adLink = document.createElement('a');
  adLink.className = 'live-ad-link';
  adLink.target = '_blank';
  adLink.rel = 'noopener sponsored';
  adLink.textContent = 'Découvrir l’annonceur';
  adLink.hidden = true;
  stage?.append(adLink);

  if (!video || !episodes.length || !schedule.length) {
    root.dataset.liveState = 'empty';
    if (title) title.textContent = 'Les premières émissions arrivent à l’antenne.';
    if (nowLabel) nowLabel.textContent = 'Aucune émission en cours';
    if (nextLabel) nextLabel.textContent = 'Programmation à venir';
    return;
  }

  let currentIndex = 0;
  let currentSegment = null;
  let currentEpisode = null;
  let currentAd = null;
  let liveMode = true;
  let watchTick = 0;
  let advancing = false;
  let lastStatusSecond = -1;
  const sessionId = getSessionId();
  renderGuide();
  tuneToLive();

  sound?.addEventListener('click', () => {
    video.muted = !video.muted;
    sound.textContent = video.muted ? 'Activer le son' : 'Couper le son';
    if (video.paused) video.play().catch(() => {});
  });
  resync?.addEventListener('click', tuneToLive);
  adLink.addEventListener('click', () => { if (currentAd) trackAd('click'); });
  video.addEventListener('ended', advance);
  video.addEventListener('play', () => currentAd ? trackAd('play') : track('play'));
  video.addEventListener('error', () => root.dispatchEvent(new CustomEvent('neptune:live-error', { bubbles: true, detail: { reason: 'media_error' } })));
  video.addEventListener('timeupdate', () => {
    watchTick += 1;
    if (!currentAd && watchTick % 20 === 0) track('watch', 10);
    const second = Math.floor(video.currentTime || 0);
    if (second !== lastStatusSecond) {
      lastStatusSecond = second;
      announceStatus();
    }
    if (!liveMode || !currentSegment || advancing) return;
    const boundary = currentSegment.type === 'episode'
      ? Number(currentSegment.mediaStart || 0) + Number(currentSegment.duration || 1)
      : Number(currentSegment.duration || 1);
    if (video.currentTime >= boundary - 0.2) advance();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && liveMode) tuneToLive(); });

  function advance() {
    if (advancing) return;
    advancing = true;
    if (currentAd) trackAd('complete');
    if (liveMode) loadSegment((currentIndex + 1) % schedule.length, 0, true);
    else loadEpisode((episodes.findIndex((item) => item.id === currentEpisode?.id) + 1) % episodes.length, 0, true);
    setTimeout(() => { advancing = false; }, 300);
  }

  function tuneToLive() {
    liveMode = true;
    root.dataset.liveMode = 'live';
    const position = livePosition(schedule);
    loadSegment(position.index, position.position, true);
  }

  function loadSegment(index, position = 0, autoplay = false) {
    currentIndex = index;
    currentSegment = schedule[index];
    if (currentSegment.type === 'ad') loadAd(currentSegment, position, autoplay);
    else loadEpisodeSegment(currentSegment, position, autoplay);
  }

  function loadEpisodeSegment(segment, position = 0, autoplay = false) {
    currentAd = null;
    currentEpisode = segment.episode;
    adLink.hidden = true;
    video.poster = currentEpisode.posterUrl || '';
    applyCaptions(currentEpisode);
    if (video.getAttribute('src') !== currentEpisode.videoUrl) video.src = currentEpisode.videoUrl;
    title.textContent = currentEpisode.title;
    program.textContent = programName(currentEpisode.programId);
    root.querySelectorAll('[data-live-episode]').forEach((item) => item.classList.toggle('is-current', item.dataset.liveEpisode === currentEpisode.id));
    applyMediaPosition(segment.mediaStart + position, autoplay, () => track('view'));
    announceStatus();
  }

  function loadAd(segment, position = 0, autoplay = false) {
    currentEpisode = segment.episode || null;
    currentAd = segment.ad;
    clearTracks();
    video.poster = '';
    if (video.getAttribute('src') !== currentAd.assetUrl) video.src = currentAd.assetUrl;
    title.textContent = currentAd.name || 'Message partenaire';
    program.textContent = currentAd.advertiserName ? `PUBLICITÉ · ${currentAd.advertiserName}` : 'PUBLICITÉ';
    adLink.href = currentAd.clickUrl || '#';
    adLink.hidden = !currentAd.clickUrl;
    root.querySelectorAll('[data-live-episode]').forEach((item) => item.classList.remove('is-current'));
    applyMediaPosition(position, autoplay, () => trackAd('impression'));
    announceStatus();
  }

  function applyMediaPosition(position, autoplay, onReady) {
    const apply = () => {
      const safePosition = Math.min(Math.max(0, position), Math.max(0, (video.duration || currentSegment?.duration || currentEpisode?.durationSeconds || 1) - 1));
      if (safePosition > 0) video.currentTime = safePosition;
      if (autoplay) video.play().catch(() => {});
      onReady?.();
      announceStatus();
    };
    if (video.readyState >= 1) apply(); else video.addEventListener('loadedmetadata', apply, { once: true });
  }

  function loadEpisode(index, position = 0, autoplay = false) {
    liveMode = false;
    root.dataset.liveMode = 'replay';
    currentSegment = { type: 'episode', episode: episodes[index], mediaStart: 0, duration: Number(episodes[index]?.durationSeconds || 1) };
    loadEpisodeSegment(currentSegment, position, autoplay);
  }

  function renderGuide() {
    if (!playlist) return;
    playlist.innerHTML = episodes.map((episode, index) => `<button type="button" class="live-guide-item" data-live-episode="${escapeHtml(episode.id)}" data-index="${index}" aria-label="Regarder ${escapeHtml(episode.title)}"><img loading="lazy" decoding="async" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt=""><span><small>${escapeHtml(programName(episode.programId))} · ${formatDuration(episode.durationSeconds)}</small><strong>${escapeHtml(episode.title)}</strong></span><b aria-hidden="true">▶</b></button>`).join('');
    playlist.querySelectorAll('[data-live-episode]').forEach((button) => button.addEventListener('click', () => loadEpisode(Number(button.dataset.index), 0, true)));
  }

  function announceStatus() {
    const remaining = remainingSeconds();
    const next = nextEpisodeTitle();
    const detail = {
      mode: liveMode ? 'live' : 'replay',
      title: currentAd ? (currentAd.name || 'Message partenaire') : (currentEpisode?.title || 'Neptune Media'),
      program: currentAd ? 'PUBLICITÉ' : programName(currentEpisode?.programId),
      nextTitle: next,
      remaining,
    };
    if (nowLabel) nowLabel.textContent = `${detail.title}${remaining > 0 ? ` · ${formatClock(remaining)} restantes` : ''}`;
    if (nextLabel) nextLabel.textContent = next || 'À suivre';
    root.dispatchEvent(new CustomEvent('neptune:live-status', { bubbles: true, detail }));
  }

  function remainingSeconds() {
    if (!video) return 0;
    if (!liveMode) return Math.max(0, Math.ceil((video.duration || currentEpisode?.durationSeconds || 0) - video.currentTime));
    if (!currentSegment) return 0;
    const end = currentSegment.type === 'episode'
      ? Number(currentSegment.mediaStart || 0) + Number(currentSegment.duration || 0)
      : Number(currentSegment.duration || 0);
    return Math.max(0, Math.ceil(end - Number(video.currentTime || 0)));
  }

  function nextEpisodeTitle() {
    if (!liveMode) {
      const index = episodes.findIndex((item) => item.id === currentEpisode?.id);
      return episodes[(index + 1 + episodes.length) % episodes.length]?.title || '';
    }
    for (let offset = 1; offset <= schedule.length; offset += 1) {
      const candidate = schedule[(currentIndex + offset) % schedule.length];
      if (candidate?.type === 'episode') return candidate.episode?.title || '';
    }
    return '';
  }

  function applyCaptions(episode) {
    clearTracks();
    const source = episode?.captionsUrl || episode?.metadata?.captionsUrl || episode?.metadata?.captionUrl || '';
    if (!source) return;
    const track = document.createElement('track');
    track.kind = 'captions';
    track.srclang = 'fr';
    track.label = 'Français';
    track.src = source;
    track.default = true;
    video.append(track);
  }
  function clearTracks() { video?.querySelectorAll('track').forEach((track) => track.remove()); }
  function programName(id) { return catalog.programs?.find((item) => item.id === id)?.name || 'Neptune Media'; }
  async function track(event, delta = 0) {
    if (!currentEpisode) return;
    await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, episodeId: currentEpisode.id, sessionId, position: Math.round(video.currentTime || 0), delta, referrer: document.referrer, device: { width: innerWidth, touch: navigator.maxTouchPoints > 0, language: navigator.language } }) }).catch(() => {});
  }
  async function trackAd(event) {
    if (!currentAd) return;
    await fetch('/api/ad-track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, adId: currentAd.id, episodeId: currentEpisode?.id || '', sessionId }) }).catch(() => {});
  }
}

function isActiveProgram(program) { return Boolean(program?.slug) && program.active !== false && Number(program.active ?? 1) !== 0; }
function buildSchedule(episodes, ads) {
  const grouped = { preroll: [], midroll: [], postroll: [] };
  for (const ad of ads) grouped[ad.placement]?.push(ad);
  const result = [];
  for (const episode of episodes) {
    for (const ad of grouped.preroll) result.push(adSegment(ad, episode));
    const duration = Math.max(1, Number(episode.durationSeconds || 1));
    if (grouped.midroll.length && duration >= 60) {
      const firstHalf = Math.floor(duration / 2);
      result.push({ type: 'episode', episode, mediaStart: 0, duration: firstHalf });
      for (const ad of grouped.midroll) result.push(adSegment(ad, episode));
      result.push({ type: 'episode', episode, mediaStart: firstHalf, duration: duration - firstHalf });
    } else result.push({ type: 'episode', episode, mediaStart: 0, duration });
    for (const ad of grouped.postroll) result.push(adSegment(ad, episode));
  }
  return result;
}
function adSegment(ad, episode) { const configured = Number(ad.targeting?.durationSeconds || ad.targeting?.duration || 15); return { type: 'ad', ad, episode, duration: Math.min(300, Math.max(1, configured)) }; }
function livePosition(schedule) {
  const total = schedule.reduce((sum, item) => sum + Math.max(1, Number(item.duration || 1)), 0);
  let cursor = Math.floor(Date.now() / 1000) % total;
  for (let index = 0; index < schedule.length; index += 1) {
    const duration = Math.max(1, Number(schedule[index].duration || 1));
    if (cursor < duration) return { index, position: cursor };
    cursor -= duration;
  }
  return { index: 0, position: 0 };
}
function getSessionId() { let value = localStorage.getItem('neptune_media_session'); if (!value) { value = crypto.randomUUID(); localStorage.setItem('neptune_media_session', value); } return value; }
function formatDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds || 0))); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${Math.max(1, minutes)} min`; }
function formatClock(seconds) { const value = Math.max(0, Math.floor(Number(seconds || 0))); const minutes = Math.floor(value / 60); const rest = value % 60; return `${minutes}:${String(rest).padStart(2, '0')}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

document.querySelectorAll('[data-live-channel]').forEach((root) => mountLiveChannel(root).catch((error) => {
  console.error(error);
  root.dispatchEvent(new CustomEvent('neptune:live-error', { bubbles: true, detail: { reason: error?.message || 'unknown' } }));
}));
