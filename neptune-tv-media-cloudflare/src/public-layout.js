export const BOOKING_URL = 'https://media.neptunebusiness.com/';

export function layout({ origin, title, description, canonical, body, image, structuredData = [] }) {
  const shareImage = image || `${origin}/assets/posters/studio-wide.webp`;
  const schemas = structuredData.length ? `<script type="application/ld+json">${safeJson(structuredData.length === 1 ? structuredData[0] : { '@context': 'https://schema.org', '@graph': structuredData })}</script>` : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-video-preview:-1,max-snippet:-1"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Neptune Media"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(shareImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(shareImage)}"><link rel="icon" href="/assets/logo-neptune.svg"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/upgrade.css?v=4"><link rel="stylesheet" href="/live.css?v=1">${schemas}</head><body>${header()}${body}${footer()}</body></html>`;
}

export function episodeCard(origin, catalog, episode) {
  const program = catalog.programs.find((item) => item.id === episode.programId);
  return `<article class="seo-card"><a href="/emissions/${encodeURIComponent(episode.slug)}/"><div class="seo-card-media"><img loading="lazy" src="${escapeHtml(absolute(origin, episode.posterUrl))}" alt="${escapeHtml(episode.title)}"><span class="card-play">▶</span></div><div class="seo-card-copy"><span>${escapeHtml(program?.name || 'Neptune Media')} · ${formatDuration(episode.durationSeconds)}</span><h2>${escapeHtml(episode.title)}</h2><p>${escapeHtml(episode.description)}</p><strong>Regarder l’émission →</strong></div></a></article>`;
}

export function bookingUrl(medium, parameters = {}) {
  const url = new URL(BOOKING_URL);
  url.searchParams.set('utm_source', 'webtv');
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', 'neptune_media');
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(key, String(value));
  });
  return url.toString();
}

export function bookingLink(episode) { return bookingUrl('episode_page', { episode: episode.slug || episode.id }); }
export function absolute(origin, value) { try { return new URL(value || '/assets/posters/default.svg', `${origin}/`).toString(); } catch { return `${origin}/assets/posters/default.svg`; } }
export function isoDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds || 0))); return `PT${Math.floor(value / 60)}M${value % 60}S`; }
export function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
export function toList(value) { if (Array.isArray(value)) return value.filter(Boolean).map(String); return String(value || '').split(/\n|\|/).map((item) => item.trim()).filter(Boolean); }
export function paragraphs(value) { return String(value).split(/\n{2,}/).map((item) => `<p>${escapeHtml(item.trim())}</p>`).join(''); }

function header() { return `<header class="site-header"><div class="container header-inner"><a class="brand" href="/" aria-label="Neptune Media, accueil"><img src="/assets/logo-neptune.svg" alt="Neptune Business & Média"></a><nav class="seo-nav"><a class="live-nav-link" href="/direct/"><i></i> En direct</a><a href="/emissions/">Émissions</a><a href="/programmes/hors-norme/">Hors Norme</a><a href="/programmes/concept-libre/">Concept Libre</a><a class="btn btn-primary" href="${bookingUrl('public_header')}">Voir les créneaux</a></nav></div></header>`; }
function footer() { return `<footer class="footer"><div class="container"><div class="footer-grid"><div class="footer-brand"><img src="/assets/logo-neptune.svg" alt="Neptune Business & Média"><p>La Web TV des histoires d’entreprise qui méritent l’antenne.</p></div><div class="footer-col"><h3>Explorer</h3><a href="/direct/">En direct 24h/24</a><a href="/emissions/">Toutes les émissions</a><a href="/programmes/hors-norme/">Hors Norme</a><a href="/programmes/concept-libre/">Concept Libre</a></div><div class="footer-col"><h3>Informations</h3><a href="/mentions-legales/">Mentions légales</a><a href="/confidentialite/">Confidentialité</a><a href="/contact/">Contact</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Neptune Media.</span><span>Des histoires d’entreprise qui méritent l’antenne.</span></div></div></footer>`; }
function formatDuration(seconds) { const value = Math.max(0, Math.round(Number(seconds || 0))); if (value < 60) return `${value} s`; const hours = Math.floor(value / 3600); const minutes = Math.floor((value % 3600) / 60); return hours ? `${hours} h ${minutes} min` : `${minutes} min`; }
function safeJson(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }
