import { BOOKING_URL, absolute, bookingLink, episodeCard, escapeHtml, isoDuration, layout, paragraphs, toList } from './public-layout.js';

export function renderEmissions(origin, catalog) {
  const pills = `<nav class="program-pills" aria-label="Programmes"><a href="/emissions/">Tout voir</a>${catalog.programs.map((item) => `<a href="/programmes/${encodeURIComponent(item.slug)}/">${escapeHtml(item.name)}</a>`).join('')}</nav>`;
  return layout({ origin, title: 'Toutes les émissions — Neptune Media', description: 'Découvrez les émissions, extraits et trajectoires entrepreneuriales produites par Neptune Media.', canonical: `${origin}/emissions/`, body: `<main class="seo-main"><section class="seo-hero"><span class="eyebrow">La chaîne Neptune Media</span><h1>Des histoires d’entreprise qui méritent l’antenne.</h1><p>Explorez les émissions par programme, découvrez les trajectoires et regardez les moments qui donnent du relief à une expertise.</p></section>${pills}<section class="seo-grid">${cards(origin, catalog, catalog.episodes)}</section></main>` });
}

export function renderProgram(origin, catalog, program) {
  const episodes = catalog.episodes.filter((item) => item.programId === program.id);
  return layout({ origin, title: `${program.name} — Programme Neptune Media`, description: program.description || `Retrouvez les émissions du programme ${program.name}.`, canonical: `${origin}/programmes/${encodeURIComponent(program.slug)}/`, structuredData: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: program.name, description: program.description, url: `${origin}/programmes/${program.slug}/` }], body: `<main class="seo-main"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/emissions/">Émissions</a><span>›</span><span>${escapeHtml(program.name)}</span></nav><section class="seo-hero"><span class="eyebrow">Programme</span><h1>${escapeHtml(program.name)}</h1><p>${escapeHtml(program.description)}</p></section><section class="seo-grid">${cards(origin, catalog, episodes)}</section></main>` });
}

export function renderEpisode(origin, catalog, episode) {
  const program = catalog.programs.find((item) => item.id === episode.programId);
  const metadata = episode.metadata || {};
  const description = metadata.metaDescription || episode.description || 'Une émission Neptune Media.';
  const canonical = `${origin}/emissions/${encodeURIComponent(episode.slug)}/`;
  const transcript = String(metadata.transcript || '').trim();
  const questions = toList(metadata.questions);
  const guest = metadata.guestName || '';
  const company = metadata.guestCompany || '';
  const related = catalog.episodes.filter((item) => item.id !== episode.id && item.programId === episode.programId).slice(0, 3);
  const videoData = { '@context': 'https://schema.org', '@type': 'VideoObject', name: episode.title, description, thumbnailUrl: absolute(origin, episode.posterUrl), contentUrl: absolute(origin, episode.videoUrl), uploadDate: episode.publishedAt || new Date().toISOString(), duration: isoDuration(episode.durationSeconds), url: canonical };
  if (guest) videoData.actor = { '@type': 'Person', name: guest };
  return layout({ origin, title: metadata.seoTitle || `${episode.title} — Neptune Media`, description, canonical, image: absolute(origin, episode.posterUrl), structuredData: [videoData, breadcrumbs(origin, program, episode)], body: `<main class="seo-main episode-page"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><a href="/emissions/">Émissions</a><span>›</span><span>${escapeHtml(episode.title)}</span></nav><article><div class="episode-player"><video controls playsinline preload="metadata" poster="${escapeHtml(absolute(origin, episode.posterUrl))}"><source src="${escapeHtml(absolute(origin, episode.videoUrl))}" type="video/mp4"></video></div><div class="episode-layout"><div class="episode-copy"><span class="eyebrow">${escapeHtml(program?.name || 'Neptune Media')}</span><h1>${escapeHtml(episode.title)}</h1>${guest ? `<p class="guest-line">Avec <strong>${escapeHtml(guest)}</strong>${company ? ` · ${escapeHtml(company)}` : ''}</p>` : ''}<p class="lead">${escapeHtml(episode.description)}</p><div class="episode-actions"><button class="btn btn-dark" type="button" data-native-share>Partager l’émission</button><a class="btn btn-primary" href="${bookingLink(episode)}">Voir les créneaux disponibles</a></div>${questions.length ? `<section class="answer-block"><h2>Les questions abordées</h2><ul>${questions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>` : ''}${transcript ? `<section class="transcript"><h2>Transcription</h2>${paragraphs(transcript)}</section>` : `<section class="answer-block"><h2>Ce que cette émission montre</h2><p>Une parole entrepreneuriale claire, une scène vécue et un dispositif éditorial conçu pour être regardé, compris et partagé.</p></section>`}</div><aside><div class="offer-card"><span class="eyebrow">Passer à l’écran</span><h2>Votre histoire peut devenir une émission.</h2><p>Choisissez le format qui révèle votre trajectoire ou construit un concept autour de votre marque.</p><a class="btn btn-primary btn-block" href="${bookingLink(episode)}">Choisir mon format</a></div></aside></div></article>${related.length ? `<section class="related"><span class="eyebrow">À voir ensuite</span><h2>Dans le même programme</h2><div class="seo-grid">${cards(origin, catalog, related)}</div></section>` : ''}</main><script src="/episode-page.js?v=3"></script>` });
}

export function renderInformation(origin, title, description, type) {
  const contents = {
    legal: `<h2>Éditeur</h2><p>Neptune Business & Média. Les informations juridiques complètes de la société sont disponibles sur les supports officiels de Neptune Business.</p><h2>Hébergement</h2><p>Le service est hébergé sur l’infrastructure Cloudflare.</p><h2>Propriété intellectuelle</h2><p>Les vidéos, marques, textes et éléments graphiques restent protégés par les droits applicables.</p>`,
    privacy: `<h2>Données mesurées</h2><p>La Web TV mesure les lectures, le temps de visionnage, la progression, les partages et les clics vers la réservation afin d’améliorer les programmes et d’attribuer les conversions.</p><h2>Identifiant de session</h2><p>Un identifiant aléatoire est conservé localement. Il ne contient ni nom ni adresse e-mail.</p><h2>Vos droits</h2><p>Écrivez à <a href="mailto:contact@neptunebusiness.com">contact@neptunebusiness.com</a>.</p>`,
    contact: `<h2>Parler de votre projet</h2><p>Écrivez à <a href="mailto:contact@neptunebusiness.com">contact@neptunebusiness.com</a>.</p><p><a class="btn btn-primary" href="${BOOKING_URL}">Voir les créneaux et les offres</a></p>`,
  };
  const slug = type === 'legal' ? 'mentions-legales' : type === 'privacy' ? 'confidentialite' : 'contact';
  return layout({ origin, title: `${title} — Neptune Media`, description, canonical: `${origin}/${slug}/`, body: `<main class="seo-main info-page"><nav class="breadcrumbs"><a href="/">Accueil</a><span>›</span><span>${escapeHtml(title)}</span></nav><article><span class="eyebrow">Neptune Media</span><h1>${escapeHtml(title)}</h1>${contents[type]}</article></main>` });
}

export function renderNotFound(origin) {
  const body = layout({ origin, title: 'Page introuvable — Neptune Media', description: 'Cette page n’existe pas.', canonical: `${origin}/404`, body: '<main class="seo-main info-page"><article><h1>Cette émission n’est plus à l’antenne.</h1><p><a class="btn btn-primary" href="/emissions/">Voir toutes les émissions</a></p></article></main>' });
  return new Response(body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function cards(origin, catalog, list) { return list.map((item) => episodeCard(origin, catalog, item)).join('') || '<div class="empty-state"><h2>Les prochaines émissions arrivent.</h2><p>Le Studio Neptune prépare la programmation.</p></div>'; }
function breadcrumbs(origin, program, episode) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: program?.name || 'Émissions', item: program ? `${origin}/programmes/${program.slug}/` : `${origin}/emissions/` }, { '@type': 'ListItem', position: 3, name: episode.title, item: `${origin}/emissions/${episode.slug}/` }] }; }
