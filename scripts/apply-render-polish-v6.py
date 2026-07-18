from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    for old, new in replacements:
        while old in text:
            text = text.replace(old, new, 1)
    target.write_text(text, encoding="utf-8")


def main() -> None:
    patch(
        "neptune-tv-media-cloudflare/public/app.js",
        [
            (
                "      setHeroLoading(false);\n      renderHomeLive('error');\n      setHeroLoading(false);\n      renderHomeLive('error');\n",
                "      setHeroLoading(false);\n      renderHomeLive('error');\n",
            ),
            (
                "      renderHomeLive();\n      renderHomeLive();\n",
                "      renderHomeLive();\n",
            ),
            (
                "      bindAutoplay();\n      bindAutoplay();\n",
                "      bindAutoplay();\n",
            ),
        ],
    )
    print("Applied Neptune render polish idempotency v6")


if __name__ == "__main__":
    main()
