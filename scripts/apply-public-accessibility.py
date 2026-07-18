from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "neptune-tv-media-cloudflare" / "public"
INDEX = PUBLIC / "index.html"
APP = PUBLIC / "app.js"
PACKAGE = ROOT / "neptune-tv-media-cloudflare" / "package.json"
MARKER = 'data-a11y-version="2026-07-18"'


def replace_required(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Accessibility patch anchor missing: {label}")
    return text.replace(old, new, 1)


def patch_html() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if MARKER in html:
        print("Public accessibility HTML already applied")
        return

    html = replace_required(
        html,
        '<link rel="stylesheet" href="/style.css">',
        '<link rel="stylesheet" href="/style.css">\n  <link rel="stylesheet" href="/styles/accessibility.css">',
        "accessibility stylesheet",
    )
    html = replace_required(
        html,
        '<body>',
        f'<body {MARKER}>\n<a class="skip-link" href="#main-content">Aller au contenu principal</a>',
        "body marker and skip link",
    )
    html = replace_required(
        html,
        '<nav class="nav" data-nav aria-label="Navigation principale">',
        '<nav id="primary-navigation" class="nav" data-nav aria-label="Navigation principale">',
        "navigation id",
    )
    html = replace_required(
        html,
        '<button class="menu-toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" data-menu-toggle><span></span></button>',
        '<button class="menu-toggle" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="primary-navigation" data-menu-toggle><span aria-hidden="true"></span></button>',
        "menu relationships",
    )
    html = replace_required(
        html,
        '<main>',
        '<main id="main-content" tabindex="-1">',
        "main landmark target",
    )
    html = replace_required(
        html,
        '<video id="heroPreview" data-autoplay autoplay muted loop playsinline preload="metadata" poster="/assets/posters/poster-neptune-media.webp">',
        '<video id="heroPreview" data-autoplay muted loop playsinline preload="metadata" poster="/assets/posters/poster-neptune-media.webp" aria-hidden="true" tabindex="-1">',
        "reduced-motion-safe hero video",
    )
    html = replace_required(
        html,
        '<div class="hero-media-top"><span class="live-label">À l\'antenne</span><span class="real-label">Extrait réel</span></div>',
        '<div class="hero-media-top"><span class="live-label">À l\'antenne</span><span class="real-label">Extrait réel</span></div>\n          <button class="motion-toggle" id="heroMotionToggle" type="button" aria-pressed="false">Mettre l’aperçu en pause</button>',
        "hero motion control",
    )
    html = html.replace('<span class="play-dot">▶</span>', '<span class="play-dot" aria-hidden="true">▶</span>')
    html = html.replace('<span class="card-play">▶</span>', '<span class="card-play" aria-hidden="true">▶</span>')
    html = replace_required(
        html,
        '<div class="video-grid" id="dynamicCatalog" aria-live="polite">',
        '<p id="catalogStatus" class="sr-only" role="status" aria-live="polite"></p>\n      <div id="catalogError" class="catalog-error" role="alert" hidden>\n        Le catalogue dynamique n’a pas pu être chargé. Les extraits disponibles sur la page restent accessibles.\n        <button id="catalogRetry" type="button">Réessayer</button>\n      </div>\n      <div class="video-grid" id="dynamicCatalog" aria-busy="true">',
        "catalog status region",
    )
    html = replace_required(
        html,
        '<div class="format-card-actions">\n              <a class="btn btn-dark" href="#formats">Découvrir Hors Norme</a>\n              <a class="btn btn-secondary" data-funnel data-format="horsnorme" data-track="home_horsnorme_reservation" href="https://media.neptunebusiness.com/">Voir l\'offre officielle</a>\n            </div>',
        '<div class="format-card-actions">\n              <a class="btn btn-dark" data-funnel data-format="horsnorme" data-track="home_horsnorme_reservation" href="https://media.neptunebusiness.com/">Découvrir et réserver Hors Norme</a>\n            </div>',
        "Hors Norme call to action",
    )
    html = replace_required(
        html,
        '<div class="format-card-actions">\n              <a class="btn btn-dark" href="#formats">Découvrir Concept Libre</a>\n              <a class="btn btn-secondary" data-funnel data-format="libre" data-track="home_libre_reservation" href="https://media.neptunebusiness.com/">Voir l\'offre officielle</a>\n            </div>',
        '<div class="format-card-actions">\n              <a class="btn btn-dark" data-funnel data-format="libre" data-track="home_libre_reservation" href="https://media.neptunebusiness.com/">Découvrir et réserver Concept Libre</a>\n            </div>',
        "Concept Libre call to action",
    )

    faq_pattern = re.compile(
        r'<article class="faq-item" data-faq><button type="button" aria-expanded="false"><span>(.*?)</span><span>\+</span></button><div class="faq-answer"><div><p>(.*?)</p></div></div></article>'
    )
    faq_counter = 0

    def replace_faq(match: re.Match[str]) -> str:
        nonlocal faq_counter
        faq_counter += 1
        question, answer = match.group(1), match.group(2)
        return (
            f'<article class="faq-item" data-faq>\n'
            f'          <button id="faq-button-{faq_counter}" type="button" aria-expanded="false" aria-controls="faq-answer-{faq_counter}">'
            f'<span>{question}</span><span aria-hidden="true">+</span></button>\n'
            f'          <div id="faq-answer-{faq_counter}" class="faq-answer" role="region" aria-labelledby="faq-button-{faq_counter}" hidden><div><p>{answer}</p></div></div>\n'
            f'        </article>'
        )

    html, faq_count = faq_pattern.subn(replace_faq, html)
    if faq_count != 4:
        raise RuntimeError(f"Expected 4 FAQ entries, patched {faq_count}")

    old_modal = '''<div class="video-modal" data-video-modal aria-hidden="true" role="dialog" aria-modal="true" aria-label="Lecteur vidéo">
  <div class="modal-frame">
    <button class="modal-close" type="button" data-video-close aria-label="Fermer la vidéo">×</button>
    <span class="modal-ad-label" id="modalAdLabel" hidden>PUBLICITÉ</span><button class="modal-skip" id="modalSkip" hidden>Passer dans <span>5</span>s</button><video controls playsinline preload="metadata"></video>
    <p class="modal-caption" data-video-title>Extrait Neptune Media</p>
  </div>
</div>
<script src="/app.js"></script>'''
    new_modal = '''<div class="video-modal" data-video-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
  <div class="modal-frame" role="document">
    <button class="modal-close" type="button" data-video-close aria-label="Fermer la vidéo">×</button>
    <span class="modal-ad-label" id="modalAdLabel" hidden>PUBLICITÉ</span>
    <button class="modal-skip" id="modalSkip" type="button" hidden>Passer dans <span>5</span>s</button>
    <video controls playsinline preload="metadata" aria-describedby="video-modal-help captionNotice"></video>
    <p class="modal-caption" id="video-modal-title" data-video-title>Extrait Neptune Media</p>
    <p id="video-modal-help" class="sr-only">Utilisez les contrôles natifs du lecteur. Appuyez sur Échap pour fermer la fenêtre.</p>
    <div id="mediaError" class="media-error" role="alert" hidden><span data-error-text></span><br><button id="mediaRetry" type="button">Réessayer la lecture</button></div>
    <p id="captionNotice" class="caption-notice" role="status">Vérification des sous-titres…</p>
    <details id="transcriptPanel" class="transcript-panel" hidden><summary>Lire la transcription</summary><p id="transcriptText"></p></details>
  </div>
</div>
<script src="/app.js"></script>
<script src="/accessibility.js"></script>'''
    html = replace_required(html, old_modal, new_modal, "accessible video modal")
    INDEX.write_text(html, encoding="utf-8")
    print("Applied public accessibility HTML")


def patch_app() -> None:
    app = APP.read_text(encoding="utf-8")
    marker = "neptune:episode-opened"
    if marker in app:
        print("Public accessibility JavaScript hooks already applied")
        return

    app = replace_required(
        app,
        "      renderCatalog();\n      state.episodes.forEach((episode) => track('impression', { episodeId: episode.id }));",
        "      renderCatalog();\n      window.dispatchEvent(new CustomEvent('neptune:catalog-ready', { detail: { count: state.episodes.length } }));\n      state.episodes.forEach((episode) => track('impression', { episodeId: episode.id }));",
        "catalog ready event",
    )
    app = replace_required(
        app,
        "      console.error(error);\n      bindFallbackVideos();",
        "      console.error(error);\n      bindFallbackVideos();\n      window.dispatchEvent(new CustomEvent('neptune:catalog-error'));",
        "catalog error event",
    )
    app = replace_required(
        app,
        "      heroVideo.play().catch(() => {});",
        "      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) heroVideo.play().catch(() => {});",
        "hero reduced motion",
    )
    app = app.replace('<span class="card-play">▶</span>', '<span class="card-play" aria-hidden="true">▶</span>')
    app = replace_required(
        app,
        "          posterUrl: trigger.dataset.videoPoster || '',\n          programId: '',",
        "          posterUrl: trigger.dataset.videoPoster || '',\n          captionsUrl: trigger.dataset.captionsSrc || '',\n          transcript: trigger.dataset.transcript || '',\n          programId: '',",
        "fallback caption metadata",
    )
    app = replace_required(
        app,
        "    closeButton?.focus();\n  }",
        "    closeButton?.focus();\n    window.dispatchEvent(new CustomEvent('neptune:episode-opened', { detail: { episode } }));\n  }",
        "episode opened event",
    )
    APP.write_text(app, encoding="utf-8")
    print("Applied public accessibility JavaScript hooks")


def patch_package() -> None:
    package = json.loads(PACKAGE.read_text(encoding="utf-8"))
    check = package.get("scripts", {}).get("check", "")
    addition = "node --check public/accessibility.js"
    if addition not in check:
        package["scripts"]["check"] = f"{check} && {addition}" if check else addition
        PACKAGE.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Added accessibility JavaScript validation")
    else:
        print("Accessibility JavaScript validation already present")


if __name__ == "__main__":
    patch_html()
    patch_app()
    patch_package()
