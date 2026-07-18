from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def save(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"Missing v5 anchor: {label}")
    return text.replace(old, new, 1)


def patch_index() -> None:
    path = "neptune-tv-media-cloudflare/public/index.html"
    text = load(path)
    text = text.replace('<article class="hero-media" data-loading="true">', '<article class="hero-media">', 1)
    text = text.replace('        <div class="hero-actions">', '        <div class="hero-actions">', 1)
    text = text.replace('                <div class="hero-actions">', '        <div class="hero-actions">', 1)
    save(path, text)


def patch_app() -> None:
    path = "neptune-tv-media-cloudflare/public/app.js"
    text = load(path)
    text = text.replace('  bindAutoplay();\n  bootstrapCatalog();', '  bootstrapCatalog();', 1)
    text = text.replace('      renderHero();\n      renderCatalog();', '      renderHero();\n      bindAutoplay();\n      renderCatalog();', 1)
    old_preview = '''      if (heroSource.dataset.src && canAutoPreview()) {
        state.heroPreviewTimer = window.setTimeout(() => loadHeroPreview(true), 900);
      } else {
        setHeroLoading(false);
      }'''
    new_preview = '''      setHeroLoading(false);
      if (heroSource.dataset.src) scheduleHeroPreview();'''
    text = replace_once(text, old_preview, new_preview, "delayed hero preview")
    anchor = '''  function loadHeroPreview(autoplay = false) {
'''
    schedule = '''  function heroPreviewIsVisible(video = qs('#heroPreview')) {
    if (!video || document.hidden) return false;
    const rect = video.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  function scheduleHeroPreview() {
    clearTimeout(state.heroPreviewTimer);
    if (!canAutoPreview() || !heroPreviewIsVisible()) return;
    state.heroPreviewTimer = window.setTimeout(() => {
      if (heroPreviewIsVisible()) loadHeroPreview(true);
    }, 900);
  }

  function loadHeroPreview(autoplay = false) {
'''
    text = replace_once(text, anchor, schedule, "hero preview scheduler")
    pattern = re.compile(r'''  function bindAutoplay\(\) \{.*?\n  \}\n\n  function openEpisode''', re.S)
    replacement = '''  function bindAutoplay() {
    if (!('IntersectionObserver' in window)) {
      scheduleHeroPreview();
      return;
    }
    const heroVideo = qs('#heroPreview');
    if (!heroVideo || heroVideo.dataset.previewObserved) return;
    heroVideo.dataset.previewObserved = '1';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          if (state.heroPreviewLoaded && canAutoPreview()) video.play().catch(() => {});
          else scheduleHeroPreview();
        } else {
          clearTimeout(state.heroPreviewTimer);
          video.pause();
        }
      });
    }, { threshold: 0.45 });
    observer.observe(heroVideo);
  }

  function openEpisode'''
    if pattern.search(text):
        text = pattern.sub(replacement, text, count=1)
    elif 'heroVideo.dataset.previewObserved' not in text:
        raise RuntimeError("Missing v5 anchor: autoplay observer")
    text = text.replace("    if (state.heroPreviewLoaded && canAutoPreview()) {\n      window.setTimeout(() => qs('#heroPreview')?.play().catch(() => {}), 180);\n    }", "    if (state.heroPreviewLoaded && canAutoPreview() && heroPreviewIsVisible()) {\n      window.setTimeout(() => qs('#heroPreview')?.play().catch(() => {}), 180);\n    }")
    save(path, text)


def patch_ux() -> None:
    path = "neptune-tv-media-cloudflare/public/ux-aida.js"
    text = load(path)
    text = text.replace("`${visible} résultat${visible > 1 ? 's' : ''}` : `${visible} nouveauté${visible > 1 ? 's' : ''}`", "`${visible} résultat${visible !== 1 ? 's' : ''}` : `${visible} nouveauté${visible !== 1 ? 's' : ''}`")
    text = text.replace("result.textContent = `${visible} résultat${visible > 1 ? 's' : ''}`;", "result.textContent = `${visible} résultat${visible !== 1 ? 's' : ''}`;")
    old = '''      if (reset) reset.hidden = !filtered;
      if (empty) empty.hidden = visible !== 0;
      grid.scrollTo({ left: 0, behavior: motionBehavior() });'''
    new = '''      if (reset) reset.hidden = !filtered;
      if (empty) empty.hidden = visible !== 0;
      const railShell = q('[data-content-rail]');
      if (railShell) railShell.hidden = visible === 0;
      grid.scrollTo({ left: 0, behavior: motionBehavior() });'''
    text = replace_once(text, old, new, "home empty rail")
    save(path, text)


def patch_css() -> None:
    path = "neptune-tv-media-cloudflare/public/styles/neptune-streaming.css"
    text = load(path)
    marker = "/* Render polish v5: preview restraint and single-action consistency. */"
    if marker not in text:
        text += '''

/* Render polish v5: preview restraint and single-action consistency. */
.nav .nav-cta { color:#03101e; background:linear-gradient(180deg,#55c9ff,var(--neptune-action)); border:1px solid rgba(255,255,255,.22); }
.nav .nav-cta:hover { background:linear-gradient(180deg,#76d5ff,#2bb5ff); }
.content-rail-shell[hidden] { display:none !important; }
.hero-media:not([data-loading="true"])::before { display:none; }
'''
    save(path, text)


def main() -> None:
    patch_index()
    patch_app()
    patch_ux()
    patch_css()
    print("Applied detailed Neptune render polish v5")


if __name__ == "__main__":
    main()
