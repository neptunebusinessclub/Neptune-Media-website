from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    for old, new in replacements:
        text = text.replace(old, new)
    target.write_text(text, encoding="utf-8")


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
    print("Applied Neptune media asset, live filter and landing navigation fix v8")


if __name__ == "__main__":
    main()
