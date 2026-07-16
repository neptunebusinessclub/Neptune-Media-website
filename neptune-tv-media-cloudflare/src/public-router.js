import { renderDirect, renderEmissions, renderEpisode, renderProgram, renderInformation, renderNotFound } from './public-render.js';
import { buildRobots, buildSitemap, buildVideoSitemap } from './public-seo.js';

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
  if (path === '/direct/') return html(renderDirect(origin, catalog));
  if (path === '/emissions/') return html(renderEmissions(origin, catalog));
  if (path.startsWith('/emissions/')) {
    const slug = decodeURIComponent(path.slice('/emissions/'.length, -1));
    const episode = catalog.episodes.find((item) => item.slug === slug || item.id === slug);
    return episode ? html(renderEpisode(origin, catalog, episode)) : secure(renderNotFound(origin));
  }
  if (path.startsWith('/programmes/')) {
    const slug = decodeURIComponent(path.slice('/programmes/'.length, -1));
    const program = catalog.programs.find((item) => item.slug === slug || item.id === slug);
    return program ? html(renderProgram(origin, catalog, program)) : secure(renderNotFound(origin));
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
  const stylesheet = mode === 'studio' ? '/studio-upgrade.css?v=4' : '/upgrade.css?v=4';
  const supplementalStyles = mode === 'public'
    ? '<link rel="stylesheet" href="/upgrade-media.css?v=4">'
    : '<link rel="stylesheet" href="/studio-access.css?v=1"><link rel="stylesheet" href="/studio-live.css?v=1">';
  const script = mode === 'studio' ? '/studio-upgrade.js?v=4' : '/upgrade.js?v=4';
  const extraScripts = mode === 'public'
    ? '<script type="module" src="/home-live.js?v=1"></script>'
    : '<script src="/studio-access.js?v=1"></script><script src="/studio-live.js?v=1"></script>';
  if (!body.includes(stylesheet)) body = body.replace('</head>', `<link rel="stylesheet" href="${stylesheet}">${supplementalStyles}</head>`);
  const marker = mode === 'studio' ? '<script type="module" src="/studio/studio.js"></script>' : '<script src="/app.js"></script>';
  if (!body.includes(script)) body = body.replace(marker, `${extraScripts}<script src="${script}"></script>${marker}`);
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  applySecurity(headers);
  return new Response(body, { status: response.status, headers });
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

function isPublicRoute(path) { return path === '/sitemap.xml' || path === '/video-sitemap.xml' || path === '/direct/' || path === '/emissions/' || path.startsWith('/emissions/') || path.startsWith('/programmes/') || path === '/mentions-legales/' || path === '/confidentialite/' || path === '/contact/'; }
function normalizePath(value) { const clean = value.replace(/\/{2,}/g, '/'); if (clean === '/' || clean.endsWith('.xml') || clean.endsWith('.txt')) return clean; return clean.endsWith('/') ? clean : `${clean}/`; }
function canonicalOrigin(url, env) { return String(env.PUBLIC_ORIGIN || url.origin).replace(/\/$/, ''); }
function html(value) { return secure(new Response(value, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })); }
function text(value, type) { return secure(new Response(value, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' } })); }
function secure(response) { const headers = new Headers(response.headers); applySecurity(headers); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
function applySecurity(headers) { headers.set('X-Content-Type-Options', 'nosniff'); headers.set('X-Frame-Options', 'DENY'); headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'); headers.set('Cross-Origin-Opener-Policy', 'same-origin'); headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https: blob:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://media.neptunebusiness.com"); }
