"""Vérifie les liens Markdown locaux sans dépendance externe."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r"(?<!!)\[[^\]]*]\(([^)]+)\)")


def local_target(source: Path, raw_target: str) -> Path | None:
    """Résout un lien local relativement au document qui le porte."""
    target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
    if not target or target.startswith(("#", "http://", "https://", "mailto:")):
        return None
    path = unquote(target.split("#", 1)[0])
    if not path:
        return None
    return (source.parent / path).resolve()


def main() -> int:
    """Retourne une erreur si un document référence un chemin absent."""
    failures: list[str] = []
    sources = [ROOT / "README.md", ROOT / "CONTRIBUTING.md"]
    sources.extend(sorted((ROOT / "docs").rglob("*.md")))
    sources.extend(sorted((ROOT / "scripts").glob("*.md")))
    for source in sources:
        content = source.read_text(encoding="utf-8")
        for raw_target in LINK.findall(content):
            target = local_target(source, raw_target)
            if target is not None and not target.exists():
                failures.append(
                    f"{source.relative_to(ROOT)} -> {raw_target} (introuvable)"
                )
    if failures:
        print("\n".join(failures))  # noqa: T201
        return 1
    print(f"markdown-links-ok ({len(sources)} fichiers)")  # noqa: T201
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
