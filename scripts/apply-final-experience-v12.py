from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = ROOT / "neptune-tv-media-cloudflare"
PUBLIC = APP_ROOT / "public"
INDEX = PUBLIC / "index.html"
LAYOUT = APP_ROOT / "src" / "public-layout.js"
ROUTER = APP_ROOT / "src" / "public-router.js"
PACKAGE = APP_ROOT / "package.json"
FINAL_CSS = PUBLIC / "styles" / "final-experience-v12.css"
FINAL_JS = PUBLIC / "final-experience-v12.js"

CSS_LINK = '<link rel="stylesheet" href="/styles/final-experience-v12.css?v=1">'
JS_LINK = '<script src="/final-experience-v12.js?v=1" defer></script>'

PIPELINE = '''      <div class="production-pipeline" aria-label="Une intervention devient un système de contenus selon l’offre choisie">
        <div><small>Vous venez avec</small><strong>Une vraie conversation</strong></div>
        <span aria-hidden="true">→</span>
        <div><small>Neptune construit</small><strong>Une émission qui se regarde</strong></div>
        <span aria-hidden="true">→</span>
        <div><small>Selon l’offre</small><strong>Des contenus prêts à utiliser</strong></div>
      </div>'''

RECOMMENDATION = '''      <div class="format-recommendation" data-format-recommendation aria-live="polite">
        <div class="format-recommendation-copy"><span>Votre point de départ</span><strong data-format-result>Choisissez ce que votre audience doit comprendre.</strong><p data-format-result-copy>Votre histoire oriente vers Hors Norme. Une offre, une démonstration ou un lancement oriente vers Concept Libre.</p></div>
        <a class="btn btn-primary" data-funnel data-track="formats_compare" data-format-booking href="https://media.neptunebusiness.com/">Comparer les offres et les créneaux</a>
      </div>
      <p class="format-conditions">Tarifs, livrables, délais, droits et conditions visibles avant confirmation.</p>'''


def require_assets() -> None:
    for path in (FINAL_CSS, FINAL_JS):
        if not path.exists():
            raise RuntimeError(f"Missing final experience asset: {path}")


def patch_homepage() -> None:
    html = INDEX.read_text(encoding="utf-8")
    if 'data-final-ux="v12"' not in html:
        html = html.replace('data-home-structure="conversion-voice-v10"', 'data-home-structure="conversion-voice-v10" data-final-ux="v12"', 1)

    hors_anchor = '<article class="format-card format-card--voice"><img src="/assets/posters/studio-wide.webp"'
    hors_replacement = '<article class="format-card format-card--voice" data-format-choice data-format="horsnorme" role="button" tabindex="0" aria-pressed="false"><img src="/assets/posters/studio-wide.webp"'
    if 'data-format="horsnorme"' not in html:
        if hors_anchor not in html:
            raise RuntimeError("Could not prepare Hors Norme decision card")
        html = html.replace(hors_anchor, hors_replacement, 1)

    libre_anchor = '<article class="format-card format-card--voice"><img src="/assets/posters/concept-libre-wide.webp"'
    libre_replacement = '<article class="format-card format-card--voice" data-format-choice data-format="libre" role="button" tabindex="0" aria-pressed="false"><img src="/assets/posters/concept-libre-wide.webp"'
    if 'data-format="libre"' not in html:
        if libre_anchor not in html:
            raise RuntimeError("Could not prepare Concept Libre decision card")
        html = html.replace(libre_anchor, libre_replacement, 1)

    pipeline_anchor = '        <article><img src="/assets/posters/poster-storytelling.webp" alt="Échange éditorial Neptune" loading="lazy" decoding="async"><div><small>Après</small><h3>Neptune prend en charge la production.</h3></div></article>\n      </div>'
    if 'production-pipeline' not in html:
        if pipeline_anchor not in html:
            raise RuntimeError("Could not insert the production pipeline")
        html = html.replace(pipeline_anchor, pipeline_anchor + '\n' + PIPELINE, 1)

    old_actions = '      <div class="format-compare-actions"><a class="btn btn-primary" data-funnel data-track="formats_compare" href="https://media.neptunebusiness.com/">Comparer les offres et les créneaux</a><p>Tarifs, livrables, délais, droits et conditions visibles avant confirmation.</p></div>'
    if 'data-format-recommendation' not in html:
        if old_actions not in html:
            raise RuntimeError("Could not replace the format comparison action")
        html = html.replace(old_actions, RECOMMENDATION, 1)

    if CSS_LINK not in html:
        html = html.replace('</head>', f'  {CSS_LINK}\n</head>', 1)
    if JS_LINK not in html:
        html = html.replace('</body>', f'{JS_LINK}\n</body>', 1)
    INDEX.write_text(html, encoding="utf-8")


def patch_public_layout() -> None:
    source = LAYOUT.read_text(encoding="utf-8")
    if CSS_LINK not in source:
        source = source.replace('<link rel="stylesheet" href="/styles/visual-polish-v11.css?v=3">', '<link rel="stylesheet" href="/styles/visual-polish-v11.css?v=3">' + CSS_LINK, 1)
    if JS_LINK not in source:
        source = source.replace('<script src="/visual-polish-v11.js?v=3" defer></script>', '<script src="/visual-polish-v11.js?v=3" defer></script>' + JS_LINK, 1)
    source = source.replace('<body data-public-ux="streaming-v3" data-density="streaming">', '<body data-public-ux="streaming-v3" data-density="streaming" data-final-ux="v12">', 1)
    LAYOUT.write_text(source, encoding="utf-8")


def patch_router() -> None:
    source = ROUTER.read_text(encoding="utf-8")
    anchor = "  if (!body.includes(script)) body = body.replace(marker, `${extraScripts}<script src=\"${script}\"></script>${marker}${mode === 'public' ? '<script src=\"/visual-polish-v11.js?v=3\"></script>' : ''}`);"
    addition = anchor + "\n  if (mode === 'public') {\n    body = body.replaceAll('<link rel=\"stylesheet\" href=\"/styles/final-experience-v12.css?v=1\">', '');\n    body = body.replace('</head>', '<link rel=\"stylesheet\" href=\"/styles/final-experience-v12.css?v=1\"></head>');\n    body = body.replaceAll('<script src=\"/final-experience-v12.js?v=1\" defer></script>', '');\n    body = body.replace('</body>', '<script src=\"/final-experience-v12.js?v=1\" defer></script></body>');\n  }"
    if "body.replaceAll('<link rel=\"stylesheet\" href=\"/styles/final-experience-v12.css" not in source:
        if anchor not in source:
            raise RuntimeError("Could not add final public assets to the HTML enhancer")
        source = source.replace(anchor, addition, 1)
    ROUTER.write_text(source, encoding="utf-8")


def patch_package() -> None:
    package = json.loads(PACKAGE.read_text(encoding="utf-8"))
    check = package.get("scripts", {}).get("check", "")
    additions = [
        "node --check public/final-experience-v12.js",
        "node --check scripts/qa-production-ui.mjs",
    ]
    for addition in additions:
        if addition not in check:
            check = f"{check} && {addition}" if check else addition
    package.setdefault("scripts", {})["check"] = check
    PACKAGE.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    require_assets()
    patch_homepage()
    patch_public_layout()
    patch_router()
    patch_package()
    print("Applied Neptune final experience v12")


if __name__ == "__main__":
    main()
