import { renderDirect, renderEmissions, renderEpisode, renderProgram, renderInformation, renderNotFound } from './public-render.js';
import { buildRobots, buildSitemap, buildVideoSitemap, buildLlms } from './public-seo.js';

export async function handlePublicRoute(request, env) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  const origin = canonicalOrigin(url, env);
  if (path === '/robots.txt') return text(buildRobots(origin), 'text/plain; charset=utf-8');
  if (!isPublicRoute(path)) return null;
  const catalog = await getCatalog(env);
  if (path === '/sitemap.xml') return text(buildSitemap(origin, catalog), 'application/xml; charset=utf-8');
  if (path === '/video-sitemap.xml') return text(buildVideoSitemap(origin, catalog), 'application/xml; charset=utf-8');
  if (path === '/llms.txt') return text(buildLlms(origin, catalog), 'text/plain; charset=utf-8');
  if (path === '/direct/') return html(renderDirect(origin, catalog));
  if (path === '/emissions/') return html(renderEmissions(origin, catalog));
  if (path.startsWith('/emissions/')) {
    const slug = decodeURIComponent(path.slice('/emissions/'.length, -1));
    const episode = catalog.episodes.find((item) => isPublicEpisode(catalog, item) && (item.slug === slug || item.id === slug));
    return episode ? html(renderEpisode(origin, catalog, episode)) : secure(renderNotFound(origin));
  }
  if (path.startsWith('/programmes/')) {
    const slug = decodeURIComponent(path.slice('/programmes/'.length, -1));
    const program = catalog.programs.find((item) => isActiveProgram(item) && (item.slug === slug || item.id === slug));
    const hasPublishedEpisode = program && catalog.episodes.some((item) => isPublicEpisode(catalog, item) && item.programId === program.id);
    return hasPublishedEpisode ? html(renderProgram(origin, catalog, program)) : secure(renderNotFound(origin));
  }
  if (path === '/mentions-legales/') return html(renderInformation(origin, 'Mentions légales', 'Informations relatives à l’éditeur et à l’hébergement de Neptune Media.', 'legal'));
  if (path === '/confidentialite/') return html(renderInformation(origin, 'Confidentialité', 'Comment Neptune Media traite les données et mesures d’audience.', 'privacy'));
  if (path === '/contact/') return html(renderInformation(origin, 'Contact', 'Contacter Neptune Media ou accéder à la réservation.', 'contact'));
  return null;
}

export async function enhanceHtml(response, request, env, mode) {
  const url = new URL(request.url);
  const origin = canonicalOrigin(url, env);
  let body = await response.text();
  body = body.replaceAll('https://tv.neptunebusiness.com', origin);
  if (mode === 'public' && normalizePath(url.pathname) === '/') body = injectLandingSchema(body, origin);
  const stylesheet = mode === 'studio' ? '/studio-upgrade.css?v=5' : '/upgrade.css?v=5';
  const supplementalStyles = mode === 'public'
    ? '<link rel="stylesheet" href="/upgrade-media.css?v=6"><link rel="stylesheet" href="/landing-conversion.css?v=3"><link rel="stylesheet" href="/styles/visual-polish-v11.css?v=2">'
    : '<link rel="stylesheet" href="/studio-access.css?v=2"><link rel="stylesheet" href="/studio-live.css?v=2"><link rel="stylesheet" href="/studio-command.css?v=1">';
  const script = mode === 'studio' ? '/studio-upgrade.js?v=5' : '/upgrade.js?v=6';
  const extraScripts = mode === 'public'
    ? '<script type="module" src="/home-live.js?v=4"></script><script src="/landing-conversion.js?v=5"></script>'
    : '<script src="/studio-access.js?v=2"></script><script src="/studio-live.js?v=2"></script><script src="/studio-command.js?v=1"></script>';
  if (!body.includes(stylesheet)) body = body.replace('</head>', `<link rel="stylesheet" href="${stylesheet}">${supplementalStyles}</head>`);
  const marker = mode === 'studio' ? '<script type="module" src="/studio/studio.js"></script>' : '<script src="/app.js"></script>';
  if (!body.includes(script)) body = body.replace(marker, `${extraScripts}<script src="${script}"></script>${marker}${mode === 'public' ? '<script src="/visual-polish-v11.js?v=2"></script>' : ''}`);
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  if (mode === 'studio') {
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  } else {
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  applySecurity(headers);
  return new Response(body, { status: response.status, headers });
}

function injectLandingSchema(body, origin) {
  if (body.includes('"@id":"#neptune-media-service"')) return body;
  const booking = 'https://media.neptunebusiness.com/';
  const organizationId = `${origin}/#organization`;
  const featuredVideoId = `${origin}/#featured-video`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Neptune Media',
        url: `${origin}/`,
        logo: { '@type': 'ImageObject', url: `${origin}/assets/logo-neptune.svg` },
      },
      {
        '@type': 'VideoObject',
        '@id': featuredVideoId,
        name: 'Neptune Media — Votre entreprise est solide. Il faut que ça se voie.',
        description: 'Extrait réel d’un tournage Neptune Media consacré à la mise en lumière de l’entrepreneuriat.',
        thumbnailUrl: [`${origin}/assets/posters/poster-neptune-media.webp`],
        contentUrl: `${origin}/assets/media/neptune-media-mis-en-lumiere.mp4`,
        uploadDate: '2026-07-15',
        duration: 'PT44S',
        inLanguage: 'fr-FR',
        isFamilyFriendly: true,
        publisher: { '@id': organizationId },
        potentialAction: { '@type': 'WatchAction', target: `${origin}/#a-voir` },
      },
      {
        '@type': 'Service',
        '@id': '#neptune-media-service',
        name: 'Création d’émissions vidéo professionnelles Neptune Media',
        serviceType: 'Production éditoriale et audiovisuelle pour entreprises',
        provider: { '@id': organizationId },
        subjectOf: { '@id': featuredVideoId },
        areaServed: { '@type': 'AdministrativeArea', name: 'Occitanie' },
        audience: { '@type': 'BusinessAudience', audienceType: 'Dirigeants, fondateurs, indépendants et PME' },
        description: 'Neptune aide les dirigeants à être visibles sans devenir influenceurs : angle, préparation, plateau, interview et production sont pris en charge.',
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Formats Neptune Media',
          itemListElement: [
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Hors Norme', description: 'Une émission centrée sur la trajectoire, les ruptures et les convictions du dirigeant.' } },
            { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Concept Libre', description: 'Une émission conçue autour de l’univers, de l’expertise ou de l’objectif éditorial de l’entreprise.' } },
          ],
        },
        potentialAction: { '@type': 'ReserveAction', target: booking },
      },
      {
        '@type': 'FAQPage',
        '@id': '#neptune-media-faq',
        mainEntity: [
          faq('Dois-je être à l’aise devant une caméra ?', 'Non. La préparation et l’interviewer sont conçus pour guider les professionnels qui ne sont pas habitués à cet exercice.'),
          faq('Dois-je apprendre un texte ?', 'Non. Vous préparez des idées, des événements et des messages importants, puis l’échange reste naturel.'),
          faq('Quelle différence entre Hors Norme et Concept Libre ?', 'Hors Norme révèle l’histoire et la trajectoire du dirigeant. Concept Libre construit un format spécifique autour de l’entreprise, de son expertise ou de son univers.'),
          faq('Puis-je utiliser la vidéo sur mes propres supports ?', 'Le fichier livré peut être exploité conformément aux conditions de l’offre et aux droits applicables.'),
        ],
      },
    ],
  };
  const schema = `<script type="application/ld+json" data-neptune-landing-schema>${safeJson(data)}</script>`;
  return body.replace('</head>', `${schema}</head>`);
}

function faq(name, text) {
  return { '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } };
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function getCatalog(env) {
  try {
    const id = env.STUDIO.idFromName('neptune-media-main');
    const response = await env.STUDIO.get(id).fetch('https://store/public/catalog');
    if (!response.ok) throw new Error('catalog_unavailable');
    const data = await response.json();
    return { programs: data.programs || [], episodes: data.episodes || [], ads: data.ads || [] };
  } catch (error) {
    console.error('public_catalog_failed', error);
    return { programs: [], episodes: [], ads: [] };
  }
}

function isPublicRoute(path) { return path === '/sitemap.xml' || path === '/video-sitemap.xml' || path === '/llms.txt' || path === '/direct/' || path === '/emissions/' || path.startsWith('/emissions/') || path.startsWith('/programmes/') || path === '/mentions-legales/' || path === '/confidentialite/' || path === '/contact/'; }
function isActiveProgram(program) { return Boolean(program?.slug) && program.active !== false && Number(program.active ?? 1) !== 0; }
function isPublicEpisode(catalog, episode) { const program = (catalog.programs || []).find((item) => item.id === episode?.programId); return isActiveProgram(program) && episode?.status === 'published' && Boolean(episode.slug && episode.videoUrl && episode.posterUrl); }
function normalizePath(value) { const clean = value.replace(/\/{2,}/g, '/'); if (clean === '/' || clean.endsWith('.xml') || clean.endsWith('.txt')) return clean; return clean.endsWith('/') ? clean : `${clean}/`; }
function canonicalOrigin(url, env) { return String(env.PUBLIC_ORIGIN || url.origin).replace(/\/$/, ''); }
function html(value) { return secure(new Response(value, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })); }
function text(value, type) { return secure(new Response(value, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' } })); }
function secure(response) { const headers = new Headers(response.headers); applySecurity(headers); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
function applySecurity(headers) { headers.set('X-Content-Type-Options', 'nosniff'); headers.set('X-Frame-Options', 'DENY'); headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); headers.set('Cross-Origin-Opener-Policy', 'same-origin'); headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https: blob:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://media.neptunebusiness.com"); }
