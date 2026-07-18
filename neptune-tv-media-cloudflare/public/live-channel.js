export async function mountLiveChannel(root, providedCatalog) {
  if (!root || root.dataset.liveMounted) return;
  root.dataset.liveMounted = '1';
  const catalog = providedCatalog || await fetch('/api/public/catalog').then((response) => response.ok ? response.json() : { programs: [], episodes: [], ads: [] });
  const activeProgramIds = new Set((catalog.programs || []).filter(isActiveProgram).map((item) => item.id));
  const episodes = (catalog.episodes || []).filter((item) => activeProgramIds.has(item.programId) && item.status === 'published' && item.slug && item.videoUrl && item.posterUrl && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/'))).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const ads = (catalog.ads || []).filter((item) => item.assetType === 'video' && item.assetUrl && ['preroll', 'midroll', 'postroll'].includes(item.placement));
  const schedule = buildSchedule(episodes, ads);
  const video = root.querySelector('[data-live-video]');
  const title = root.querySelector('[data-live-title]');
  const program = root.querySelector('[data-live-program]');
  const playlist = root.querySelector('[data-live-playlist]');
  const sound = root.querySelector('[data-live-sound]');
  const resync = root.querySelector('[data-live-resync]');
  const stage = video?.closest('.live-stage') || video?.parentElement;
  const adLink = document.createElement('a');
  adLink.className = 'live-ad-link';
  adLink.target = '_blank';
  adLink.rel = 'noopener sponsored';
  adLink.textContent = 'Découvrir l’annonceur';
  adLink.hidden = true;
  stage?.append(adLink);
  if (!video || !episodes.length || !schedule.length) {
    if (title) title.textContent = 'Les premières émissions arrivent à l’antenne.';
    return;
  }

  let currentIndex = 0;
  let currentSegment = null;
  let currentEpisode = null;
  let currentAd = null;
  let liveMode = true;
  let watchTick = 0;
  let advancing = false;
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
  video.addEventListener('timeupdate', () => {
    watchTick += 1;
    if (!currentAd && watchTick % 20 === 0) track('watch', 10);
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
    if (video.getAttribute('src') !== currentEpisode.videoUrl) video.src = currentEpisode.videoUrl;
    title.textContent = currentEpisode.title;
    program.textContent = programName(currentEpisode.programId);
    root.querySelectorAll('[data-live-episode]').forEach((item) => item.classList.toggle('is-current', item.dataset.liveEpisode === currentEpisode.id));
    applyMediaPosition(segment.mediaStart + position, autoplay, () => track('view'));
  }

  function loadAd(segment, position = 0, autoplay = false) {
    currentEpisode = segment.episode || null;
    currentAd = segment.ad;
    video.poster = '';
    if (video.getAttribute('src') !== currentAd.assetUrl) video.src = currentAd.assetUrl;
    title.textContent = currentAd.name || 'Message partenaire';
    program.textContent = currentAd.advertiserName ? `PUBLICITÉ · ${currentAd.advertiserName}` : 'PUBLICITÉ';
    adLink.href = currentAd.clickUrl || '#';
    adLink.hidden = !currentAd.clickUrl;
    root.querySelectorAll('[data-live-episode]').forEach((item) => item.classList.remove('is-current'));
    applyMediaPosition(position, autoplay, () => trackAd('impression'));
  }

  function applyMediaPosition(position, autoplay, onReady) {
    const apply = () => {
      const safePosition = Math.min(Math.max(0, position), Math.max(0, (video.duration || currentSegment?.duration || currentEpisode?.durationSeconds || 1) - 1));
      if (safePosition > 0) video.currentTime = safePosition;
      if (autoplay) video.play().catch(() => {});
      onReady?.();
    };
    if (video.readyState >= 1) apply(); else video.addEventListener('loadedmetadata', apply, { once: true });
  }

  function loadEpisode(index, position = 0, autoplay = false) {
    liveMode = false;
    currentSegment = { type: 'episode', episode: episodes[index], mediaStart: 0, duration: Number(episodes[index]?.durationSeconds || 1) };
    loadEpisodeSegment(currentSegment, position, autoplay);
  }

  function renderGuide() {
    if (!playlist) return;
    playlist.innerHTML = episodes.map((episode, index) => `<button type="button" class="live-guide-item" data-live-episode="${escapeHtml(episode.id)}" data-index="${index}"><img src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt=""><span><small>${escapeHtml(programName(episode.programId))} · ${formatDuration(episode.durationSeconds)}</small><strong>${escapeHtml(episode.title)}</strong></span><b>▶</b></button>`).join('');
    playlist.querySelectorAll('[data-live-episode]').forEach((button) => button.addEventListener('click', () => loadEpisode(Number(button.dataset.index), 0, true)));
  }

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
    } else {
      result.push({ type: 'episode', episode, mediaStart: 0, duration });
    }
    for (const ad of grouped.postroll) result.push(adSegment(ad, episode));
  }
  return result;
}

function adSegment(ad, episode) {
  const configured = Number(ad.targeting?.durationSeconds || ad.targeting?.duration || 15);
  return { type: 'ad', ad, episode, duration: Math.min(300, Math.max(1, configured)) };
}

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
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

document.querySelectorAll('[data-live-channel]').forEach((root) => mountLiveChannel(root).catch(console.error));