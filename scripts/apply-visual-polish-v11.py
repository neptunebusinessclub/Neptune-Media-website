from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "neptune-tv-media-cloudflare" / "public"
INDEX = PUBLIC / "index.html"
LAYOUT = ROOT / "neptune-tv-media-cloudflare" / "src" / "public-layout.js"
APP = PUBLIC / "app.js"
UPGRADE = PUBLIC / "upgrade.js"
UX = PUBLIC / "ux-aida.js"
STREAMING_CSS = PUBLIC / "styles" / "neptune-streaming.css"

CSS = r'''/* Visual QA polish v11: screenshot-verified hierarchy, compact flow and responsive hero. */
body[data-home-structure="conversion-voice-v10"] .voice-hero{padding-top:clamp(64px,7vw,104px);padding-bottom:clamp(52px,6vw,82px)}
body[data-home-structure="conversion-voice-v10"] .hero-grid{gap:clamp(34px,5vw,72px)}
body[data-home-structure="conversion-voice-v10"] .hero-copy h1{max-width:700px;padding-bottom:.08em;font-size:clamp(2.7rem,4.35vw,4.75rem);line-height:.96}
body[data-home-structure="conversion-voice-v10"] .hero-media-wrap{width:100%;max-width:760px;justify-self:end;align-self:center}
body[data-home-structure="conversion-voice-v10"] .hero-media{width:100%;max-width:760px;aspect-ratio:16/9}
body[data-home-structure="conversion-voice-v10"] .hero-media video{object-fit:cover;object-position:center}
body[data-home-structure="conversion-voice-v10"] .hero-media-copy h2{max-width:26ch;font-size:clamp(1.15rem,1.6vw,1.55rem)}
body[data-home-structure="conversion-voice-v10"] .proof-by-content{padding-top:clamp(64px,7vw,92px);padding-bottom:clamp(68px,7vw,98px)}
body[data-home-structure="conversion-voice-v10"] .inner-voice-section,
body[data-home-structure="conversion-voice-v10"] .voice-solution,
body[data-home-structure="conversion-voice-v10"] .format-choice-section,
body[data-home-structure="conversion-voice-v10"] .experience-voice,
body[data-home-structure="conversion-voice-v10"] .faq-voice,
body[data-home-structure="conversion-voice-v10"] .voice-final{padding-block:clamp(70px,7vw,104px)}
body[data-home-structure="conversion-voice-v10"] .voice-section-head,
body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head,
body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head{display:block;max-width:980px;margin-bottom:32px}
body[data-home-structure="conversion-voice-v10"] .voice-section-head>div,
body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head>div,
body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head>div{max-width:none}
body[data-home-structure="conversion-voice-v10"] .voice-section-head h2,
body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head h2,
body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head h2{max-width:23ch;padding-bottom:.08em;font-size:clamp(2.25rem,3.45vw,3.9rem);line-height:.98;letter-spacing:-.05em}
body[data-home-structure="conversion-voice-v10"] .voice-solution .desire-hero h2{max-width:760px;padding-bottom:.08em;font-size:clamp(2.3rem,3.8vw,4.1rem);line-height:.98}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card{min-height:235px}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card blockquote{font-size:clamp(1.32rem,1.9vw,1.88rem)}
body[data-home-structure="conversion-voice-v10"] .solution-voice-grid{margin-top:30px}
body[data-home-structure="conversion-voice-v10"] .proof-compact{margin-top:24px}
body[data-home-structure="conversion-voice-v10"] .faq-layout{grid-template-columns:minmax(280px,.72fr) minmax(0,1.28fr);gap:clamp(28px,5vw,64px)}
body[data-home-structure="conversion-voice-v10"] .faq-intro h2{max-width:15ch;padding-bottom:.08em;font-size:clamp(2.15rem,3.1vw,3.5rem);line-height:.98;letter-spacing:-.05em}
body[data-home-structure="conversion-voice-v10"] .voice-final h2{max-width:820px;padding-bottom:.08em;font-size:clamp(2.35rem,4.1vw,4.25rem);line-height:.98}
body[data-home-structure="conversion-voice-v10"] .voice-final .cta-card{padding:clamp(34px,5vw,62px)}
body[data-emissions-search-enhanced="1"] .catalogue-page>.program-pills{display:none!important}
body[data-emissions-search-enhanced="1"] .seo-search-panel{margin-top:4px}
@media(max-width:1080px) and (min-width:761px){body[data-home-structure="conversion-voice-v10"] .hero-grid{grid-template-columns:1fr;max-width:900px}body[data-home-structure="conversion-voice-v10"] .hero-copy{text-align:center}body[data-home-structure="conversion-voice-v10"] .inner-voice-hook{margin-inline:auto}body[data-home-structure="conversion-voice-v10"] .hero-actions,body[data-home-structure="conversion-voice-v10"] .hero-meta{justify-content:center}body[data-home-structure="conversion-voice-v10"] .hero-media-wrap{justify-self:center;margin-top:4px}body[data-home-structure="conversion-voice-v10"] .voice-proof-strip{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:900px){body[data-home-structure="conversion-voice-v10"] .faq-layout{grid-template-columns:1fr}body[data-home-structure="conversion-voice-v10"] .faq-intro h2{max-width:20ch}body[data-home-structure="conversion-voice-v10"] .voice-section-head h2,body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head h2,body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head h2{max-width:24ch}}
@media(max-width:760px){body[data-home-structure="conversion-voice-v10"] .voice-hero{padding-top:48px;padding-bottom:54px}body[data-home-structure="conversion-voice-v10"] .hero-grid{gap:28px}body[data-home-structure="conversion-voice-v10"] .hero-copy h1{max-width:340px;margin-inline:auto;font-size:clamp(2.45rem,11vw,3.35rem)}body[data-home-structure="conversion-voice-v10"] .hero-subtitle{font-size:.98rem;line-height:1.58}body[data-home-structure="conversion-voice-v10"] .hero-media-wrap{margin-top:0}body[data-home-structure="conversion-voice-v10"] .hero-media{border-radius:20px}body[data-home-structure="conversion-voice-v10"] .hero-media-copy h2{font-size:1.05rem}body[data-home-structure="conversion-voice-v10"] .inner-voice-section,body[data-home-structure="conversion-voice-v10"] .voice-solution,body[data-home-structure="conversion-voice-v10"] .format-choice-section,body[data-home-structure="conversion-voice-v10"] .experience-voice,body[data-home-structure="conversion-voice-v10"] .faq-voice,body[data-home-structure="conversion-voice-v10"] .voice-final{padding-block:58px}body[data-home-structure="conversion-voice-v10"] .voice-section-head,body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head,body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head{margin-bottom:24px}body[data-home-structure="conversion-voice-v10"] .voice-section-head h2,body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head h2,body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head h2,body[data-home-structure="conversion-voice-v10"] .voice-solution .desire-hero h2{font-size:clamp(2rem,8.8vw,2.85rem);line-height:1}body[data-home-structure="conversion-voice-v10"] .faq-intro h2{font-size:clamp(2rem,8.5vw,2.75rem)}body[data-home-structure="conversion-voice-v10"] .voice-final h2{font-size:clamp(2.15rem,9vw,3rem)}body[data-home-structure="conversion-voice-v10"] .voice-proof-strip>div{text-align:left;padding-inline:24px}}
/* End visual QA polish v11 */'''


def bump_stylesheet(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'/styles/neptune-streaming\.css\?v=\d+', '/styles/neptune-streaming.css?v=11', text)
    path.write_text(text, encoding="utf-8")


def patch_app() -> None:
    text = APP.read_text(encoding="utf-8")
    old = "  function renderHero() {\n    const episode = state.episodes[0];"
    new = "  function renderHero() {\n    const episode = state.episodes.find((item) => !isShortEpisode(item)) || state.episodes[0];"
    if new not in text:
        if old not in text:
            raise RuntimeError("Could not update hero episode selection")
        text = text.replace(old, new, 1)
    APP.write_text(text, encoding="utf-8")


def patch_upgrade() -> None:
    text = UPGRADE.read_text(encoding="utf-8")
    old = "  const isStreamingHome = () => document.body?.matches('[data-home-structure=\"streaming-aida-v3\"]');"
    new = "  const isStreamingHome = () => document.body?.matches('[data-home-structure=\"streaming-aida-v3\"], [data-home-structure=\"conversion-voice-v10\"]');"
    if new not in text:
        if old not in text:
            raise RuntimeError("Could not update curated homepage detection")
        text = text.replace(old, new, 1)
    UPGRADE.write_text(text, encoding="utf-8")


def patch_ux() -> None:
    text = UX.read_text(encoding="utf-8")
    anchor = "    document.body.dataset.emissionsSearchEnhanced = '1';"
    addition = "    document.body.dataset.emissionsSearchEnhanced = '1';\n    q('.catalogue-page > .program-pills')?.remove();"
    if addition not in text:
        if anchor not in text:
            raise RuntimeError("Could not normalize emissions filters")
        text = text.replace(anchor, addition, 1)
    UX.write_text(text, encoding="utf-8")


def patch_css() -> None:
    text = STREAMING_CSS.read_text(encoding="utf-8")
    text = re.sub(r'/\* Visual QA polish v11:.*?/\* End visual QA polish v11 \*/\s*', '', text, flags=re.S)
    STREAMING_CSS.write_text(text.rstrip() + "\n\n" + CSS + "\n", encoding="utf-8")


def main() -> None:
    bump_stylesheet(INDEX)
    bump_stylesheet(LAYOUT)
    patch_app()
    patch_upgrade()
    patch_ux()
    patch_css()
    print("Applied screenshot-driven Neptune visual polish v11")


if __name__ == "__main__":
    main()
