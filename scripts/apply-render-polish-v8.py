from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    for old, new in replacements:
        if new not in text:
            text = text.replace(old, new)
    target.write_text(text, encoding="utf-8")


def append_once(path: str, marker: str, content: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if marker not in text:
        target.write_text(text.rstrip() + "\n\n" + content.strip() + "\n", encoding="utf-8")


def main() -> None:
    patch(
        "neptune-tv-media-cloudflare/public/index.html",
        [
            ("/assets/posters/format-canape-sombre.svg", "/assets/posters/studio-wide.webp"),
            ("/assets/posters/format-plateau-clair.svg", "/assets/posters/concept-libre-wide.webp"),
            ('<a href="/emissions/">Émissions</a>', '<a href="/emissions/">Neptune TV</a>'),
            ("/styles/neptune-streaming.css?v=7", "/styles/neptune-streaming.css?v=9"),
            ("/styles/neptune-streaming.css?v=8", "/styles/neptune-streaming.css?v=9"),
            ('<span>Connexio</span><span>57 s</span>', '<span>Concept Libre</span><span>57 s</span>'),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/src/public-layout.js",
        [
            ('<a href="/emissions/">Neptune TV</a>', '<a href="/emissions/">Émissions</a>'),
            ("/styles/neptune-streaming.css?v=7", "/styles/neptune-streaming.css?v=9"),
            ("/styles/neptune-streaming.css?v=8", "/styles/neptune-streaming.css?v=9"),
            (
                "  const kind = isShortEpisode(episode) ? 'short' : 'episode';\n  const shortClass = kind === 'short' ? ' is-short' : '';\n  return `<article class=\"seo-card${shortClass}\" data-media-kind=\"${kind}\" data-episode-slug=\"${escapeHtml(episode.slug)}\" data-program=\"${escapeHtml(program?.name || 'Neptune Media')}\" data-search=\"${escapeHtml(searchText)}\"><a href=\"/emissions/${encodeURIComponent(episode.slug)}/\" aria-label=\"Regarder ${escapeHtml(episode.title)}\"><div class=\"seo-card-media\"><img loading=\"lazy\" decoding=\"async\" src=\"${escapeHtml(absolute(origin, episode.posterUrl))}\" alt=\"${escapeHtml(episode.title)}\"><span class=\"card-play\" aria-hidden=\"true\">▶</span><span class=\"watch-progress\" aria-hidden=\"true\" hidden><i></i></span></div><div class=\"seo-card-copy\"><span>${escapeHtml(program?.name || 'Neptune Media')} · ${formatDuration(episode.durationSeconds)}</span><h2>${escapeHtml(episode.title)}</h2><strong>Regarder →</strong></div></a></article>`;",
                "  const kind = isShortEpisode(episode) ? 'short' : 'episode';\n  const shortClass = kind === 'short' ? ' is-short' : '';\n  const formatName = formatLabel(program?.name);\n  return `<article class=\"seo-card${shortClass}\" data-media-kind=\"${kind}\" data-episode-slug=\"${escapeHtml(episode.slug)}\" data-program=\"${escapeHtml(formatName)}\" data-search=\"${escapeHtml(searchText)}\"><a href=\"/emissions/${encodeURIComponent(episode.slug)}/\" aria-label=\"Regarder ${escapeHtml(episode.title)}\"><div class=\"seo-card-media\"><img loading=\"lazy\" decoding=\"async\" src=\"${escapeHtml(absolute(origin, episode.posterUrl))}\" alt=\"${escapeHtml(episode.title)}\"><span class=\"card-play\" aria-hidden=\"true\">▶</span><span class=\"watch-progress\" aria-hidden=\"true\" hidden><i></i></span></div><div class=\"seo-card-copy\"><span>${escapeHtml(formatName)} · ${formatDuration(episode.durationSeconds)}</span><h2>${escapeHtml(episode.title)}</h2><strong>Regarder →</strong></div></a></article>`;",
            ),
            (
                "export function absolute(origin, value)",
                "export function formatLabel(programName) { return /hors\\s*norme/i.test(String(programName || '')) ? 'Hors Norme' : 'Concept Libre'; }\nexport function absolute(origin, value)",
            ),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/src/public-render.js",
        [
            (
                "import { bookingLink, bookingUrl, absolute, episodeCard, escapeHtml, isoDuration, isShortEpisode, layout, paragraphs, toList } from './public-layout.js';",
                "import { bookingLink, bookingUrl, absolute, episodeCard, escapeHtml, formatLabel, isoDuration, isShortEpisode, layout, paragraphs, toList } from './public-layout.js';",
            ),
            (
                '<span class="eyebrow">${escapeHtml(program.name)}</span><h1>${escapeHtml(featured.title)}</h1>',
                '<span class="eyebrow">${escapeHtml(formatLabel(program.name))}</span><h1>${escapeHtml(featured.title)}</h1>',
            ),
            (
                '<span class="eyebrow">${escapeHtml(program?.name || \'Neptune Media\')}</span><h1>${escapeHtml(episode.title)}</h1>',
                '<span class="eyebrow">${escapeHtml(formatLabel(program?.name))}</span><h1>${escapeHtml(episode.title)}</h1>',
            ),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/public/landing-conversion.js",
        [
            ("/assets/posters/format-canape-sombre.svg", "/assets/posters/studio-wide.webp"),
            ("/assets/posters/format-plateau-clair.svg", "/assets/posters/concept-libre-wide.webp"),
            ("Regarder le direct 24h/24", "Regarder le direct"),
            ("Antenne 24/24", "Antenne programmée"),
            ("const labels = ['Émissions', 'Les formats', 'Le studio', 'Comment ça se passe', 'Questions'];", "const labels = ['Neptune TV', 'Les formats', 'Le studio', 'Comment ça se passe', 'Questions'];"),
            (
                "      setText('#direct .live-home-head h2', 'Neptune Media diffuse les émissions programmées.');\n      setText('#direct .live-home-head p', 'Les émissions complètes s’enchaînent selon la programmation pilotée depuis le Studio Media. Regardez le direct ou choisissez votre émission.');",
                "      setText('#direct .live-home-head h2', 'Votre expertise peut passer à l’antenne.');\n      setText('#direct .live-home-head p', 'Regardez le direct, puis découvrez le format qui mettra votre histoire ou votre expertise en valeur.');\n      const badge = section.querySelector('.live-badge');\n      if (badge) badge.innerHTML = '<i></i> EN DIRECT';",
            ),
            (
                "      const head = section.querySelector('.section-head');\n      if (head && !head.querySelector('.live-admin-proof')) {\n        const proof = document.createElement('div');\n        proof.className = 'live-admin-proof';\n        proof.innerHTML = '<span>Émissions pilotées depuis le Studio</span><span>Programmation permanente</span><span>Publicités administrables</span>';\n        head.after(proof);\n      }",
                "      section.querySelector('.live-admin-proof')?.remove();",
            ),
            (
                "  function enhanceCatalog() {\n    setText('#a-voir .section-head h2', 'Ce ne sont pas des maquettes. Ce sont de vraies émissions.');\n    setText('#a-voir .section-head p', 'Découvrez les programmes produits par Neptune Media et observez le niveau de préparation, de cadrage, d’écoute et de montage proposé aux invités.');",
                "  function enhanceCatalog() {\n    setText('#a-voir .section-head h2', 'À regarder');\n    const catalogIntro = document.querySelector('#a-voir .section-head > p');\n    if (catalogIntro) catalogIntro.remove();",
            ),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/public/home-live.js",
        [
            (
                "const liveEpisodes = (catalog.episodes || []).filter((item) => item.status === 'published' && item.metadata?.live !== false && (item.metadata?.fullEpisode || String(item.videoUrl || '').startsWith('/media/')));",
                "const liveEpisodes = (catalog.episodes || []).filter((item) => {\n  const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};\n  const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');\n  const duration = Number(item.durationSeconds || 0);\n  const isShort = metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);\n  return !isShort && item.status === 'published' && metadata.live !== false && (metadata.fullEpisode || String(item.videoUrl || '').startsWith('/media/'));\n});",
            ),
            ("link.textContent = 'En direct 24h/24';", "link.textContent = 'En direct';"),
            (
                "section.innerHTML = `<div class=\"container\"><div class=\"section-head live-home-head\"><div><span class=\"live-badge\"><i></i> EN DIRECT · 24H/24</span><h2>La Web TV Neptune est toujours à l’antenne.</h2></div><div><p>Les émissions complètes s’enchaînent automatiquement selon la programmation définie dans le Studio.</p><a class=\"btn btn-secondary\" href=\"/direct/\">Ouvrir la chaîne en plein écran</a></div></div><div class=\"live-channel live-channel-home\" data-live-channel><div class=\"live-stage\"><video data-live-video autoplay muted controls playsinline preload=\"metadata\"></video><div class=\"live-overlay\"><div><span data-live-program>NEPTUNE MEDIA</span><strong data-live-title>Chargement de l’antenne…</strong></div><button type=\"button\" data-live-sound>Activer le son</button></div></div><aside class=\"live-guide\"><div class=\"live-guide-head\"><div><span class=\"eyebrow\">Programme continu</span><h3>À l’antenne</h3></div><button type=\"button\" class=\"btn btn-secondary\" data-live-resync>Reprendre le direct</button></div><div data-live-playlist></div></aside></div></div>`;",
                "section.innerHTML = `<div class=\"container\"><div class=\"section-head live-home-head\"><div><span class=\"live-badge\"><i></i> EN DIRECT</span><h2>Votre expertise peut passer à l’antenne.</h2></div><div><p>Regardez le direct, puis découvrez le format qui mettra votre histoire ou votre expertise en valeur.</p><a class=\"btn btn-secondary\" href=\"/direct/\">Regarder le direct</a></div></div><div class=\"live-channel live-channel-home\" data-live-channel><div class=\"live-stage\"><video data-live-video autoplay muted controls playsinline preload=\"metadata\"></video><div class=\"live-overlay\"><div><span data-live-program>NEPTUNE MEDIA</span><strong data-live-title>Chargement de l’antenne…</strong></div><button type=\"button\" data-live-sound>Activer le son</button></div></div><aside class=\"live-guide\"><div class=\"live-guide-head\"><div><span class=\"eyebrow\">Programme</span><h3>À l’antenne</h3></div><button type=\"button\" class=\"btn btn-secondary\" data-live-resync>Reprendre le direct</button></div><div data-live-playlist></div></aside></div></div>`;",
            ),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/public/app.js",
        [
            (
                "    player?.addEventListener('ended', onEnded);\n    window.addEventListener('pagehide', flushWatchTime);",
                "    player?.addEventListener('ended', onEnded);\n    player?.addEventListener('loadedmetadata', syncModalAspect);\n    window.addEventListener('pagehide', flushWatchTime);",
            ),
            (
                "    state.current = episode;\n    state.thresholds.clear();",
                "    state.current = episode;\n    modal.dataset.mediaKind = isShortEpisode(episode) ? 'short' : 'episode';\n    modal.removeAttribute('data-player-aspect');\n    modal.style.removeProperty('--player-aspect');\n    state.thresholds.clear();",
            ),
            (
                "    modal.classList.remove('is-open');\n    modal.setAttribute('aria-hidden', 'true');",
                "    modal.classList.remove('is-open');\n    modal.removeAttribute('data-media-kind');\n    modal.removeAttribute('data-player-aspect');\n    modal.style.removeProperty('--player-aspect');\n    modal.setAttribute('aria-hidden', 'true');",
            ),
            (
                "  function startContent() {",
                "  function syncModalAspect() {\n    if (!modal || !player || !player.videoWidth || !player.videoHeight) return;\n    const ratio = player.videoWidth / player.videoHeight;\n    modal.dataset.playerAspect = ratio < .92 ? 'portrait' : 'landscape';\n    modal.style.setProperty('--player-aspect', `${player.videoWidth} / ${player.videoHeight}`);\n  }\n\n  function startContent() {",
            ),
            (
                "    const program = programName(episode.programId);\n    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};",
                "    const program = programName(episode.programId);\n    const format = formatLabel(program);\n    const metadata = episode.metadata && typeof episode.metadata === 'object' ? episode.metadata : {};",
            ),
            (
                "data-program=\"${escapeHtml(program)}\" data-search=\"${escapeHtml(search)}\"",
                "data-program=\"${escapeHtml(format)}\" data-search=\"${escapeHtml(search)}\"",
            ),
            (
                "<span>${escapeHtml(program)}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span>",
                "<span>${escapeHtml(format)}</span><span>${escapeHtml(formatDuration(episode.durationSeconds))}</span>",
            ),
            (
                "  function programName(id) { return state.programs.find((program) => program.id === id)?.name || 'Neptune Media'; }",
                "  function programName(id) { return state.programs.find((program) => program.id === id)?.name || 'Neptune Media'; }\n  function formatLabel(name) { return /hors\\s*norme/i.test(String(name || '')) ? 'Hors Norme' : 'Concept Libre'; }",
            ),
            (
                "const liveEpisodes = state.episodes.filter((episode) => episode.metadata?.live !== false && (episode.metadata?.fullEpisode || String(episode.videoUrl || '').startsWith('/media/')));",
                "const liveEpisodes = state.episodes.filter((episode) => !isShortEpisode(episode) && episode.metadata?.live !== false && (episode.metadata?.fullEpisode || String(episode.videoUrl || '').startsWith('/media/')));",
            ),
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/src/public-router.js",
        [
            ("/landing-conversion.css?v=2", "/landing-conversion.css?v=3"),
            ("/landing-conversion.js?v=2", "/landing-conversion.js?v=3"),
        ],
    )
    append_once(
        "neptune-tv-media-cloudflare/public/styles/neptune-streaming.css",
        "Premium adaptive modal v8",
        r'''
/* Premium adaptive modal v8: format-aware player, minimal chrome, no stretched media. */
.video-modal { overflow-y:auto; overscroll-behavior:contain; padding:clamp(14px,2.5vw,34px); background:rgba(1,4,12,.94); backdrop-filter:blur(22px) saturate(125%); }
.video-modal .modal-frame { width:min(1120px,calc(100vw - 56px)); max-height:none; display:grid; justify-items:center; gap:12px; padding:0; }
.video-modal .modal-frame video { display:block; width:100%; height:auto; aspect-ratio:var(--player-aspect,16/9); max-height:calc(100dvh - 150px); object-fit:contain; object-position:center; border:1px solid rgba(169,221,255,.28); border-radius:22px; background:#000; box-shadow:0 30px 90px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.04); }
.video-modal[data-player-aspect="portrait"] .modal-frame,.video-modal[data-media-kind="short"] .modal-frame { width:min(440px,calc(100vw - 32px)); }
.video-modal[data-player-aspect="portrait"] .modal-frame video,.video-modal[data-media-kind="short"] .modal-frame video { aspect-ratio:var(--player-aspect,9/16); max-height:calc(100dvh - 116px); }
.video-modal[data-player-aspect="landscape"] .modal-frame,.video-modal[data-media-kind="episode"] .modal-frame { width:min(1120px,calc(100vw - 56px)); }
.video-modal .modal-close { top:-18px; right:-18px; width:48px; height:48px; border-color:rgba(255,255,255,.2); background:rgba(8,17,38,.94); box-shadow:0 12px 32px rgba(0,0,0,.35); backdrop-filter:blur(14px); }
.video-modal .modal-caption { max-width:min(760px,90vw); margin:0; color:#dbe7f7; font-size:.86rem; line-height:1.35; text-align:center; }
.video-modal .caption-notice,.video-modal .media-error,.video-modal .transcript-panel { width:min(760px,100%); margin:0; border-radius:15px; }
.video-modal .caption-notice { padding:12px 16px; border:1px solid rgba(172,193,228,.14); background:rgba(8,17,38,.72); color:#a8b5cc; font-size:.78rem; text-align:center; }
.video-modal .modal-ad-label { top:14px; left:14px; }.video-modal .modal-skip { top:14px; right:14px; } body.modal-open { overflow:hidden; }
@media(max-width:760px){.video-modal{place-items:start center;padding:12px}.video-modal .modal-frame,.video-modal[data-player-aspect="landscape"] .modal-frame,.video-modal[data-media-kind="episode"] .modal-frame{width:100%}.video-modal[data-player-aspect="portrait"] .modal-frame,.video-modal[data-media-kind="short"] .modal-frame{width:min(420px,100%)}.video-modal .modal-frame video{max-height:calc(100dvh - 120px);border-radius:17px}.video-modal .modal-close{position:fixed;top:12px;right:12px;width:44px;height:44px}.video-modal .modal-caption{padding-inline:42px}.video-modal .caption-notice{padding:10px 12px}}
''',
    )
    append_once(
        "neptune-tv-media-cloudflare/public/styles/neptune-streaming.css",
        "Compact shorts and avatar-first headings v9",
        r'''
/* Compact shorts and avatar-first headings v9. */
[data-home-structure="streaming-aida-v3"] .hero-copy h1{max-width:660px;font-size:clamp(2.75rem,4.4vw,4.65rem);line-height:.96}
.section-head h2,.desire-hero h2,.interest-copy h2,.faq-intro h2,.cta-card h2{font-size:clamp(2.05rem,3.8vw,3.75rem);line-height:.98}
.home-live-section .live-home-head h2{max-width:13ch;font-size:clamp(2.25rem,4vw,4rem);line-height:.96}.home-live-section .live-home-head{align-items:end}.home-live-section .live-home-head>div:last-child{max-width:520px}.home-live-section .live-home-head p{color:var(--neptune-muted);font-size:clamp(.95rem,1.25vw,1.08rem);line-height:1.55}
body[data-public-ux="streaming-v3"] .seo-hero h1,body[data-public-ux="streaming-v3"] .info-page h1,body[data-public-ux="streaming-v3"] .episode-copy h1,.program-feature-copy h1{font-size:clamp(2.2rem,4.2vw,3.9rem);line-height:.98}
[data-render-media="v7"] #shortsCatalog{display:flex;flex-wrap:nowrap;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:inline mandatory;scrollbar-width:none;padding:4px 2px 12px}[data-render-media="v7"] #shortsCatalog::-webkit-scrollbar{display:none}[data-render-media="v7"] #shortsCatalog .media-card--short{flex:0 0 clamp(92px,8vw,116px);width:clamp(92px,8vw,116px);aspect-ratio:9/16;scroll-snap-align:start;border-radius:14px}[data-render-media="v7"] #shortsCatalog .media-card-copy{left:6px;right:6px;bottom:6px;padding:7px;border-radius:9px}[data-render-media="v7"] #shortsCatalog .media-card-meta{font-size:.48rem}[data-render-media="v7"] #shortsCatalog .media-card h3{font-size:.68rem;line-height:1.1}[data-render-media="v7"] #shortsCatalog .card-play{width:30px;height:30px;top:7px;right:7px;font-size:.72rem}
body[data-public-ux="streaming-v3"] .seo-grid-shorts{display:flex;flex-wrap:nowrap;gap:12px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:inline mandatory;scrollbar-width:none;padding:4px 2px 12px}body[data-public-ux="streaming-v3"] .seo-grid-shorts::-webkit-scrollbar{display:none}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card{flex:0 0 clamp(104px,9vw,132px);width:clamp(104px,9vw,132px);scroll-snap-align:start;border-radius:14px}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card-copy{padding:8px}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card-copy span{font-size:.55rem}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card-copy h2{margin:5px 0 0;font-size:.72rem;line-height:1.12}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card-copy strong{display:none}
@media(max-width:760px){[data-home-structure="streaming-aida-v3"] .hero-copy h1{font-size:clamp(2.45rem,11vw,3.6rem)}.section-head h2,.desire-hero h2,.interest-copy h2,.faq-intro h2,.cta-card h2{font-size:clamp(2rem,9.5vw,3rem)}.home-live-section .live-home-head h2{max-width:15ch;font-size:clamp(2.1rem,10vw,3.2rem)}[data-render-media="v7"] #shortsCatalog .media-card--short{flex-basis:94px;width:94px}body[data-public-ux="streaming-v3"] .seo-grid-shorts .seo-card{flex-basis:108px;width:108px}}
''',
    )
    print("Applied Neptune media layout, compact shorts, format classification and heading fix v9")


if __name__ == "__main__":
    main()
