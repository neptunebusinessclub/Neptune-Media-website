from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding="utf-8")


def replace(text: str, old: str, new: str) -> str:
    return text.replace(old, new)


def regex(text: str, pattern: str, replacement: str, label: str) -> str:
    value, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count == 0 and replacement.strip() not in text:
        raise RuntimeError(f"Missing media-v7 anchor: {label}")
    return value if count else text


def patch_index() -> None:
    path = "neptune-tv-media-cloudflare/public/index.html"
    text = read(path)
    text = text.replace('data-density="marketing"', 'data-density="marketing" data-render-media="v7"', 1) if 'data-render-media="v7"' not in text else text
    text = text.replace('/assets/posters/hors-norme-wide.webp', '/assets/posters/format-canape-sombre.svg')
    text = text.replace('/assets/posters/concept-libre-wide.webp', '/assets/posters/format-plateau-clair.svg')
    text = text.replace('<h3>Nouveautés</h3>', '<h3>Émissions</h3>', 1)
    text = text.replace('<div class="video-grid" id="dynamicCatalog" aria-busy="true">', '<div class="video-grid" id="dynamicCatalog" data-rail-track data-media-kind="episode" aria-busy="true">', 1)
    text = text.replace('/styles/neptune-streaming.css">', '/styles/neptune-streaming.css?v=7">')
    write(path, text)


def patch_app() -> None:
    path = "neptune-tv-media-cloudflare/public/app.js"
    text = read(path)
    render = r"  function renderCatalog\(\) \{.*?\n  function bindFallbackVideos\(\) \{"
    replacement = '''  function renderCatalog() {
    const fullGrid = qs('#dynamicCatalog');
    if (!fullGrid || !state.episodes.length) {
      bindFallbackVideos();
      return;
    }
    const fullShell = fullGrid.closest('[data-content-rail]');
    const shortsShell = ensureShortsRail(fullShell);
    const shortsGrid = qs('#shortsCatalog');
    const fullEpisodes = state.episodes.filter((episode) => !isShortEpisode(episode)).slice(0, 8);
    const shorts = state.episodes.filter(isShortEpisode).slice(0, 12);

    fullGrid.dataset.railTrack = '';
    fullGrid.dataset.mediaKind = 'episode';
    fullShell?.setAttribute('data-media-kind', 'episode');
    const fullTitle = qs('.content-rail-head h3', fullShell || document);
    if (fullTitle) fullTitle.textContent = 'Émissions';

    renderMediaRail(fullGrid, fullEpisodes, 'episode');
    if (shortsGrid) renderMediaRail(shortsGrid, shorts, 'short');
    if (fullShell) fullShell.hidden = fullEpisodes.length === 0;
    if (shortsShell) shortsShell.hidden = shorts.length === 0;
  }

  function ensureShortsRail(afterShell) {
    let shell = qs('[data-content-rail][data-media-kind="short"]');
    if (shell) return shell;
    shell = document.createElement('div');
    shell.className = 'content-rail-shell shorts-rail-shell';
    shell.dataset.contentRail = '';
    shell.dataset.mediaKind = 'short';
    shell.innerHTML = `<div class="content-rail-head"><h3>Shorts</h3><div class="content-rail-controls" aria-label="Faire défiler les shorts"><button class="rail-control" type="button" data-rail-prev aria-label="Shorts précédents">←</button><button class="rail-control" type="button" data-rail-next aria-label="Shorts suivants">→</button></div></div><div class="video-grid shorts-grid" id="shortsCatalog" data-rail-track data-media-kind="short" aria-live="polite"></div>`;
    afterShell?.after(shell);
    return shell;
  }

  function renderMediaRail(grid, episodes, kind) {
    grid.innerHTML = episodes.map((episode) => mediaCardMarkup(episode, kind)).join('');
    qsa('[data-episode-id]', grid).forEach((button) => {
      button.addEventListener('click', () => {
        const episode = state.episodes.find((item) => item.id === button.dataset.episodeId);
        if (episode) openEpisode(episode, button);
      });
    });
  }

  function mediaCardMarkup(episode, kind) {
    const program = programName(episode.programId);
    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : String(metadata.tags || '');
    const search = [episode.title, episode.description, program, metadata.guestName, metadata.guestCompany, tags].filter(Boolean).join(' ');
    const className = kind === 'short' ? 'media-card media-card--short' : 'media-card media-card--episode';
    return `<button class="${className}" type="button" data-media-item data-media-kind="${kind}" data-episode-id="${escapeHtml(episode.id)}" data-episode-slug="${escapeHtml(episode.slug || episode.id)}" data-program="${escapeHtml(program)}" data-search="${escapeHtml(search)}" aria-label="Regarder ${escapeHtml(episode.title)}">
      <img loading="lazy" decoding="async" src="${escapeHtml(episode.posterUrl || '/assets/posters/default.svg')}" alt="Miniature de ${escapeHtml(episode.title)}">
      <span class="card-play" aria-hidden="true">▶</span>
      <span class="media-card-copy"><span class="media-card-meta"><span>${escapeHtml(program)}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span></span><h3>${escapeHtml(episode.title)}</h3></span>
      <span class="watch-progress" aria-hidden="true" hidden><i></i></span>
    </button>`;
  }

  function isShortEpisode(episode) {
    const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
    const duration = Number(episode?.durationSeconds || 0);
    return metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
  }

  function bindFallbackVideos() {'''
    text = regex(text, render, replacement, "split episodes and shorts")

    faq = r"  function bindFaq\(\) \{.*?\n  function bindModal\(\) \{"
    faq_replacement = '''  function bindFaq() {
    if (document.documentElement.dataset.faqBound === '1') return;
    document.documentElement.dataset.faqBound = '1';
    const close = (item) => {
      const button = qs(':scope > button', item);
      const answer = qs('.faq-answer', item);
      item.classList.remove('is-open');
      if (button) {
        button.setAttribute('aria-expanded', 'false');
        const icon = button.lastElementChild;
        if (icon) icon.textContent = '+';
      }
      if (answer) answer.hidden = true;
    };
    qsa('[data-faq]').forEach(close);
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      const item = button?.closest('[data-faq]');
      if (!button || !item || button.parentElement !== item) return;
      const answer = qs('.faq-answer', item);
      if (!answer) return;
      const open = !item.classList.contains('is-open');
      qsa('[data-faq].is-open').forEach((other) => { if (other !== item) close(other); });
      if (!open) return close(item);
      item.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      const icon = button.lastElementChild;
      if (icon) icon.textContent = '−';
      answer.hidden = false;
    });
  }

  function bindModal() {'''
    text = regex(text, faq, faq_replacement, "delegated FAQ")
    write(path, text)


def patch_ux() -> None:
    path = "neptune-tv-media-cloudflare/public/ux-aida.js"
    text = read(path)
    home = r"  function homeSearch\(force = false\) \{.*?\n  function emissionsSearch\(\) \{"
    home_replacement = '''  function homeSearch(force = false) {
    const form = q('[data-media-search]');
    if (!form) return;
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
      const items = qa('[data-media-item]');
      if (!items.length) return;
      const needle = normal(input?.value);
      let visible = 0;
      items.forEach((card) => {
        const textValue = normal(card.dataset.search || card.textContent);
        const program = normal(card.dataset.program || card.textContent);
        const show = (!needle || textValue.includes(needle)) && (selected === 'all' || program.includes(normal(selected)));
        card.hidden = !show;
        if (show) visible += 1;
      });
      const filtered = Boolean(needle) || selected !== 'all';
      if (count) count.textContent = filtered ? `${visible} résultat${visible !== 1 ? 's' : ''}` : `${visible} contenu${visible !== 1 ? 's' : ''}`;
      if (reset) reset.hidden = !filtered;
      if (empty) empty.hidden = visible !== 0;
      qa('[data-content-rail]').forEach((shell) => {
        const shellVisible = qa('[data-media-item]:not([hidden])', shell).length;
        shell.hidden = shellVisible === 0;
        updateRailButtons(shell);
      });
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
    text = regex(text, home, home_replacement, "home search across rails")

    emissions = r"  function emissionsSearch\(\) \{.*?\n  function streamingRail\(force = false\) \{"
    emissions_replacement = '''  function emissionsSearch() {
    if (!cleanPath(location.pathname).startsWith('/emissions')) return;
    const cards = qa('.catalog-section .seo-card');
    if (!cards.length || document.body.dataset.emissionsSearchEnhanced) return;
    document.body.dataset.emissionsSearchEnhanced = '1';
    const firstSection = q('.catalog-section');
    const panel = document.createElement('div');
    panel.className = 'seo-search-panel';
    panel.innerHTML = '<label><span class="sr-only">Rechercher une émission</span><input type="search" placeholder="Invité, entreprise ou sujet" autocomplete="off"></label><div class="media-filter-row"><button class="media-filter" type="button" data-filter="all" aria-pressed="true">Tout</button><button class="media-filter" type="button" data-filter="hors norme" aria-pressed="false">Hors Norme</button><button class="media-filter" type="button" data-filter="concept libre" aria-pressed="false">Concept Libre</button></div><button class="btn btn-secondary" type="button" data-emissions-reset hidden>Effacer</button><p class="media-results" aria-live="polite"></p><p class="media-empty-inline" hidden>Aucun contenu ne correspond à cette recherche.</p>';
    firstSection?.before(panel);
    const input = q('input', panel);
    const result = q('.media-results', panel);
    const empty = q('.media-empty-inline', panel);
    const reset = q('[data-emissions-reset]', panel);
    const filters = qa('[data-filter]', panel);
    let selected = 'all';
    const apply = () => {
      const needle = normal(input.value);
      let visible = 0;
      cards.forEach((card) => {
        const textValue = normal(card.dataset.search || card.textContent);
        const program = normal(card.dataset.program || card.textContent);
        const show = (!needle || textValue.includes(needle)) && (selected === 'all' || program.includes(selected));
        card.hidden = !show;
        if (show) visible += 1;
      });
      qa('.catalog-section').forEach((section) => { section.hidden = qa('.seo-card:not([hidden])', section).length === 0; });
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

  function streamingRail(force = false) {'''
    text = regex(text, emissions, emissions_replacement, "split catalogue search")

    rail = r"  function streamingRail\(force = false\) \{.*?\n  function watchProgress\(\) \{"
    rail_replacement = '''  function streamingRail(force = false) {
    const shells = qa('[data-content-rail]');
    if (!shells.length) return;
    shells.forEach((shell) => {
      const rail = q('[data-rail-track]', shell) || q('.video-grid', shell);
      if (!rail) return;
      if (!shell.dataset.railBound) {
        shell.dataset.railBound = '1';
        q('[data-rail-prev]', shell)?.addEventListener('click', () => rail.scrollBy({ left: -railAmount(rail), behavior: motionBehavior() }));
        q('[data-rail-next]', shell)?.addEventListener('click', () => rail.scrollBy({ left: railAmount(rail), behavior: motionBehavior() }));
        rail.addEventListener('scroll', () => updateRailButtons(shell), { passive: true });
      }
      if (force || shell.dataset.railBound) updateRailButtons(shell);
    });
    if (!document.documentElement.dataset.railResizeBound) {
      document.documentElement.dataset.railResizeBound = '1';
      window.addEventListener('resize', () => qa('[data-content-rail]').forEach(updateRailButtons));
    }
  }

  function railAmount(rail) {
    const card = qa('[data-media-item]:not([hidden])', rail)[0];
    return card ? card.getBoundingClientRect().width + 16 : Math.max(240, rail.clientWidth * .8);
  }

  function updateRailButtons(shell) {
    const rail = q('[data-rail-track]', shell) || q('.video-grid', shell);
    if (!rail) return;
    const previous = q('[data-rail-prev]', shell);
    const next = q('[data-rail-next]', shell);
    if (previous) previous.disabled = rail.scrollLeft <= 4;
    if (next) next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  }

  function watchProgress() {'''
    text = regex(text, rail, rail_replacement, "multiple streaming rails")
    write(path, text)


def patch_landing() -> None:
    path = "neptune-tv-media-cloudflare/public/landing-conversion.js"
    text = read(path)
    text = text.replace("secondary.textContent = 'Web TV 24h/24';", "secondary.textContent = 'Voir le direct';")
    text = text.replace("'La Web TV Neptune Business diffuse 24h/24.'", "'Neptune Media diffuse les émissions programmées.'")
    text = text.replace("'Regarder le direct 24h/24'", "'Regarder le direct'")
    text = text.replace("'<a href=\"/direct/\">Web TV 24h/24</a>", "'<a href=\"/direct/\">Voir le direct</a>")
    enhance = r"  function enhanceFormats\(\) \{.*?\n  function enhanceDeliverables\(\) \{"
    enhance_replacement = '''  function enhanceFormats() {
    setText('#formats .eyebrow', 'DEUX MANIÈRES DE PRENDRE LA PAROLE');
    setText('#formats .section-head h2', 'Le bon format dépend de ce que vous voulez révéler.');
    setText('#formats .section-head p', 'Hors Norme révèle votre trajectoire. Concept Libre construit un programme autour de votre expertise.');
    const cards = document.querySelectorAll('#formats .format-card');
    const configs = [
      { label: 'Hors Norme', image: '/assets/posters/format-canape-sombre.svg', alt: 'Décor canapé sombre du format Hors Norme', promise: 'L’émission qui révèle l’histoire humaine derrière votre entreprise.', items: ['Raconter une trajectoire', 'Revenir sur un déclic ou une épreuve'], program: '/programmes/hors-norme/', cta: 'Voir les créneaux Hors Norme', format: 'horsnorme' },
      { label: 'Concept Libre', image: '/assets/posters/format-plateau-clair.svg', alt: 'Plateau clair du format Concept Libre', promise: 'Une émission conçue autour de votre expertise, de votre marque ou de votre audience.', items: ['Présenter une méthode ou une démonstration', 'Imaginer un jeu, une chronique ou un échange'], program: '/programmes/concept-libre/', cta: 'Construire mon Concept Libre', format: 'libre' }
    ];
    cards.forEach((card, index) => {
      const config = configs[index];
      if (!config) return;
      card.dataset.formatVisual = config.format;
      const image = card.querySelector('img');
      if (image) { image.src = config.image; image.alt = config.alt; }
      const paragraph = card.querySelector('.format-card-content > p');
      if (paragraph) paragraph.textContent = config.promise;
      const oldBenefits = card.querySelector('.format-benefits');
      if (oldBenefits) oldBenefits.remove();
      const benefits = document.createElement('div');
      benefits.className = 'format-benefits';
      benefits.innerHTML = `<strong>Idéal pour</strong><ul>${config.items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
      paragraph?.after(benefits);
      const links = card.querySelectorAll('.format-card-actions a');
      if (links[0]) {
        const url = new URL(BOOKING);
        url.searchParams.set('utm_source', 'webtv');
        url.searchParams.set('utm_medium', 'landing_format');
        url.searchParams.set('utm_campaign', 'neptune_media');
        url.searchParams.set('format', config.format);
        links[0].href = url.toString();
        links[0].textContent = config.cta;
      }
    });
  }

  function enhanceDeliverables() {'''
    text = regex(text, enhance, enhance_replacement, "format visuals")

    faq = r"  function expandFaq\(\) \{.*?\n  function enhanceFinalCta\(\) \{"
    faq_replacement = '''  function expandFaq() {
    setText('#questions .faq-intro h2', 'Avant de passer à l’antenne.');
    setText('#questions .faq-intro p', 'Les réponses essentielles, sans détour.');
    const list = document.querySelector('#questions .faq-list');
    if (!list || list.dataset.normalized === '1') return;
    list.dataset.normalized = '1';
    const items = [
      ['Dois-je être à l’aise face caméra ?', 'Non. La préparation et les relances vous aident à rester naturel.'],
      ['Dois-je apprendre un texte ?', 'Non. Vous préparez des idées et des moments importants, puis la conversation reste naturelle.'],
      ['Mon activité est très technique. Est-ce adapté ?', 'Oui. Neptune relie votre expertise à un problème, une décision et un résultat compréhensibles.'],
      ['Puis-je publier sur mes réseaux et supports ?', 'Les droits d’utilisation sont précisés dans l’offre et les conditions de votre commande.'],
      ['Comment accéder à la Web TV ?', 'Le direct et les émissions à la demande sont accessibles depuis la navigation Neptune Media.']
    ];
    list.innerHTML = items.map(([question, answer], index) => `<article class="faq-item" data-faq><button id="faq-button-${index + 1}" type="button" aria-expanded="false" aria-controls="faq-answer-${index + 1}"><span>${question}</span><span aria-hidden="true">+</span></button><div id="faq-answer-${index + 1}" class="faq-answer" role="region" aria-labelledby="faq-button-${index + 1}" hidden><div><p>${answer}</p></div></div></article>`).join('');
  }

  function enhanceFinalCta() {'''
    text = regex(text, faq, faq_replacement, "concise FAQ")
    write(path, text)


def patch_layout() -> None:
    path = "neptune-tv-media-cloudflare/src/public-layout.js"
    text = read(path)
    text = text.replace('/styles/neptune-streaming.css">', '/styles/neptune-streaming.css?v=7">')
    card = r"export function episodeCard\(origin, catalog, episode\) \{.*?\n\}"
    card_replacement = '''export function episodeCard(origin, catalog, episode) {
  const program = catalog.programs.find((item) => item.id === episode.programId);
  const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags.join(' ') : String(metadata.tags || '');
  const searchText = [episode.title, episode.description, program?.name, metadata.guestName, metadata.guestCompany, tags].filter(Boolean).join(' ');
  const kind = isShortEpisode(episode) ? 'short' : 'episode';
  const shortClass = kind === 'short' ? ' is-short' : '';
  return `<article class="seo-card${shortClass}" data-media-kind="${kind}" data-episode-slug="${escapeHtml(episode.slug)}" data-program="${escapeHtml(program?.name || 'Neptune Media')}" data-search="${escapeHtml(searchText)}"><a href="/emissions/${encodeURIComponent(episode.slug)}/" aria-label="Regarder ${escapeHtml(episode.title)}"><div class="seo-card-media"><img loading="lazy" decoding="async" src="${escapeHtml(absolute(origin, episode.posterUrl))}" alt="${escapeHtml(episode.title)}"><span class="card-play" aria-hidden="true">▶</span><span class="watch-progress" aria-hidden="true" hidden><i></i></span></div><div class="seo-card-copy"><span>${escapeHtml(program?.name || 'Neptune Media')} · ${formatDuration(episode.durationSeconds)}</span><h2>${escapeHtml(episode.title)}</h2><strong>Regarder →</strong></div></a></article>`;
}'''
    text = regex(text, card, card_replacement, "public short cards")
    if 'export function isShortEpisode' not in text:
        anchor = "export function absolute(origin, value) {"
        helper = '''export function isShortEpisode(episode) {
  const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};
  const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
  const duration = Number(episode?.durationSeconds || 0);
  return metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
}
'''
        text = text.replace(anchor, helper + anchor, 1)
    write(path, text)


def patch_render() -> None:
    path = "neptune-tv-media-cloudflare/src/public-render.js"
    text = read(path)
    text = text.replace("import { bookingLink, bookingUrl, absolute, episodeCard, escapeHtml, isoDuration, layout, paragraphs, toList }", "import { bookingLink, bookingUrl, absolute, episodeCard, escapeHtml, isoDuration, isShortEpisode, layout, paragraphs, toList }")
    direct = r"export function renderDirect\(origin, catalog\) \{.*?\n\}\n\nexport function renderEmissions"
    direct_replacement = '''export function renderDirect(origin, catalog) {
  const live = publishedEpisodes(catalog).filter((item) => !isShortEpisode(item) && item.metadata?.live !== false && (item.metadata?.fullEpisode || item.videoUrl?.startsWith('/media/')));
  const available = live.length > 0;
  const description = available ? 'Regardez Neptune Media en direct et choisissez une émission du programme.' : 'La programmation Neptune Media est en cours de préparation.';
  const body = available
    ? `<main id="main-content" class="seo-main live-page live-page-immediate" tabindex="-1"><h1 class="sr-only">Neptune Media en direct</h1><section class="live-channel" data-live-channel data-live-available="true"><div class="live-stage"><video data-live-video autoplay muted controls playsinline preload="metadata" aria-label="Lecteur du direct Neptune Media"></video><div class="live-overlay"><div><span data-live-program>NEPTUNE MEDIA</span><strong data-live-title>Chargement de l’antenne…</strong></div><button type="button" data-live-sound>Activer le son</button></div></div><aside class="live-guide"><div class="live-guide-head"><div><span class="eyebrow">Programme</span><h2>À l’antenne</h2></div><button type="button" class="btn btn-secondary" data-live-resync>Reprendre le direct</button></div><div data-live-playlist></div></aside><div class="live-program-status" aria-live="polite"><div><small>Maintenant</small><strong data-live-now>Connexion à l’antenne…</strong></div><div><small>Ensuite</small><strong data-live-next>Calcul du programme…</strong></div></div></section><section class="related"><span class="eyebrow">À la demande</span><h2>Choisir une émission</h2><div class="seo-grid">${cards(origin, catalog, live)}</div></section></main><script type="module" src="/live-channel.js?v=3"></script>`
    : `<main id="main-content" class="seo-main live-page live-page-immediate" tabindex="-1"><h1 class="sr-only">Programmation Neptune Media</h1><section class="live-empty-panel" data-live-channel data-live-available="false"><div class="live-program-status" aria-live="polite"><div><small>Maintenant</small><strong data-live-now>Aucune émission en cours</strong></div><div><small>Ensuite</small><strong data-live-next>Programmation à venir</strong></div></div><div class="empty-state"><h2>Le prochain direct se prépare.</h2><p>Les émissions publiées restent disponibles.</p><a class="btn btn-primary" href="/emissions/">Voir les émissions</a></div></section></main>`;
  return layout({ origin, title: available ? 'Neptune Media en direct — Web TV business' : 'Programmation Neptune Media', description, canonical: `${origin}/direct/`, structuredData: [{ '@context': 'https://schema.org', '@type': 'BroadcastService', name: 'Neptune Media — Direct', description, url: `${origin}/direct/` }], body });
}

export function renderEmissions'''
    text = regex(text, direct, direct_replacement, "direct first")

    emissions = r"export function renderEmissions\(origin, catalog\) \{.*?\n\}\n\nexport function renderProgram"
    emissions_replacement = '''export function renderEmissions(origin, catalog) {
  const episodes = publishedEpisodes(catalog);
  const full = episodes.filter((item) => !isShortEpisode(item));
  const shorts = episodes.filter(isShortEpisode);
  const publishedProgramIds = new Set(episodes.map((item) => item.programId));
  const programs = catalog.programs.filter((item) => publishedProgramIds.has(item.id));
  const pills = `<nav class="program-pills" aria-label="Programmes"><a href="/emissions/">Tout voir</a>${programs.map((item) => `<a href="/programmes/${encodeURIComponent(item.slug)}/">${escapeHtml(item.name)}</a>`).join('')}</nav>`;
  const fullSection = `<section class="catalog-section" data-media-section="episode"><div class="catalog-section-head"><h2>Émissions complètes</h2><p>Les conversations et formats longs.</p></div><div class="seo-grid">${cards(origin, catalog, full)}</div></section>`;
  const shortSection = shorts.length ? `<section class="catalog-section catalog-shorts" data-media-section="short"><div class="catalog-section-head"><h2>Shorts</h2><p>Des moments courts, dans leur format vertical.</p></div><div class="seo-grid seo-grid-shorts">${cards(origin, catalog, shorts)}</div></section>` : '';
  return layout({ origin, title: 'Toutes les émissions — Neptune Media', description: 'Découvrez les émissions et trajectoires entrepreneuriales produites par Neptune Media.', canonical: `${origin}/emissions/`, body: `<main id="main-content" class="seo-main catalogue-page" tabindex="-1"><section class="seo-hero catalogue-hero"><span class="eyebrow">Catalogue Neptune Media</span><h1>À regarder.</h1><p>Émissions complètes et shorts sont présentés séparément.</p><a class="btn btn-primary" href="/direct/">Voir le direct</a></section>${pills}${fullSection}${shortSection}</main>` });
}

export function renderProgram'''
    text = regex(text, emissions, emissions_replacement, "split public catalogue")
    write(path, text)


def patch_live() -> None:
    path = "neptune-tv-media-cloudflare/public/live-channel.js"
    text = read(path)
    old = ".filter((item) => activeProgramIds.has(item.programId) && item.status === 'published' && item.slug && item.videoUrl && item.posterUrl && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/')))"
    new = ".filter((item) => activeProgramIds.has(item.programId) && item.status === 'published' && item.slug && item.videoUrl && item.posterUrl && !isShortEpisode(item) && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/')))"
    text = text.replace(old, new)
    if 'function isShortEpisode(episode)' not in text:
        anchor = "function isActiveProgram(program)"
        helper = "function isShortEpisode(episode) { const metadata = episode?.metadata && typeof episode.metadata === 'object' ? episode.metadata : {}; const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' '); const duration = Number(episode?.durationSeconds || 0); return metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90); }\n"
        text = text.replace(anchor, helper + anchor, 1)
    write(path, text)


def patch_css() -> None:
    path = "neptune-tv-media-cloudflare/public/styles/neptune-streaming.css"
    text = read(path)
    marker = "/* Render media fix v7"
    if marker in text:
        return
    text += r'''

/* Render media fix v7: separate aspect ratios, reliable FAQ and unobstructed player controls. */
[data-render-media="v7"] #dynamicCatalog,
[data-render-media="v7"] #shortsCatalog { scrollbar-width:none; }
[data-render-media="v7"] #dynamicCatalog::-webkit-scrollbar,
[data-render-media="v7"] #shortsCatalog::-webkit-scrollbar { display:none; }
[data-render-media="v7"] .content-rail-shell { min-width:0; overflow:hidden; }
[data-render-media="v7"] [data-rail-track] { scroll-padding-inline:4px; }
[data-render-media="v7"] #dynamicCatalog .media-card--episode { flex:0 0 clamp(300px,31vw,430px); aspect-ratio:16/9; }
[data-render-media="v7"] #dynamicCatalog .media-card--episode img { object-fit:cover; }
[data-render-media="v7"] .shorts-rail-shell { margin-top:32px; }
[data-render-media="v7"] #shortsCatalog .media-card--short { flex:0 0 clamp(160px,16vw,220px); aspect-ratio:9/16; min-height:0; background:#000; }
[data-render-media="v7"] #shortsCatalog .media-card--short img { object-fit:contain; object-position:center; background:#000; }
[data-render-media="v7"] #shortsCatalog .media-card-copy { left:12px; right:12px; bottom:12px; padding:12px; border-radius:14px; background:linear-gradient(180deg,rgba(4,8,18,.74),rgba(4,8,18,.96)); }
[data-render-media="v7"] #shortsCatalog .media-card h3 { display:-webkit-box; overflow:hidden; -webkit-line-clamp:2; -webkit-box-orient:vertical; font-size:.95rem; }
[data-render-media="v7"] #shortsCatalog .card-play { width:40px; height:40px; }

#questions .faq-intro h2 { max-width:10ch; font-size:clamp(2.7rem,4.8vw,4.9rem); overflow-wrap:normal; }
#questions .faq-intro p { max-width:34ch; }
#questions .faq-answer[hidden] { display:none !important; }
#questions .faq-answer:not([hidden]) { grid-template-rows:1fr; }
#questions .faq-item.is-open .faq-answer { grid-template-rows:1fr; }
#questions .faq-item button { min-height:72px; }
#questions .faq-item button span:first-child { text-align:left; }

#formats .format-card[data-format-visual="horsnorme"] img { object-position:center center; }
#formats .format-card[data-format-visual="libre"] img { object-position:center center; }
#formats .format-card::after { background:linear-gradient(180deg,rgba(1,5,14,.04) 20%,rgba(2,6,17,.96) 88%); }

.live-page-immediate { padding-top:18px; }
.live-page-immediate .live-channel { align-items:start; }
.live-page-immediate .live-program-status { grid-column:1/-1; margin:0; }
.live-page-immediate .related { margin-top:54px; }
.live-page-immediate .live-stage,
.live-page-immediate .live-stage video { min-height:min(68vh,680px); }
.live-overlay { top:0; bottom:auto; align-items:flex-start; padding:18px 20px 70px; background:linear-gradient(180deg,rgba(2,6,17,.93) 0%,rgba(2,6,17,.55) 48%,transparent 100%); }
.live-overlay strong { max-width:min(720px,calc(100% - 190px)); }
.live-overlay button { margin-left:auto; flex:0 0 auto; }
.live-ad-link { top:78px; right:20px; bottom:auto; }
.modal-skip { top:18px; right:18px; bottom:auto; }

body[data-public-ux="streaming-v3"] .catalogue-hero { max-width:760px; padding:28px 0 30px; }
body[data-public-ux="streaming-v3"] .catalogue-hero h1 { margin:10px 0 8px; font-size:clamp(2.5rem,4.2vw,4rem); }
.catalog-section { margin-top:38px; }
.catalog-section-head { display:flex; align-items:end; justify-content:space-between; gap:18px; margin-bottom:16px; }
.catalog-section-head h2 { margin:0; font-size:clamp(1.7rem,3vw,2.6rem); }
.catalog-section-head p { margin:0; color:var(--neptune-muted); }
body[data-public-ux="streaming-v3"] .seo-grid-shorts { grid-template-columns:repeat(5,minmax(0,1fr)); }
body[data-public-ux="streaming-v3"] .seo-card.is-short { background:#000; }
body[data-public-ux="streaming-v3"] .seo-card.is-short .seo-card-media { aspect-ratio:9/16; background:#000; }
body[data-public-ux="streaming-v3"] .seo-card.is-short .seo-card-media img { object-fit:contain; background:#000; }
body[data-public-ux="streaming-v3"] .seo-card.is-short .seo-card-copy h2 { display:-webkit-box; overflow:hidden; -webkit-line-clamp:2; -webkit-box-orient:vertical; }

@media(max-width:1080px) {
  body[data-public-ux="streaming-v3"] .seo-grid-shorts { grid-template-columns:repeat(4,minmax(0,1fr)); }
}
@media(max-width:760px) {
  #questions .faq-intro h2 { max-width:14ch; font-size:clamp(2.45rem,11vw,3.8rem); }
  [data-render-media="v7"] #dynamicCatalog .media-card--episode { flex-basis:min(86vw,390px); }
  [data-render-media="v7"] #shortsCatalog .media-card--short { flex-basis:min(58vw,210px); }
  .live-page-immediate { padding-top:8px; }
  .live-page-immediate .live-stage,
  .live-page-immediate .live-stage video { min-height:56vw; }
  .live-overlay { padding:14px 14px 56px; }
  .live-overlay strong { max-width:calc(100% - 130px); font-size:1rem; }
  .live-overlay button { padding:8px 10px; }
  body[data-public-ux="streaming-v3"] .seo-grid-shorts { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .catalog-section-head { align-items:flex-start; flex-direction:column; }
}
'''
    write(path, text)


def patch_router() -> None:
    path = "neptune-tv-media-cloudflare/src/public-router.js"
    text = read(path)
    text = text.replace('/landing-conversion.css?v=1', '/landing-conversion.css?v=2')
    text = text.replace('/landing-conversion.js?v=1', '/landing-conversion.js?v=2')
    write(path, text)


def main() -> None:
    patch_index()
    patch_app()
    patch_ux()
    patch_landing()
    patch_layout()
    patch_render()
    patch_live()
    patch_css()
    patch_router()
    print("Applied Neptune media separation, FAQ, formats and direct fix v7")


if __name__ == "__main__":
    main()
