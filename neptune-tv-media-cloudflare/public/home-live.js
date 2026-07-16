import { mountLiveChannel } from './live-channel.js';

const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } }).catch(() => null);
const catalog = response?.ok ? await response.json() : { programs: [], episodes: [] };
const liveEpisodes = (catalog.episodes || []).filter((item) => item.status === 'published' && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/')));

addNavigation();
addLiveSection();

function addNavigation() {
  const nav = document.querySelector('.nav');
  if (nav && !nav.querySelector('a[href="/direct/"]')) {
    const link = document.createElement('a');
    link.href = '/direct/';
    link.className = 'nav-live';
    link.innerHTML = '<i></i> En direct';
    nav.prepend(link);
  }
  const explore = document.querySelector('.footer-col');
  if (explore && !explore.querySelector('a[href="/direct/"]')) {
    const link = document.createElement('a');
    link.href = '/direct/';
    link.textContent = 'En direct 24h/24';
    explore.prepend(link);
  }
}

function addLiveSection() {
  if (document.querySelector('#direct') || !liveEpisodes.length) return;
  const hero = document.querySelector('.hero');
  const anchor = document.querySelector('#a-voir');
  const section = document.createElement('section');
  section.id = 'direct';
  section.className = 'section home-live-section';
  section.innerHTML = `<div class="container"><div class="section-head live-home-head"><div><span class="live-badge"><i></i> EN DIRECT · 24H/24</span><h2>La Web TV Neptune est toujours à l’antenne.</h2></div><div><p>Les émissions complètes s’enchaînent automatiquement selon la programmation définie dans le Studio.</p><a class="btn btn-secondary" href="/direct/">Ouvrir la chaîne en plein écran</a></div></div><div class="live-channel live-channel-home" data-live-channel><div class="live-stage"><video data-live-video autoplay muted controls playsinline preload="metadata"></video><div class="live-overlay"><div><span data-live-program>NEPTUNE MEDIA</span><strong data-live-title>Chargement de l’antenne…</strong></div><button type="button" data-live-sound>Activer le son</button></div></div><aside class="live-guide"><div class="live-guide-head"><div><span class="eyebrow">Programme continu</span><h3>À l’antenne</h3></div><button type="button" class="btn btn-secondary" data-live-resync>Reprendre le direct</button></div><div data-live-playlist></div></aside></div></div>`;
  if (anchor) anchor.before(section); else hero?.after(section);
  mountLiveChannel(section.querySelector('[data-live-channel]'), catalog).catch(console.error);
}
