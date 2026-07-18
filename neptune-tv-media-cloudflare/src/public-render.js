import { bookingLink, bookingUrl, absolute, episodeCard, escapeHtml, isoDuration, layout, paragraphs, toList } from './public-layout.js';

export function renderDirect(origin, catalog) {
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

export function renderEmissions(origin, catalog) {
  const episodes = publishedEpisodes(catalog);
  const publishedProgramIds = new Set(episodes.map((item) => item.programId));
  const programs = catalog.programs.filter((item) => publishedProgramIds.has(item.id));
  const pills = `<nav class="program-pills" aria-label="Programmes"><a href="/emissions/">Tout voir</a>${programs.map((item) => `<a href="/programmes/${encodeURIComponent(item.slug)}/">${escapeHtml(item.name)}</a>`).join('')}</nav>`;
  return layout({
    origin,
    title: 'Toutes les émissions — Neptune Media',
    description: 'Découvrez les émissions et trajectoires entrepreneuriales produites par Neptune Media.',
    canonical: `${origin}/emissions/`,
    body: `<main id="main-content" class="seo-main" tabindex="-1"><section class="seo-hero"><span class="eyebrow">Catalogue Neptune Media</span><h1>Des histoires qui méritent l’antenne.</h1><p>Recherchez un invité, une entreprise ou un sujet.</p><p><a class="btn btn-primary" href="/direct/">Voir le direct</a></p></section>${pills}<section aria-labelledby="new-episodes"><h2 id="new-episodes" class="sr-only">Toutes les émissions</h2><div class="seo-grid">${cards(origin, catalog, episodes)}</div></section></main>`
  });
}

export function renderProgram(origin, catalog, program) {
  const episodes = publishedEpisodes(catalog).filter((item) => item.programId === program.id);
  const featured = episodes[0];
  const feature = featured ? `<section class="program-feature"><img src="${escapeHtml(absolute(origin, featured.posterUrl))}" alt="${escapeHtml(featured.title)}"><div class="program-feature-copy"><span class="eyebrow">${escapeHtml(program.name)}</span><h1>${escapeHtml(featured.title)}</h1><div class="program-meta"><span>${formatDuration(featured.durationSeconds)}</span>${featured.metadata?.guestName ? `<span>${escapeHtml(featured.metadata.guestName)}</span>` : ''}</div><p>${escapeHtml(shorten(featured.description || program.description, 180))}</p><a class="btn btn-primary" href="/emissions/${encodeURIComponent(featured.slug)}/">Regarder</a></div></section>` : `<section class="seo-hero"><span class="eyebrow">Programme</span><h1>${escapeHtml(program.name)}</h1><p>${escapeHtml(program.description || 'Les prochains épisodes arrivent.')}</p></section>`;
  return layout({
    origin,
    title: `${program.name} — Programme Neptune Media`,
    description: program.description || `Retrouvez les émissions du programme ${program.name}.`,
    canonical: `${origin}/programmes/${encodeURIComponent(program.slug)}/`,
    structuredData: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: program.name, description: program.description, url: `${origin}/programmes/${program.slug}/` }],
    body: `<main id="main-content" class="seo-main" tabindex="-1"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/emissions/">Émissions</a><span>›</span><span>${escapeHtml(program.name)}</span></nav>${feature}<section class="related"><span class="eyebrow">Épisodes</span><h2>${episodes.length ? 'Dans ce programme' : 'Bientôt à l’antenne'}</h2><div class="seo-grid">${cards(origin, catalog, episodes)}</div></section></main>`
  });
}

export function renderEpisode(origin, catalog, episode) {
  const program = catalog.programs.find((item) => item.id === episode.programId);
  const metadata = episode.metadata || {};
  const description = metadata.metaDescription || episode.description || 'Une émission Neptune Media.';
  const canonical = `${origin}/emissions/${encodeURIComponent(episode.slug)}/`;
  const transcript = String(metadata.transcript || '').trim();
  const captionsUrl = metadata.captionsUrl || metadata.captionUrl || episode.captionsUrl || '';
  const questions = toList(metadata.questions);
  const guest = metadata.guestName || '';
  const company = metadata.guestCompany || '';
  const related = publishedEpisodes(catalog).filter((item) => item.id !== episode.id && item.programId === episode.programId).slice(0, 3);
  const nextEpisode = related[0];
  const videoData = { '@context': 'https://schema.org', '@type': 'VideoObject', name: episode.title, description, contentUrl: absolute(origin, episode.videoUrl), embedUrl: canonical, url: canonical };
  const thumbnailUrl = absolute(origin, episode.posterUrl);
  const uploadDate = validIsoDate(episode.publishedAt);
  const duration = isoDuration(episode.durationSeconds);
  if (thumbnailUrl) videoData.thumbnailUrl = thumbnailUrl;
  if (uploadDate) videoData.uploadDate = uploadDate;
  if (duration) videoData.duration = duration;
  if (guest) videoData.actor = { '@type': 'Person', name: guest };
  const track = captionsUrl ? `<track kind="captions" srclang="fr" label="Français" src="${escapeHtml(absolute(origin, captionsUrl))}" default>` : '';
  const dateLabel = uploadDate ? formatDate(uploadDate) : '';
  return layout({
    origin,
    title: metadata.seoTitle || `${episode.title} — Neptune Media`,
    description,
    canonical,
    image: absolute(origin, episode.posterUrl),
    structuredData: [videoData, breadcrumbs(origin, program, episode)],
    body: `<main id="main-content" class="seo-main episode-page" tabindex="-1"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/emissions/">Émissions</a><span>›</span><span>${escapeHtml(episode.title)}</span></nav><article><div class="episode-player"><video controls playsinline preload="metadata" poster="${escapeHtml(absolute(origin, episode.posterUrl))}" aria-label="${escapeHtml(episode.title)}"><source src="${escapeHtml(absolute(origin, episode.videoUrl))}" type="video/mp4">${track}</video></div><div class="episode-layout"><div class="episode-copy"><span class="eyebrow">${escapeHtml(program?.name || 'Neptune Media')}</span><h1>${escapeHtml(episode.title)}</h1><div class="episode-meta-line"><span>${formatDuration(episode.durationSeconds)}</span>${dateLabel ? `<span>${escapeHtml(dateLabel)}</span>` : ''}${captionsUrl ? '<span>Sous-titres disponibles</span>' : ''}</div>${guest ? `<p class="guest-line">Avec <strong>${escapeHtml(guest)}</strong>${company ? ` · ${escapeHtml(company)}` : ''}</p>` : ''}<p class="lead">${escapeHtml(shorten(episode.description, 260))}</p><div class="episode-actions"><button class="btn btn-dark" type="button" data-native-share>Partager</button><a class="btn btn-primary" data-funnel href="${bookingLink(episode)}">Voir les créneaux</a></div>${nextEpisode ? `<div class="episode-next"><a class="btn btn-secondary" href="/emissions/${encodeURIComponent(nextEpisode.slug)}/">Épisode suivant</a><a class="btn btn-secondary" href="/emissions/">Retour au catalogue</a></div>` : ''}${questions.length ? `<section class="answer-block"><h2>Questions abordées</h2><ul>${questions.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}${transcript ? `<details class="transcript"><summary>Lire la transcription</summary>${paragraphs(transcript)}</details>` : ''}</div><aside><div class="offer-card"><span class="eyebrow">Passer à l’écran</span><h2>Votre histoire peut devenir une émission.</h2><p>Consultez le format, le tarif et les créneaux avant toute confirmation.</p><a class="btn btn-primary btn-block" data-funnel href="${bookingLink(episode)}">Voir les créneaux</a></div></aside></div></article>${related.length ? `<section class="related"><span class="eyebrow">À voir ensuite</span><h2>Dans le même programme</h2><div class="seo-grid">${cards(origin, catalog, related)}</div></section>` : ''}</main><script src="/episode-page.js?v=3"></script>`
  });
}

export function renderInformation(origin, title, description, type) {
  const contents = { legal: `<h2>Éditeur</h2><p>Neptune Business & Média. Les informations juridiques complètes de la société sont disponibles sur les supports officiels de Neptune Business.</p><h2>Hébergement</h2><p>Le service est hébergé sur l’infrastructure Cloudflare.</p><h2>Propriété intellectuelle</h2><p>Les vidéos, marques, textes et éléments graphiques restent protégés par les droits applicables.</p>`, privacy: `<h2>Données mesurées</h2><p>La Web TV mesure les lectures, le temps de visionnage, la progression, les partages et les clics vers la réservation afin d’améliorer les programmes et d’attribuer les conversions.</p><h2>Identifiant de session</h2><p>Un identifiant aléatoire est conservé localement. Il ne contient ni nom ni adresse e-mail.</p><h2>Vos droits</h2><p>Écrivez à <a href="mailto:contact@neptunebusiness.com">contact@neptunebusiness.com</a>.</p>`, contact: `<h2>Parler de votre projet</h2><p>Écrivez à <a href="mailto:contact@neptunebusiness.com">contact@neptunebusiness.com</a>.</p><p><a class="btn btn-primary" href="${bookingUrl('contact_page')}">Voir les créneaux</a></p>` };
  const slug = type === 'legal' ? 'mentions-legales' : type === 'privacy' ? 'confidentialite' : 'contact';
  return layout({ origin, title: `${title} — Neptune Media`, description, canonical: `${origin}/${slug}/`, body: `<main id="main-content" class="seo-main info-page" tabindex="-1"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><span>${escapeHtml(title)}</span></nav><article><span class="eyebrow">Neptune Media</span><h1>${escapeHtml(title)}</h1>${contents[type]}</article></main>` });
}

export function renderNotFound(origin) {
  const body = layout({ origin, title: 'Page introuvable — Neptune Media', description: 'Cette page n’existe pas.', canonical: `${origin}/404`, body: '<main id="main-content" class="seo-main info-page" tabindex="-1"><article><h1>Cette émission n’est plus à l’antenne.</h1><p><a class="btn btn-primary" href="/emissions/">Voir les émissions</a></p></article></main>' });
  return new Response(body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function publishedEpisodes(catalog) { const activeProgramIds = new Set((catalog.programs || []).filter(isActiveProgram).map((item) => item.id)); return (catalog.episodes || []).filter((item) => activeProgramIds.has(item.programId) && item.status === 'published' && item.slug && item.videoUrl && item.posterUrl); }
function isActiveProgram(program) { return Boolean(program?.slug) && program.active !== false && Number(program.active ?? 1) !== 0; }
function cards(origin, catalog, list) { return list.map((item) => episodeCard(origin, catalog, item)).join('') || '<div class="empty-state"><h2>Les prochaines émissions arrivent.</h2><p>Le Studio Neptune prépare la programmation.</p></div>'; }
function breadcrumbs(origin, program, episode) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: program?.name || 'Émissions', item: program ? `${origin}/programmes/${program.slug}/` : `${origin}/emissions/` }, { '@type': 'ListItem', position: 3, name: episode.title, item: `${origin}/emissions/${episode.slug}/` }] }; }
function validIsoDate(value) { const timestamp = Date.parse(String(value || '')); return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ''; }
function formatDate(value) { try { return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)); } catch { return ''; } }
function formatDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds || 0))); if (value < 60) return `${value} s`; const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${minutes} min`; }
function shorten(value, maximum) { const text = String(value || '').trim(); return text.length <= maximum ? text : `${text.slice(0, maximum - 1).trimEnd()}…`; }
