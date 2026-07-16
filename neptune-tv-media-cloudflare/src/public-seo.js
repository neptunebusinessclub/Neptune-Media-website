export function buildRobots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /studio/\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\nSitemap: ${origin}/video-sitemap.xml\n`;
}

export function buildSitemap(origin, catalog) {
  const urls = [`${origin}/`, `${origin}/emissions/`, `${origin}/mentions-legales/`, `${origin}/confidentialite/`, `${origin}/contact/`, ...catalog.programs.map((item) => `${origin}/programmes/${item.slug}/`), ...catalog.episodes.map((item) => `${origin}/emissions/${item.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xml(url)}</loc><changefreq>weekly</changefreq></url>`).join('')}</urlset>`;
}

export function buildVideoSitemap(origin, catalog) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${catalog.episodes.map((item) => `<url><loc>${xml(`${origin}/emissions/${item.slug}/`)}</loc><video:video><video:thumbnail_loc>${xml(absolute(origin, item.posterUrl))}</video:thumbnail_loc><video:title>${xml(item.title)}</video:title><video:description>${xml(item.description || item.title)}</video:description><video:content_loc>${xml(absolute(origin, item.videoUrl))}</video:content_loc><video:duration>${Math.max(1, Math.round(Number(item.durationSeconds || 1)))}</video:duration><video:publication_date>${xml(item.publishedAt || new Date().toISOString())}</video:publication_date></video:video></url>`).join('')}</urlset>`;
}

function absolute(origin, value) { try { return new URL(value || '/assets/posters/default.svg', `${origin}/`).toString(); } catch { return `${origin}/assets/posters/default.svg`; } }
function xml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char])); }
