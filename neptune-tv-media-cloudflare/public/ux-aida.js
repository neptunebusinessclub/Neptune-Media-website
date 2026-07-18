(() => {
  'use strict';

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const WATCH_KEY = 'neptune_watch_progress_v2';
  let currentEpisode = null;

  activeNavigation();
  homeSearch();
  emissionsSearch();
  watchProgress();
  streamingRail();
  directStatus();
  clarifyBookingLinks();
  closeMobileNavigation();
  renderProgressBars();

  window.addEventListener('neptune:catalog-ready', () => {
    homeSearch(true);
    renderContinue();
    streamingRail(true);
    renderProgressBars();
  });

  function activeNavigation() {
    const path = cleanPath(location.pathname);
    const links = qa('.nav a, .seo-nav a');
    links.forEach((link) => {
      const url = new URL(link.href, location.href);
      const target = cleanPath(url.pathname);
      if (url.origin === location.origin && target !== '/' && path.startsWith(target)) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
    if (path !== '/' || !('IntersectionObserver' in window)) return;
    const anchors = links.filter((link) => link.hash && q(link.hash));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      anchors.forEach((link) => {
        const selected = link.hash === `#${visible.target.id}`;
        link.classList.toggle('is-active', selected);
        if (selected) link.setAttribute('aria-current', 'location');
        else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, .25] });
    anchors.forEach((link) => observer.observe(q(link.hash)));
  }

  function homeSearch(force = false) {
    const form = q('[data-media-search]');
    const grid = q('#dynamicCatalog');
    if (!form || !grid) return;
    if (form.dataset.bound) {
      if (force) form.dispatchEvent(new CustomEvent('neptune:search-refresh'));
      return;
    }
    form.dataset.bound = '1';
    const input = q('input[type="search"]', form);
    const count = q('#mediaResultsCount');
    const filters = qa('[data-media-filter]');
    const reset = q('[data-search-reset]', form);
    const empty = q('#mediaEmpty');
    let selected = filters.find((item) => item.getAttribute('aria-pressed') === 'true')?.dataset.mediaFilter || 'all';

    const apply = () => {
      const needle = normal(input?.value);
      let visible = 0;
      qa('.media-card', grid).forEach((card) => {
        const text = normal(card.dataset.search || card.textContent);
        const program = normal(card.dataset.program || card.textContent);
        const show = (!needle || text.includes(needle)) && (selected === 'all' || program.includes(normal(selected)));
        card.hidden = !show;
        if (show) visible += 1;
      });
      const filtered = Boolean(needle) || selected !== 'all';
      if (count) count.textContent = filtered ? `${visible} résultat${visible !== 1 ? 's' : ''}` : `${visible} nouveauté${visible !== 1 ? 's' : ''}`;
      if (reset) reset.hidden = !filtered;
      if (empty) empty.hidden = visible !== 0;
      const railShell = q('[data-content-rail]');
      if (railShell) railShell.hidden = visible === 0;
      grid.scrollTo({ left: 0, behavior: motionBehavior() });
      updateRailButtons();
    };
    const resetAll = () => {
      if (input) input.value = '';
      selected = 'all';
      filters.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.mediaFilter === 'all')));
      apply();
      input?.focus();
    };

    input?.addEventListener('input', apply);
    form.addEventListener('submit', (event) => { event.preventDefault(); apply(); });
    form.addEventListener('neptune:search-refresh', apply);
    reset?.addEventListener('click', resetAll);
    q('[data-empty-reset]')?.addEventListener('click', resetAll);
    filters.forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.mediaFilter || 'all';
      filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      apply();
    }));
    apply();
    renderContinue();
  }

  function emissionsSearch() {
    if (!cleanPath(location.pathname).startsWith('/emissions')) return;
    const grid = q('.seo-grid');
    if (!grid || grid.dataset.searchEnhanced) return;
    grid.dataset.searchEnhanced = '1';
    const panel = document.createElement('div');
    panel.className = 'seo-search-panel';
    panel.innerHTML = '<label><span class="sr-only">Rechercher une émission</span><input type="search" placeholder="Invité, entreprise ou sujet" autocomplete="off"></label><div class="media-filter-row"><button class="media-filter" type="button" data-filter="all" aria-pressed="true">Tout</button><button class="media-filter" type="button" data-filter="hors norme" aria-pressed="false">Hors Norme</button><button class="media-filter" type="button" data-filter="concept libre" aria-pressed="false">Concept Libre</button></div><button class="btn btn-secondary" type="button" data-emissions-reset hidden>Effacer</button><p class="media-results" aria-live="polite"></p><p class="media-empty-inline" hidden>Aucune émission ne correspond à cette recherche.</p>';
    grid.before(panel);
    const input = q('input', panel);
    const result = q('.media-results', panel);
    const empty = q('.media-empty-inline', panel);
    const reset = q('[data-emissions-reset]', panel);
    const filters = qa('[data-filter]', panel);
    let selected = 'all';
    const apply = () => {
      const needle = normal(input.value);
      let visible = 0;
      qa('.seo-card', grid).forEach((card) => {
        const text = normal(card.dataset.search || card.textContent);
        const program = normal(card.dataset.program || card.textContent);
        const show = (!needle || text.includes(needle)) && (selected === 'all' || program.includes(selected));
        card.hidden = !show;
        if (show) visible += 1;
      });
      const filtered = Boolean(needle) || selected !== 'all';
      result.textContent = `${visible} résultat${visible !== 1 ? 's' : ''}`;
      reset.hidden = !filtered;
      empty.hidden = visible !== 0;
    };
    const resetAll = () => {
      input.value = '';
      selected = 'all';
      filters.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.filter === 'all')));
      apply();
      input.focus();
    };
    input.addEventListener('input', apply);
    reset.addEventListener('click', resetAll);
    filters.forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.filter;
      filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      apply();
    }));
    apply();
  }

  function streamingRail(force = false) {
    const shell = q('[data-content-rail]');
    const rail = q('#dynamicCatalog');
    if (!shell || !rail) return;
    if (shell.dataset.railBound) {
      if (force) updateRailButtons();
      return;
    }
    shell.dataset.railBound = '1';
    const previous = q('[data-rail-prev]', shell);
    const next = q('[data-rail-next]', shell);
    const amount = () => {
      const card = qa('.media-card:not([hidden])', rail)[0];
      return card ? card.getBoundingClientRect().width + 16 : Math.max(280, rail.clientWidth * .8);
    };
    previous?.addEventListener('click', () => rail.scrollBy({ left: -amount(), behavior: motionBehavior() }));
    next?.addEventListener('click', () => rail.scrollBy({ left: amount(), behavior: motionBehavior() }));
    rail.addEventListener('scroll', updateRailButtons, { passive: true });
    window.addEventListener('resize', updateRailButtons);
    updateRailButtons();
  }

  function updateRailButtons() {
    const shell = q('[data-content-rail]');
    const rail = q('#dynamicCatalog');
    if (!shell || !rail) return;
    const previous = q('[data-rail-prev]', shell);
    const next = q('[data-rail-next]', shell);
    if (previous) previous.disabled = rail.scrollLeft <= 4;
    if (next) next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  }

  function watchProgress() {
    const modal = q('[data-video-modal]');
    const player = modal ? q('video', modal) : null;
    if (modal && player) {
      const frame = q('.modal-frame', modal);
      const prompt = resumePrompt(frame);
      const ident = document.createElement('div');
      ident.className = 'neptune-ident';
      ident.textContent = 'Neptune Media · À l’antenne';
      frame?.append(ident);
      window.addEventListener('neptune:episode-opened', (event) => {
        currentEpisode = event.detail?.episode || null;
        prompt.hidden = true;
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          ident.classList.remove('is-visible');
          requestAnimationFrame(() => ident.classList.add('is-visible'));
        }
      });
      player.addEventListener('loadedmetadata', () => {
        if (currentEpisode && sameMedia(player.currentSrc, currentEpisode.videoUrl)) offerResume(prompt, player, episodeKey(currentEpisode));
      });
      let lastSave = 0;
      player.addEventListener('timeupdate', () => {
        if (!currentEpisode || !sameMedia(player.currentSrc, currentEpisode.videoUrl) || Date.now() - lastSave < 2500) return;
        lastSave = Date.now();
        saveProgress(episodeKey(currentEpisode), {
          id: currentEpisode.id || '', slug: currentEpisode.slug || '', title: currentEpisode.title || 'Émission Neptune Media',
          poster: currentEpisode.posterUrl || '', position: player.currentTime, duration: player.duration, updatedAt: Date.now(),
        });
      });
      player.addEventListener('ended', () => currentEpisode && clearProgress(episodeKey(currentEpisode)));
    }

    const episodePlayer = q('.episode-player video');
    if (!episodePlayer) return;
    const key = decodeURIComponent(cleanPath(location.pathname).split('/').filter(Boolean).pop() || 'episode');
    const prompt = resumePrompt(q('.episode-player'));
    episodePlayer.addEventListener('loadedmetadata', () => offerResume(prompt, episodePlayer, key));
    let lastSave = 0;
    episodePlayer.addEventListener('timeupdate', () => {
      if (Date.now() - lastSave < 2500) return;
      lastSave = Date.now();
      saveProgress(key, { slug: key, title: q('.episode-copy h1')?.textContent || document.title, poster: episodePlayer.poster || '', position: episodePlayer.currentTime, duration: episodePlayer.duration, updatedAt: Date.now() });
    });
    episodePlayer.addEventListener('ended', () => clearProgress(key));
  }

  function resumePrompt(container) {
    const prompt = document.createElement('div');
    prompt.className = 'resume-prompt';
    prompt.hidden = true;
    prompt.innerHTML = '<span></span><button type="button">Reprendre</button>';
    container?.append(prompt);
    return prompt;
  }

  function offerResume(prompt, player, key) {
    const saved = readProgress()[key];
    if (!saved || saved.position < 8 || saved.position > player.duration - 8) { prompt.hidden = true; return; }
    q('span', prompt).textContent = `Reprendre à ${formatTime(saved.position)} ?`;
    q('button', prompt).onclick = () => {
      player.currentTime = Math.min(saved.position, player.duration - 2);
      player.play().catch(() => {});
      prompt.hidden = true;
    };
    prompt.hidden = false;
  }

  function renderContinue() {
    const card = q('#continueWatching');
    if (!card) return;
    const item = Object.values(readProgress()).filter((entry) => entry?.position > 8 && entry?.duration > entry.position + 8).sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (!item) { card.hidden = true; return; }
    q('img', card).src = item.poster || '/assets/posters/default.svg';
    q('[data-continue-title]', card).textContent = item.title;
    q('[data-continue-time]', card).textContent = `Reprendre à ${formatTime(item.position)}`;
    q('[data-continue-open]', card).onclick = () => {
      const target = item.id ? q(`[data-episode-id="${escapeCss(item.id)}"]`) : null;
      if (target) target.click();
      else if (item.slug) location.href = `/emissions/${encodeURIComponent(item.slug)}/`;
    };
    card.hidden = false;
  }

  function renderProgressBars() {
    const progress = readProgress();
    qa('.media-card[data-episode-id]').forEach((card) => {
      const item = progress[card.dataset.episodeSlug] || progress[card.dataset.episodeId];
      setProgress(card, item);
    });
    qa('.seo-card[data-episode-slug]').forEach((card) => setProgress(card, progress[card.dataset.episodeSlug]));
  }

  function setProgress(card, item) {
    const bar = q('.watch-progress', card);
    if (!bar) return;
    const percent = item?.duration > 0 ? Math.min(100, Math.max(0, (item.position / item.duration) * 100)) : 0;
    bar.style.setProperty('--watch-progress', `${percent}%`);
    bar.hidden = percent < 1 || percent > 98;
  }

  function directStatus() {
    const root = q('[data-live-channel]');
    const video = root ? q('[data-live-video]', root) : null;
    if (!root || !video || root.dataset.uxEnhanced || root.dataset.liveAvailable === 'false') return;
    root.dataset.uxEnhanced = '1';
    const status = document.createElement('div');
    status.className = 'live-ux-status';
    status.dataset.mode = 'live';
    status.innerHTML = '<strong class="live-ux-mode">En direct</strong><span class="live-ux-message" role="status">Connexion à l’antenne…</span><span class="live-ux-next"></span>';
    const error = document.createElement('div');
    error.className = 'live-ux-error';
    error.hidden = true;
    error.innerHTML = 'Le direct ne peut pas être chargé. <button type="button">Réessayer</button> <a href="/emissions/">Voir les émissions</a>';
    q('.live-program-status', root)?.after(status, error);
    const message = q('.live-ux-message', status);
    const mode = q('.live-ux-mode', status);
    const next = q('.live-ux-next', status);
    const setMode = (value) => {
      status.dataset.mode = value;
      mode.textContent = value === 'live' ? 'En direct' : 'À la demande';
    };
    root.addEventListener('neptune:live-status', (event) => {
      const detail = event.detail || {};
      setMode(detail.mode === 'live' ? 'live' : 'replay');
      error.hidden = true;
      message.textContent = detail.remaining > 0 ? `${detail.program} · ${formatTime(detail.remaining)} restantes` : detail.program || 'Lecture en cours';
      next.textContent = detail.nextTitle ? `Ensuite : ${detail.nextTitle}` : '';
    });
    root.addEventListener('neptune:live-error', () => {
      error.hidden = false;
      message.textContent = 'Lecture interrompue';
    });
    video.addEventListener('waiting', () => { message.textContent = 'Mise en mémoire tampon…'; });
    video.addEventListener('playing', () => { error.hidden = true; });
    q('button', error)?.addEventListener('click', () => { error.hidden = true; location.reload(); });
    q('[data-live-resync]', root)?.addEventListener('click', () => setMode('live'));
    window.addEventListener('offline', () => { error.hidden = false; message.textContent = 'Connexion internet perdue'; });
  }

  function clarifyBookingLinks() {
    qa('[data-funnel]').forEach((link) => {
      link.title = 'Ouvre l’espace officiel Neptune Media avec les tarifs, conditions et créneaux';
      if (!link.textContent.trim()) link.textContent = 'Voir les créneaux';
    });
  }

  function closeMobileNavigation() {
    const menus = qa('.public-mobile-menu');
    menus.forEach((menu) => {
      const summary = q('summary', menu);
      qa('a', menu).forEach((link) => link.addEventListener('click', () => menu.removeAttribute('open')));
      menu.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !menu.open) return;
        event.preventDefault();
        menu.removeAttribute('open');
        summary?.focus();
      });
    });
    document.addEventListener('pointerdown', (event) => menus.forEach((menu) => {
      if (menu.open && !menu.contains(event.target)) menu.removeAttribute('open');
    }));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) menus.forEach((menu) => menu.removeAttribute('open'));
    });
  }

  function readProgress() { try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '{}'); } catch { return {}; } }
  function saveProgress(key, value) { if (!key || !Number.isFinite(value.position) || !Number.isFinite(value.duration)) return; const data = readProgress(); data[key] = value; localStorage.setItem(WATCH_KEY, JSON.stringify(data)); renderContinue(); renderProgressBars(); }
  function clearProgress(key) { const data = readProgress(); delete data[key]; localStorage.setItem(WATCH_KEY, JSON.stringify(data)); renderContinue(); renderProgressBars(); }
  function episodeKey(episode) { return String(episode?.slug || episode?.id || ''); }
  function sameMedia(a, b) { try { return new URL(a, location.href).pathname === new URL(b, location.href).pathname; } catch { return false; } }
  function normal(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function cleanPath(value) { const path = String(value || '/').replace(/\/+$/, ''); return path || '/'; }
  function formatTime(value) { const seconds = Math.max(0, Math.floor(Number(value || 0))); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
  function escapeCss(value) { return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, '\\$&'); }
  function motionBehavior() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; }
})();
