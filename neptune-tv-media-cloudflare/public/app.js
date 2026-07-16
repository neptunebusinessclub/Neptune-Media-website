const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const SESSION_KEY = 'neptune_media_session';
const AD_CAP_KEY = 'neptune_media_ad_caps';
const sessionId = getSessionId();
const state = {
  programs: [], episodes: [], ads: [], current: null, currentAd: null,
  mode: 'content', lastReportedTime: 0, thresholds: new Set(), filter: 'all', skipTimer: null,
};

const catalog = $('#catalog');
const featured = $('#featured');
const status = $('#status');
const filters = $('#programFilters');
const modal = $('#modal');
const player = $('#player');
const videoTitle = $('#videoTitle');
const videoProgram = $('#videoProgram');
const book = $('#book');
const adLabel = $('#adLabel');
const adClick = $('#adClick');
const skipAd = $('#skipAd');
const bannerAd = $('#bannerAd');

bootstrap();

async function bootstrap() {
  bindStaticEvents();
  try {
    const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('catalog_unavailable');
    const data = await response.json();
    state.programs = data.programs || [];
    state.episodes = data.episodes || [];
    state.ads = data.ads || [];
    renderFilters();
    renderCatalog();
    status.textContent = `${state.episodes.length} émission${state.episodes.length > 1 ? 's' : ''} disponible${state.episodes.length > 1 ? 's' : ''}`;
    for (const episode of state.episodes) track('impression', { episodeId: episode.id });
    const deepLink = new URLSearchParams(location.search).get('episode');
    if (deepLink) {
      const episode = state.episodes.find((item) => item.slug === deepLink || item.id === deepLink);
      if (episode) openVideo(episode.id);
    }
  } catch (error) {
    console.error(error);
    status.textContent = 'Catalogue momentanément indisponible';
    catalog.innerHTML = '<p>Les émissions ne peuvent pas être chargées pour le moment.</p>';
  }
}

function bindStaticEvents() {
  $('#close').addEventListener('click', closeVideo);
  $('#share').addEventListener('click', shareVideo);
  skipAd.addEventListener('click', () => startContent());
  book.addEventListener('click', () => track('booking_click'));
  $$('[data-booking]').forEach((link) => link.addEventListener('click', () => {
    if (state.current) track('booking_click');
  }));
  player.addEventListener('play', onPlay);
  player.addEventListener('pause', onPause);
  player.addEventListener('timeupdate', onTimeUpdate);
  player.addEventListener('ended', onEnded);
  window.addEventListener('pagehide', flushWatchTime);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeVideo();
  });
}

function renderFilters() {
  const buttons = [{ id: 'all', name: 'Tout' }, ...state.programs.map((program) => ({ id: program.id, name: program.name }))];
  filters.innerHTML = buttons.map((button) => `<button class="${button.id === state.filter ? 'active' : ''}" data-filter="${escapeHtml(button.id)}">${escapeHtml(button.name)}</button>`).join('');
  filters.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    renderFilters();
    renderCatalog();
  }));
}

function renderCatalog() {
  const visible = state.filter === 'all' ? state.episodes : state.episodes.filter((episode) => episode.programId === state.filter);
  catalog.innerHTML = visible.map(card).join('') || '<p>Aucune émission dans ce programme.</p>';
  catalog.querySelectorAll('[data-episode]').forEach((button) => button.addEventListener('click', () => openVideo(button.dataset.episode)));
  const first = state.episodes[0];
  featured.innerHTML = first ? `<button data-featured="${escapeHtml(first.id)}"><img src="${escapeHtml(first.posterUrl || '/assets/posters/default.svg')}" alt=""><div class="inside"><p class="eyebrow">ÉMISSION À LA UNE</p><h3>${escapeHtml(first.title)}</h3><p>${escapeHtml(first.description)}</p></div></button>` : '';
  featured.querySelector('[data-featured]')?.addEventListener('click', () => openVideo(first.id));
}

function card(episode) {
  return `<article class="card"><button data-episode="${escapeHtml(episode.id)}"><img loading="lazy" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt="Miniature de ${escapeHtml(episode.title)}"><div class="inside"><span class="badge">${escapeHtml(programName(episode.programId))}</span><h3>${escapeHtml(episode.title)}</h3><p>${escapeHtml(episode.description)}</p><span class="duration">${formatDuration(episode.durationSeconds)}</span></div></button></article>`;
}

function openVideo(id) {
  state.current = state.episodes.find((episode) => episode.id === id);
  if (!state.current) return;
  state.thresholds.clear();
  state.lastReportedTime = 0;
  videoTitle.textContent = state.current.title;
  videoProgram.textContent = programName(state.current.programId);
  const url = new URL('https://media.neptunebusiness.com/');
  url.searchParams.set('utm_source', 'webtv');
  url.searchParams.set('utm_medium', 'episode');
  url.searchParams.set('utm_campaign', 'neptune_media');
  url.searchParams.set('episode', state.current.slug || state.current.id);
  url.searchParams.set('session_id', sessionId);
  book.href = url.toString();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  track('view');
  const preroll = chooseAd('preroll');
  if (preroll?.assetUrl) startAd(preroll);
  else startContent();
}

function closeVideo() {
  flushWatchTime();
  clearInterval(state.skipTimer);
  player.pause();
  player.removeAttribute('src');
  player.load();
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  state.current = null;
  state.currentAd = null;
  hideAds();
}

function startAd(ad) {
  state.mode = 'ad';
  state.currentAd = ad;
  incrementAdCap(ad.id);
  player.controls = true;
  player.src = ad.assetUrl;
  adLabel.classList.remove('hidden');
  if (ad.clickUrl) {
    adClick.href = ad.clickUrl;
    adClick.classList.remove('hidden');
    adClick.onclick = () => trackAd('click');
  }
  let remaining = 5;
  skipAd.querySelector('span').textContent = String(remaining);
  skipAd.disabled = true;
  skipAd.classList.remove('hidden');
  clearInterval(state.skipTimer);
  state.skipTimer = setInterval(() => {
    remaining -= 1;
    skipAd.querySelector('span').textContent = String(Math.max(0, remaining));
    if (remaining <= 0) {
      clearInterval(state.skipTimer);
      skipAd.disabled = false;
      skipAd.textContent = 'Passer la publicité';
    }
  }, 1000);
  trackAd('impression');
  player.play().catch(() => {});
}

function startContent() {
  clearInterval(state.skipTimer);
  hideAds();
  state.mode = 'content';
  state.currentAd = null;
  player.src = state.current.videoUrl;
  player.poster = state.current.posterUrl || '';
  player.controls = true;
  state.lastReportedTime = 0;
  const banner = chooseAd('banner');
  if (banner?.assetUrl && banner.assetType === 'image') {
    bannerAd.querySelector('img').src = banner.assetUrl;
    bannerAd.href = banner.clickUrl || '#';
    bannerAd.classList.remove('hidden');
    bannerAd.onclick = () => trackAd('click', banner);
    trackAd('impression', banner);
  }
  player.play().catch(() => {});
}

function hideAds() {
  adLabel.classList.add('hidden');
  adClick.classList.add('hidden');
  skipAd.classList.add('hidden');
  skipAd.textContent = '';
  bannerAd.classList.add('hidden');
}

function chooseAd(placement) {
  const candidates = state.ads.filter((ad) => ad.placement === placement && !adCapReached(ad));
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
  if (state.mode !== 'content' || !state.current) return;
  const delta = player.currentTime - state.lastReportedTime;
  if (delta > 1) {
    track('watch', { delta, position: player.currentTime }, true);
    state.lastReportedTime = player.currentTime;
  }
}

async function shareVideo() {
  if (!state.current) return;
  track('share');
  const url = new URL(location.href);
  url.searchParams.set('episode', state.current.slug || state.current.id);
  const data = { title: state.current.title, text: state.current.description, url: url.toString() };
  if (navigator.share) await navigator.share(data).catch(() => {});
  else await navigator.clipboard.writeText(data.url).catch(() => {});
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

function trackAd(event, overrideAd = null) {
  const ad = overrideAd || state.currentAd;
  if (!ad) return;
  fetch('/api/ad-track', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ event, adId: ad.id, episodeId: state.current?.id, sessionId }),
  }).catch(() => {});
}

function getSessionId() {
  let value = localStorage.getItem(SESSION_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

function programName(id) { return state.programs.find((program) => program.id === id)?.name || id; }
function today() { return new Date().toISOString().slice(0, 10); }
function formatDuration(seconds) { const value = Number(seconds || 0); return value < 60 ? `${value}s` : `${Math.floor(value / 60)} min ${value % 60}s`; }
