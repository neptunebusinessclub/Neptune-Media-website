const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } }).catch(() => null);
const catalog = response?.ok ? await response.json() : { episodes: [] };
const card = document.querySelector('[data-home-live]');

if (card) {
  const badge = card.querySelector('[data-home-live-badge]');
  const title = card.querySelector('[data-home-live-title]');
  const copy = card.querySelector('[data-home-live-copy]');
  const action = card.querySelector('[data-home-live-action]');
  const liveEpisodes = (catalog.episodes || []).filter((item) => {
    const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
    const duration = Number(item.durationSeconds || 0);
    const isShort = metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
    return !isShort && item.status === 'published' && metadata.live !== false && (metadata.fullEpisode || String(item.videoUrl || '').startsWith('/media/'));
  });
  card.setAttribute('aria-busy', 'false');
  if (liveEpisodes.length) {
    if (badge) badge.textContent = 'En direct';
    if (title) title.textContent = 'Neptune Media est à l’antenne.';
    if (copy) copy.textContent = 'Regardez la diffusion en cours ou choisissez une émission complète.';
    if (action) { action.href = '/direct/'; action.textContent = 'Voir le direct'; }
  } else {
    if (badge) badge.textContent = 'À la demande';
    if (title) title.textContent = 'Les émissions restent disponibles immédiatement.';
    if (copy) copy.textContent = 'Choisissez une histoire, une expertise ou un format à regarder maintenant.';
    if (action) { action.href = '/emissions/'; action.textContent = 'Voir les émissions'; }
  }
}
