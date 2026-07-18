from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def keep_one(text: str, pattern: str, replacement: str) -> str:
    return re.sub(pattern, lambda _match: replacement, text, flags=re.MULTILINE)


def clean_app() -> None:
    path = ROOT / "neptune-tv-media-cloudflare/public/app.js"
    text = path.read_text(encoding="utf-8")

    aspect = (
        "  function syncModalAspect() {\n"
        "    if (!modal || !player || !player.videoWidth || !player.videoHeight) return;\n"
        "    const ratio = player.videoWidth / player.videoHeight;\n"
        "    modal.dataset.playerAspect = ratio < .92 ? 'portrait' : 'landscape';\n"
        "    modal.style.setProperty('--player-aspect', `${player.videoWidth} / ${player.videoHeight}`);\n"
        "  }"
    )
    aspect_pattern = r"(?:  function syncModalAspect\(\) \{\n    if \(!modal \|\| !player \|\| !player\.videoWidth \|\| !player\.videoHeight\) return;\n    const ratio = player\.videoWidth / player\.videoHeight;\n    modal\.dataset\.playerAspect = ratio < \.92 \? 'portrait' : 'landscape';\n    modal\.style\.setProperty\('--player-aspect', `\$\{player\.videoWidth\} / \$\{player\.videoHeight\}`\);\n  \}\n*)+"
    text = keep_one(text, aspect_pattern, aspect + "\n\n")

    format_line = "  function formatLabel(name) { return /hors\\s*norme/i.test(String(name || '')) ? 'Hors Norme' : 'Concept Libre'; }"
    format_pattern = r"(?:  function formatLabel\(name\) \{ return /hors\\s\*norme/i\.test\(String\(name \|\| ''\)\) \? 'Hors Norme' : 'Concept Libre'; \}\n*)+"
    text = keep_one(text, format_pattern, format_line + "\n")

    path.write_text(text, encoding="utf-8")


def clean_layout() -> None:
    path = ROOT / "neptune-tv-media-cloudflare/src/public-layout.js"
    text = path.read_text(encoding="utf-8")
    line = "export function formatLabel(programName) { return /hors\\s*norme/i.test(String(programName || '')) ? 'Hors Norme' : 'Concept Libre'; }"
    pattern = r"(?:export function formatLabel\(programName\) \{ return /hors\\s\*norme/i\.test\(String\(programName \|\| ''\)\) \? 'Hors Norme' : 'Concept Libre'; \}\n*)+"
    text = keep_one(text, pattern, line + "\n")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    clean_app()
    clean_layout()
    print("Removed duplicate render-polish declarations")


if __name__ == "__main__":
    main()
