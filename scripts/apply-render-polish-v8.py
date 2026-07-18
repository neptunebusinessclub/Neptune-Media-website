from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    for old, new in replacements:
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
        ],
    )
    patch(
        "neptune-tv-media-cloudflare/src/public-layout.js",
        [
            ('<a href="/emissions/">Neptune TV</a>', '<a href="/emissions/">Émissions</a>'),
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
.video-modal {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(14px, 2.5vw, 34px);
  background: rgba(1, 4, 12, .94);
  backdrop-filter: blur(22px) saturate(125%);
}
.video-modal .modal-frame {
  width: min(1120px, calc(100vw - 56px));
  max-height: none;
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 0;
}
.video-modal .modal-frame video {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: var(--player-aspect, 16 / 9);
  max-height: calc(100dvh - 150px);
  object-fit: contain;
  object-position: center;
  border: 1px solid rgba(169, 221, 255, .28);
  border-radius: 22px;
  background: #000;
  box-shadow: 0 30px 90px rgba(0,0,0,.58), 0 0 0 1px rgba(255,255,255,.04);
}
.video-modal[data-player-aspect="portrait"] .modal-frame,
.video-modal[data-media-kind="short"] .modal-frame {
  width: min(440px, calc(100vw - 32px));
}
.video-modal[data-player-aspect="portrait"] .modal-frame video,
.video-modal[data-media-kind="short"] .modal-frame video {
  aspect-ratio: var(--player-aspect, 9 / 16);
  max-height: calc(100dvh - 116px);
}
.video-modal[data-player-aspect="landscape"] .modal-frame,
.video-modal[data-media-kind="episode"] .modal-frame {
  width: min(1120px, calc(100vw - 56px));
}
.video-modal .modal-close {
  top: -18px;
  right: -18px;
  width: 48px;
  height: 48px;
  border-color: rgba(255,255,255,.2);
  background: rgba(8,17,38,.94);
  box-shadow: 0 12px 32px rgba(0,0,0,.35);
  backdrop-filter: blur(14px);
}
.video-modal .modal-caption {
  max-width: min(760px, 90vw);
  margin: 0;
  color: #dbe7f7;
  font-size: .86rem;
  line-height: 1.35;
  text-align: center;
}
.video-modal .caption-notice,
.video-modal .media-error,
.video-modal .transcript-panel {
  width: min(760px, 100%);
  margin: 0;
  border-radius: 15px;
}
.video-modal .caption-notice {
  padding: 12px 16px;
  border: 1px solid rgba(172,193,228,.14);
  background: rgba(8,17,38,.72);
  color: #a8b5cc;
  font-size: .78rem;
  text-align: center;
}
.video-modal .modal-ad-label { top: 14px; left: 14px; }
.video-modal .modal-skip { top: 14px; right: 14px; }
body.modal-open { overflow: hidden; }
@media (max-width: 760px) {
  .video-modal { place-items: start center; padding: 12px; }
  .video-modal .modal-frame,
  .video-modal[data-player-aspect="landscape"] .modal-frame,
  .video-modal[data-media-kind="episode"] .modal-frame { width: 100%; }
  .video-modal[data-player-aspect="portrait"] .modal-frame,
  .video-modal[data-media-kind="short"] .modal-frame { width: min(420px, 100%); }
  .video-modal .modal-frame video { max-height: calc(100dvh - 120px); border-radius: 17px; }
  .video-modal .modal-close { position: fixed; top: 12px; right: 12px; width: 44px; height: 44px; }
  .video-modal .modal-caption { padding-inline: 42px; }
  .video-modal .caption-notice { padding: 10px 12px; }
}
''',
    )
    print("Applied Neptune media asset, navigation and premium adaptive modal fix v8")


if __name__ == "__main__":
    main()
