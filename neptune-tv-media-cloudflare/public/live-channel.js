export async function mountLiveChannel(root, providedCatalog) {
  if (!root || root.dataset.liveMounted) return;
  root.dataset.liveMounted = '1';
  const catalog = providedCatalog || await fetch('/api/public/catalog').then((response) => response.ok ? response.json() : { programs: [], episodes: [] });
  const episodes = (catalog.episodes || []).filter((item) => item.status === 'published' && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/'))).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
  const video = root.querySelector('[data-live-video]');
  const title = root.querySelector('[data-live-title]');
  const program = root.querySelector('[data-live-program]');
  const playlist = root.querySelector('[data-live-playlist]');
  const sound = root.querySelector('[data-live-sound]');
  const resync = root.querySelector('[data-live-resync]');
  if (!video || !episodes.length) {
    if (title) title.textContent = 'Les premières émissions arrivent à l’antenne.';
    return;
  }

  let currentIndex = 0;
  let currentEpisode = null;
  let liveMode = true;
  let watchTick = 0;
  const sessionId = getSessionId();
  renderGuide();
  tuneToLive();

  sound?.addEventListener('click', () => {
    video.muted = !video.muted;
    sound.textContent = video.muted ? 'Activer le son' : 'Couper le son';
    if (video.paused) video.play().catch(() => {});
  });
  resync?.addEventListener('click', tuneToLive);
  video.addEventListener('ended', () => loadEpisode((currentIndex + 1) % episodes.length, 0, true));
  video.addEventListener('play', () => track('play'));
  video.addEventListener('timeupdate', () => {
    watchTick += 1;
    if (watchTick % 20 === 0) track('watch', 10);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && liveMode) tuneToLive(); });

  function tuneToLive() {
    liveMode = true;
    const schedule = livePosition(episodes);
    loadEpisode(schedule.index, schedule.position, true);
  }

  function loadEpisode(index, position = 0, autoplay = false) {
    currentIndex = index;
    currentEpisode = episodes[index];
    video.poster = currentEpisode.posterUrl || '';
    if (video.getAttribute('src') !== currentEpisode.videoUrl) video.src = currentEpisode.videoUrl;
    title.textContent = currentEpisode.title;
    program.textContent = programName(currentEpisode.programId);
    root.querySelectorAll('[data-live-episode]').forEach((item) => item.classList.toggle('is-current', item.dataset.liveEpisode === currentEpisode.id));
    const applyPosition = () => {
      const safePosition = Math.min(Math.max(0, position), Math.max(0, (video.duration || currentEpisode.durationSeconds || 1) - 2));
      if (safePosition > 0) video.currentTime = safePosition;
      if (autoplay) video.play().catch(() => {});
      track('view');
    };
    if (video.readyState >= 1) applyPosition(); else video.addEventListener('loadedmetadata', applyPosition, { once: true });
  }

  function renderGuide() {
    if (!playlist) return;
    playlist.innerHTML = episodes.map((episode, index) => `<button type="button" class="live-guide-item" data-live-episode="${escapeHtml(episode.id)}" data-index="${index}"><img src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt=""><span><small>${escapeHtml(programName(episode.programId))} · ${formatDuration(episode.durationSeconds)}</small><strong>${escapeHtml(episode.title)}</strong></span><b>▶</b></button>`).join('');
    playlist.querySelectorAll('[data-live-episode]').forEach((button) => button.addEventListener('click', () => {
      liveMode = false;
      loadEpisode(Number(button.dataset.index), 0, true);
    }));
  }

  function programName(id) { return catalog.programs?.find((item) => item.id === id)?.name || 'Neptune Media'; }
  async function track(event, delta = 0) {
    if (!currentEpisode) return;
    await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, episodeId: currentEpisode.id, sessionId, position: Math.round(video.currentTime || 0), delta, referrer: document.referrer, device: { width: innerWidth, touch: navigator.maxTouchPoints > 0, language: navigator.language } }) }).catch(() => {});
  }
}

function livePosition(episodes) {
  const durations = episodes.map((item) => Math.max(1, Number(item.durationSeconds || 1)));
  const total = durations.reduce((sum, value) => sum + value, 0);
  let cursor = Math.floor(Date.now() / 1000) % total;
  for (let index = 0; index < durations.length; index += 1) {
    if (cursor < durations[index]) return { index, position: cursor };
    cursor -= durations[index];
  }
  return { index: 0, position: 0 };
}
function getSessionId() { let value = localStorage.getItem('neptune_media_session'); if (!value) { value = crypto.randomUUID(); localStorage.setItem('neptune_media_session', value); } return value; }
function formatDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds || 0))); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${Math.max(1, minutes)} min`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }

document.querySelectorAll('[data-live-channel]').forEach((root) => mountLiveChannel(root).catch(console.error));
