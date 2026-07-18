from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "neptune-tv-media-cloudflare"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, value: str) -> None:
    (ROOT / relative).write_text(value, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Missing render-polish anchor: {label}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    if re.search(pattern, text, flags=re.S) is None:
        if replacement.strip() in text:
            return text
        raise RuntimeError(f"Missing render-polish pattern: {label}")
    value, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Unexpected replacement count for {label}: {count}")
    return value


def patch_index() -> None:
    path = "neptune-tv-media-cloudflare/public/index.html"
    text = read(path)
    text = text.replace('data-home-structure="streaming-aida-v3" data-density="marketing"', 'data-home-structure="streaming-aida-v3" data-density="marketing" data-render-polish="v4"')
    text = text.replace('<div class="hero-meta" aria-label="Informations clés">\n          <span>Dirigeants et experts</span><span>Émission + moments forts</span><span>Plateau réel</span>\n        </div>\n', '')
    text = text.replace('<a class="btn btn-dark" href="#a-voir">', '<a class="btn btn-primary" href="#a-voir">', 1)
    text = text.replace('<button class="motion-toggle" id="heroMotionToggle" type="button" aria-pressed="false">Lancer l’aperçu</button>', '<button class="motion-toggle" id="heroMotionToggle" type="button" aria-pressed="false" hidden>Lancer l’aperçu</button>')
    old_live = '<article class="live-now-card">\n          <div class="live-now-visual"><img src="/assets/posters/studio-wide.webp" alt="Plateau Neptune Media" loading="lazy" decoding="async"><span class="live-now-badge">En direct</span></div>\n          <div class="live-now-copy"><small>Programme continu</small><h3>Neptune Media à l’antenne.</h3><p>Rejoignez la diffusion en cours ou choisissez une émission à la demande.</p></div>\n          <a class="btn btn-primary" href="/direct/">Voir le direct</a>\n        </article>'
    new_live = '<article class="live-now-card" data-home-live aria-busy="true">\n          <div class="live-now-visual"><img src="/assets/posters/studio-wide.webp" alt="Plateau Neptune Media" loading="lazy" decoding="async"><span class="live-now-badge" data-home-live-badge data-state="loading">Vérification</span></div>\n          <div class="live-now-copy"><small>Programme Neptune</small><h3 data-home-live-title>Chargement du programme…</h3><p data-home-live-copy>La disponibilité du direct est en cours de vérification.</p></div>\n          <a class="btn btn-primary" data-home-live-action href="/direct/">Ouvrir le direct</a>\n        </article>'
    text = replace_once(text, old_live, new_live, "home live state")
    text = text.replace('<button class="btn btn-secondary" type="button" data-search-reset>Effacer</button>', '<button class="btn btn-secondary" type="button" data-search-reset hidden>Effacer</button>', 1)
    text = text.replace('          <button class="media-filter" type="button" data-media-filter="Interview" aria-pressed="false">Interviews</button>\n', '')
    if 'id="mediaEmpty"' not in text:
        anchor = '      </div>\n      <div class="editorial-actions"><p>Tout le catalogue reste disponible sur la page Émissions.</p><a class="btn btn-secondary" href="/emissions/">Voir toutes les émissions</a></div>'
        replacement = '      </div>\n      <div id="mediaEmpty" class="media-empty" hidden><strong>Aucune émission trouvée.</strong><button class="btn btn-secondary" type="button" data-empty-reset>Effacer les filtres</button></div>\n      <div class="editorial-actions"><p>Tout le catalogue reste disponible sur la page Émissions.</p><a class="btn btn-secondary" href="/emissions/">Voir toutes les émissions</a></div>'
        text = replace_once(text, anchor, replacement, "home empty result")
    text = text.replace('class="btn btn-dark" data-funnel data-format=', 'class="btn btn-primary" data-funnel data-format=')
    if '<span class="watch-progress" aria-hidden="true" hidden><i></i></span>' not in text:
        text = text.replace('</h3></span></button>', '</h3></span><span class="watch-progress" aria-hidden="true" hidden><i></i></span></button>')
    write(path, text)


def patch_app() -> None:
    path = "neptune-tv-media-cloudflare/public/app.js"
    text = read(path)
    text = text.replace('      renderHero();\n      renderCatalog();\n      window.dispatchEvent', '      renderHero();\n      renderCatalog();\n      renderHomeLive();\n      window.dispatchEvent')
    text = text.replace('      bindFallbackVideos();\n      window.dispatchEvent(new CustomEvent(\'neptune:catalog-error\'));', '      setHeroLoading(false);\n      renderHomeLive(\'error\');\n      bindFallbackVideos();\n      window.dispatchEvent(new CustomEvent(\'neptune:catalog-error\'));')
    hero_block = r"  function renderHero\(\) \{.*?\n  function renderCatalog\(\) \{"
    hero_replacement = '''  function renderHero() {
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
      if (heroSource.dataset.src && canAutoPreview()) {
        state.heroPreviewTimer = window.setTimeout(() => loadHeroPreview(true), 900);
      } else {
        setHeroLoading(false);
      }
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
    const liveEpisodes = state.episodes.filter((episode) => episode.metadata?.live !== false && (episode.metadata?.fullEpisode || String(episode.videoUrl || '').startsWith('/media/')));
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

  function renderCatalog() {'''
    text = regex_once(text, hero_block, hero_replacement, "hero preview and home live")
    catalog_block = r"  function renderCatalog\(\) \{.*?\n  function bindFallbackVideos\(\) \{"
    catalog_replacement = '''  function renderCatalog() {
    const grid = qs('#dynamicCatalog');
    if (!grid || !state.episodes.length) {
      bindFallbackVideos();
      return;
    }
    grid.innerHTML = state.episodes.slice(0, 8).map((episode) => {
      const program = programName(episode.programId);
      const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
      const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : String(metadata.tags || '');
      const search = [episode.title, episode.description, program, metadata.guestName, metadata.guestCompany, tags].filter(Boolean).join(' ');
      return `
      <button class="media-card" type="button" data-episode-id="${escapeHtml(episode.id)}" data-episode-slug="${escapeHtml(episode.slug || episode.id)}" data-program="${escapeHtml(program)}" data-search="${escapeHtml(search)}" aria-label="Regarder ${escapeHtml(episode.title)}">
        <img loading="lazy" decoding="async" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt="Miniature de ${escapeHtml(episode.title)}">
        <span class="card-play" aria-hidden="true">▶</span>
        <span class="media-card-copy">
          <span class="media-card-meta"><span>${escapeHtml(program)}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span></span>
          <h3>${escapeHtml(episode.title)}</h3>
        </span>
        <span class="watch-progress" aria-hidden="true" hidden><i></i></span>
      </button>`;
    }).join('');
    qsa('[data-episode-id]', grid).forEach((button) => {
      button.addEventListener('click', () => {
        const episode = state.episodes.find((item) => item.id === button.dataset.episodeId);
        if (episode) openEpisode(episode, button);
      });
    });
  }

  function bindFallbackVideos() {'''
    text = regex_once(text, catalog_block, catalog_replacement, "searchable streaming cards")
    text = text.replace("    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;\n    if (reducedMotion || navigator.connection?.saveData || !('IntersectionObserver' in window)) return;", "    if (!canAutoPreview() || !('IntersectionObserver' in window)) return;")
    text = text.replace("    if (state.heroPreviewLoaded && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData) {", "    if (state.heroPreviewLoaded && canAutoPreview()) {")
    write(path, text)


def patch_ux() -> None:
    path = "neptune-tv-media-cloudflare/public/ux-aida.js"
    text = read(path)
    home_pattern = r"  function homeSearch\(force = false\) \{.*?\n  function emissionsSearch\(\) \{"
    home_replacement = '''  function homeSearch(force = false) {
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
      if (count) count.textContent = filtered ? `${visible} résultat${visible > 1 ? 's' : ''}` : `${visible} nouveauté${visible > 1 ? 's' : ''}`;
      if (reset) reset.hidden = !filtered;
      if (empty) empty.hidden = visible !== 0;
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

  function emissionsSearch() {'''
    text = regex_once(text, home_pattern, home_replacement, "home search")
    emissions_pattern = r"  function emissionsSearch\(\) \{.*?\n  function streamingRail\(force = false\) \{"
    emissions_replacement = '''  function emissionsSearch() {
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
      result.textContent = `${visible} résultat${visible > 1 ? 's' : ''}`;
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

  function streamingRail(force = false) {'''
    text = regex_once(text, emissions_pattern, emissions_replacement, "emissions search")
    old_rail_guard = "    if (!shell || !rail || (shell.dataset.railBound && !force)) return;\n    shell.dataset.railBound = '1';"
    new_rail_guard = "    if (!shell || !rail) return;\n    if (shell.dataset.railBound) {\n      if (force) updateRailButtons();\n      return;\n    }\n    shell.dataset.railBound = '1';"
    text = replace_once(text, old_rail_guard, new_rail_guard, "rail listener guard")
    text = text.replace("    if (!root || !video || root.dataset.uxEnhanced) return;", "    if (!root || !video || root.dataset.uxEnhanced || root.dataset.liveAvailable === 'false') return;", 1)
    mobile_pattern = r"  function closeMobileNavigation\(\) \{.*?\n  function readProgress\(\)"
    mobile_replacement = '''  function closeMobileNavigation() {
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

  function readProgress()'''
    text = regex_once(text, mobile_pattern, mobile_replacement, "mobile navigation closure")
    write(path, text)


def patch_public_layout() -> None:
    path = "neptune-tv-media-cloudflare/src/public-layout.js"
    text = read(path)
    pattern = r"export function episodeCard\(origin, catalog, episode\) \{.*?\n\}\n\nexport function bookingUrl"
    replacement = '''export function episodeCard(origin, catalog, episode) {
  const program = catalog.programs.find((item) => item.id === episode.programId);
  const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : String(metadata.tags || '');
  const searchText = [episode.title, episode.description, program?.name, metadata.guestName, metadata.guestCompany, tags].filter(Boolean).join(' ');
  return `<article class="seo-card" data-episode-slug="${escapeHtml(episode.slug)}" data-program="${escapeHtml(program?.name || 'Neptune Media')}" data-search="${escapeHtml(searchText)}"><a href="/emissions/${encodeURIComponent(episode.slug)}/" aria-label="Regarder ${escapeHtml(episode.title)}"><div class="seo-card-media"><img loading="lazy" decoding="async" src="${escapeHtml(absolute(origin, episode.posterUrl))}" alt="${escapeHtml(episode.title)}"><span class="card-play" aria-hidden="true">▶</span><span class="watch-progress" aria-hidden="true" hidden><i></i></span></div><div class="seo-card-copy"><span>${escapeHtml(program?.name || 'Neptune Media')} · ${formatDuration(episode.durationSeconds)}</span><h2>${escapeHtml(episode.title)}</h2><strong>Regarder →</strong></div></a></article>`;
}

export function bookingUrl'''
    text = regex_once(text, pattern, replacement, "public searchable cards")
    write(path, text)


def patch_public_render() -> None:
    path = "neptune-tv-media-cloudflare/src/public-render.js"
    text = read(path)
    pattern = r"export function renderDirect\(origin, catalog\) \{.*?\n\}\n\nexport function renderEmissions"
    replacement = '''export function renderDirect(origin, catalog) {
  const live = publishedEpisodes(catalog).filter((item) => item.metadata?.live !== false && (item.metadata?.fullEpisode || item.videoUrl?.startsWith('/media/')));
  const available = live.length > 0;
  const description = available
    ? 'Regardez Neptune Media en direct et choisissez à tout moment une émission à la demande.'
    : 'La programmation Neptune Media est en cours de préparation.';
  const commonHead = `<nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><span>Direct</span></nav>`;
  const body = available
    ? `<main id="main-content" class="seo-main live-page" tabindex="-1">
      ${commonHead}
      <section class="seo-hero live-page-hero"><span class="live-badge"><i></i> EN DIRECT</span><h1>Neptune Media, à l’antenne.</h1><p>Rejoignez la diffusion en cours ou choisissez une émission du programme.</p></section>
      <section class="live-channel" data-live-channel data-live-available="true">
        <div class="live-program-status" aria-live="polite"><div><small>Maintenant</small><strong data-live-now>Connexion à l’antenne…</strong></div><div><small>Ensuite</small><strong data-live-next>Calcul du programme…</strong></div></div>
        <div class="live-stage"><video data-live-video autoplay muted controls playsinline preload="metadata" aria-label="Lecteur du direct Neptune Media"></video><div class="live-overlay"><div><span data-live-program>NEPTUNE MEDIA</span><strong data-live-title>Chargement de l’antenne…</strong></div><button type="button" data-live-sound>Activer le son</button></div></div>
        <aside class="live-guide"><div class="live-guide-head"><div><span class="eyebrow">Programme</span><h2>À l’antenne</h2></div><button type="button" class="btn btn-secondary" data-live-resync>Reprendre le direct</button></div><div data-live-playlist></div></aside>
      </section>
      <section class="related"><span class="eyebrow">À la demande</span><h2>Choisir une émission</h2><div class="seo-grid">${cards(origin, catalog, live)}</div></section>
    </main><script type="module" src="/live-channel.js?v=2"></script>`
    : `<main id="main-content" class="seo-main live-page" tabindex="-1">
      ${commonHead}
      <section class="seo-hero live-page-hero"><span class="live-badge is-offline">PROGRAMMATION EN PRÉPARATION</span><h1>Les prochaines émissions arrivent.</h1><p>Le Studio Neptune prépare la prochaine programmation.</p></section>
      <section class="live-empty-panel" data-live-channel data-live-available="false">
        <div class="live-program-status" aria-live="polite"><div><small>Maintenant</small><strong data-live-now>Aucune émission en cours</strong></div><div><small>Ensuite</small><strong data-live-next>Programmation à venir</strong></div></div>
        <div class="empty-state"><h2>Regardez déjà les émissions disponibles.</h2><p>Le catalogue reste accessible pendant la préparation du prochain direct.</p><a class="btn btn-primary" href="/emissions/">Voir les émissions</a></div>
      </section>
    </main>`;
  return layout({
    origin,
    title: available ? 'Neptune Media en direct — Web TV business' : 'Programmation Neptune Media',
    description,
    canonical: `${origin}/direct/`,
    structuredData: [{ '@context': 'https://schema.org', '@type': 'BroadcastService', name: 'Neptune Media — Direct', description, url: `${origin}/direct/` }],
    body
  });
}

export function renderEmissions'''
    text = regex_once(text, pattern, replacement, "direct empty and live states")
    write(path, text)


def patch_css() -> None:
    path = "neptune-tv-media-cloudflare/public/styles/neptune-streaming.css"
    text = read(path)
    marker = "/* Render polish v4: detail-level hierarchy, state and interaction corrections. */"
    if marker not in text:
        text += '''

/* Render polish v4: detail-level hierarchy, state and interaction corrections. */
[data-home-structure="streaming-aida-v3"] .hero-media { aspect-ratio: 16 / 9; }
[data-home-structure="streaming-aida-v3"] .hero-actions .btn-primary { box-shadow: 0 12px 30px rgba(32,169,255,.22); }
[data-loading="true"]::after { animation:none; transform:none; background:linear-gradient(180deg,rgba(0,0,0,.02) 50%,rgba(1,4,12,.67) 100%); }
[data-loading="true"]::before { content:""; position:absolute; z-index:2; inset:0; pointer-events:none; transform:translateX(-100%); background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent); animation:neptuneSkeleton 1.2s linear infinite; }
.live-now-badge[data-state="loading"]::before { background:var(--neptune-warning); box-shadow:0 0 12px rgba(255,180,84,.55); }
.live-now-badge[data-state="offline"]::before { background:#8190a8; box-shadow:none; }
.live-now-badge[data-state="error"]::before { background:var(--neptune-danger); box-shadow:0 0 12px rgba(255,94,115,.55); }
.media-discovery { position:static; display:grid; gap:10px; }
.media-search { min-width:0; }
.media-empty { margin-top:16px; padding:18px; display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--neptune-line); border-radius:var(--neptune-radius-md); background:var(--neptune-surface); }
.media-empty-inline { margin:0; color:var(--neptune-muted); }
#dynamicCatalog.video-grid { padding:8px 4px 20px; }
#dynamicCatalog .media-card .watch-progress { left:0; right:0; bottom:0; height:4px; border-radius:0; }
body[data-public-ux="streaming-v3"] .seo-card .watch-progress { left:14px; right:14px; bottom:8px; height:3px; border-radius:99px; }
.hook-scene summary,.compact-details summary,.transcript summary { min-height:44px; display:inline-flex; align-items:center; }
.footer-col a { min-height:32px; display:flex; align-items:center; }
.breadcrumbs a { min-height:32px; display:inline-flex; align-items:center; }
.program-pills a { min-height:44px; }
body[data-public-ux="streaming-v3"] .seo-hero { max-width:880px; padding:32px 0 40px; }
body[data-public-ux="streaming-v3"] .seo-hero h1,
body[data-public-ux="streaming-v3"] .info-page h1,
body[data-public-ux="streaming-v3"] .episode-copy h1 { font-size:clamp(2.7rem,5.4vw,4.8rem); line-height:.95; }
.format-card { min-height:520px; }
.live-overlay { bottom:48px; padding:42px 24px 14px; }
.live-empty-panel { display:grid; gap:16px; }
.live-empty-panel .empty-state { background:var(--neptune-surface); }
.live-badge.is-offline { color:#c8d2e2; }
@media (min-width:900px) {
  .media-discovery { position:sticky; top:82px; grid-template-columns:minmax(280px,.8fr) minmax(0,1.2fr) auto; align-items:center; padding:8px; }
  .media-discovery .media-results { justify-self:end; white-space:nowrap; }
}
@media (min-width:941px) and (max-width:1080px) {
  [data-home-structure="streaming-aida-v3"] .hero-grid { grid-template-columns:minmax(0,4fr) minmax(380px,6fr); }
}
@media (max-width:760px) {
  [data-home-structure="streaming-aida-v3"] .hero-media { aspect-ratio:16 / 9; }
  .format-card { min-height:440px; }
  .media-empty { align-items:stretch; flex-direction:column; }
  .media-empty .btn { width:100%; }
  .live-overlay { bottom:46px; padding:32px 16px 12px; }
}
'''
    write(path, text)


def main() -> None:
    patch_index()
    patch_app()
    patch_ux()
    patch_public_layout()
    patch_public_render()
    patch_css()
    print("Applied detailed Neptune render polish v4")


if __name__ == "__main__":
    main()
