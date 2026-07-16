(() => {
  const navGroup = document.querySelector('#nav .nav-group');
  if (!navGroup || navGroup.querySelector('[data-tab="live"]')) return;
  const button = document.createElement('button');
  button.className = 'nav-btn';
  button.dataset.tab = 'live';
  button.dataset.role = 'admin,editor';
  button.innerHTML = '<span>●</span>Antenne 24/24';
  const episodesButton = navGroup.querySelector('[data-tab="episodes"]');
  navGroup.insertBefore(button, episodesButton || null);
  button.addEventListener('click', () => setTimeout(renderLive, 0));

  const actions = document.querySelector('.top-actions');
  if (actions && !actions.querySelector('[href="/direct/"]')) {
    const link = document.createElement('a'); link.className = 'btn'; link.href = '/direct/'; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Voir le direct'; actions.prepend(link);
  }

  async function renderLive() {
    const title = document.querySelector('#title');
    const content = document.querySelector('#content');
    if (!content) return;
    if (title) title.textContent = 'Antenne 24/24';
    document.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item.dataset.tab === 'live'));
    content.innerHTML = '<div class="panel"><p>Chargement de la programmation…</p></div>';
    try {
      const { csrfToken, state } = await getState();
      const live = state.episodes.filter(isFullEpisode).sort((a, b) => Number(a.displayOrder) - Number(b.displayOrder));
      content.innerHTML = `<section class="live-admin-hero"><div><p class="eyebrow">CHAÎNE PERMANENTE</p><h2>La Web TV diffuse en continu.</h2><p>Activez les émissions qui doivent passer à l’antenne et placez-les dans l’ordre de diffusion. Le direct public se synchronise automatiquement.</p></div><a class="btn btn-primary" href="/direct/" target="_blank" rel="noopener">Ouvrir la chaîne</a></section><div class="panel"><div class="toolbar"><p>${live.filter(isLive).length} émission(s) actuellement à l’antenne.</p><button class="primary" data-go-episodes>Ajouter depuis Émissions</button></div><div class="live-admin-list">${live.map((episode, index) => row(episode, index)).join('') || '<p class="empty">Les émissions complètes sont en cours d’import.</p>'}</div></div>`;
      content.querySelector('[data-go-episodes]')?.addEventListener('click', () => document.querySelector('[data-tab="episodes"]')?.click());
      content.querySelectorAll('[data-live-toggle]').forEach((item) => item.addEventListener('click', async () => {
        const episode = live.find((entry) => entry.id === item.dataset.liveToggle);
        if (!episode) return;
        await apply(csrfToken, 'save_episode', payload(episode, { ...episode.metadata, fullEpisode: true, live: !isLive(episode) }));
        await renderLive();
      }));
      content.querySelectorAll('[data-live-move]').forEach((item) => item.addEventListener('click', async () => {
        const index = live.findIndex((entry) => entry.id === item.dataset.id);
        const target = item.dataset.liveMove === 'up' ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= live.length) return;
        [live[index], live[target]] = [live[target], live[index]];
        await apply(csrfToken, 'reorder_episodes', { ids: live.map((entry) => entry.id) });
        await renderLive();
      }));
    } catch (error) {
      content.innerHTML = `<div class="panel"><p>Impossible de charger l’antenne : ${escapeHtml(error.message)}</p></div>`;
    }
  }

  async function getState() {
    const authResponse = await fetch('/api/auth/status');
    if (!authResponse.ok) throw new Error('session_expired');
    const auth = await authResponse.json();
    const stateResponse = await fetch('/api/admin/state');
    if (!stateResponse.ok) throw new Error('state_unavailable');
    return { csrfToken: auth.csrfToken, state: await stateResponse.json() };
  }
  async function apply(csrfToken, action, data) {
    const response = await fetch('/api/admin/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ action, payload: data }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'operation_failed');
  }
  function row(episode, index) {
    const live = isLive(episode);
    return `<article class="live-admin-row"><img src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt=""><div><span class="tag ${live ? 'active' : 'inactive'}">${live ? 'À l’antenne' : 'Hors antenne'}</span><h3>${escapeHtml(episode.title)}</h3><p>${formatDuration(episode.durationSeconds)} · ordre ${index + 1}</p></div><div class="actions"><button data-live-move="up" data-id="${episode.id}" aria-label="Monter">↑</button><button data-live-move="down" data-id="${episode.id}" aria-label="Descendre">↓</button><button data-live-toggle="${episode.id}">${live ? 'Retirer' : 'Diffuser'}</button><a class="btn" href="/emissions/${encodeURIComponent(episode.slug)}/" target="_blank">Voir</a></div></article>`;
  }
  function payload(episode, metadata) { return { id: episode.id, programId: episode.programId, title: episode.title, slug: episode.slug, description: episode.description, videoUrl: episode.videoUrl, posterUrl: episode.posterUrl, durationSeconds: episode.durationSeconds, status: episode.status, displayOrder: episode.displayOrder, publishedAt: episode.publishedAt, scheduledAt: episode.scheduledAt, metadata }; }
  function isFullEpisode(episode) { return episode.metadata?.fullEpisode || String(episode.videoUrl || '').startsWith('/media/'); }
  function isLive(episode) { return episode.status === 'published' && episode.metadata?.live !== false; }
  function formatDuration(seconds) { const value = Number(seconds || 0); const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${Math.max(1, minutes)} min`; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
})();
