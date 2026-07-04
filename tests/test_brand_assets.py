from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
BRAND = ROOT / "brand"
SVG_NS = {"svg": "http://www.w3.org/2000/svg"}
BANNED_SPELLINGS = ("Minris", "Miniris", "Mindriss", "Mindr AI", "minris", "miniris")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _svg_text_content(path: Path) -> list[str]:
    root = ET.fromstring(_read(path))
    return [
        (node.text or "").strip()
        for node in root.findall(".//svg:text", SVG_NS)
        if (node.text or "").strip()
    ]


def test_primary_logo_uses_exact_mindris_wordmark() -> None:
    contents = _svg_text_content(BRAND / "logo" / "mindris-logo.svg")
    assert "Mindris" in contents


def test_monochrome_logo_uses_exact_mindris_wordmark() -> None:
    contents = _svg_text_content(BRAND / "logo" / "mindris-logo-monochrome.svg")
    assert "Mindris" in contents


def test_wordmark_uses_exact_mindris_spelling() -> None:
    contents = _svg_text_content(BRAND / "wordmark" / "mindris-wordmark.svg")
    assert contents == ["Mindris"]


def test_brand_svgs_do_not_contain_known_bad_spellings() -> None:
    for path in BRAND.rglob("*.svg"):
        content = _read(path)
        for spelling in BANNED_SPELLINGS:
            assert spelling not in content, f"{path} contains banned spelling: {spelling}"
