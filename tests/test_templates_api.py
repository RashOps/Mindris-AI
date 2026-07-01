"""Template and customization catalogue tests."""

import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from fastapi import HTTPException
from routers.templates import (
    inspect_template_package,
    get_template,
    list_community_templates,
    list_customization_catalogue,
    list_templates,
)


def test_template_catalog_lists_ready_templates() -> None:
    items = list_templates()["items"]
    ready_ids = {item["id"] for item in items if item["status"] == "ready"}
    assert {"modern", "compact", "ats", "student", "creative"} <= ready_ids
    community_ids = {item["id"] for item in items if item["status"] == "community"}
    assert {"opensource", "bilingual"} <= community_ids


def test_template_catalog_exposes_community_listing() -> None:
    items = list_templates()["items"]
    community = [item for item in items if item["status"] == "community"]
    assert len(community) >= 2
    assert all(item["author"] == "Mindris Community" for item in community)


def test_community_template_route_lists_only_community_items() -> None:
    items = list_community_templates()["items"]
    assert items
    assert all(item["status"] == "community" for item in items)


def test_template_detail_404_for_unknown_template() -> None:
    with pytest.raises(HTTPException) as exc_info:
        get_template("not-real")
    assert exc_info.value.status_code == 404


def test_customization_catalogue_exposes_backend_owned_options() -> None:
    catalogue = list_customization_catalogue()

    assert catalogue["status"] == "success"
    options = catalogue["item"]
    assert options["schemaVersion"] == "2"
    assert options["page"]["formats"] == ["A4", "Letter"]
    assert options["layout"]["columns"] == [1, 2]
    assert options["layout"]["sidebarPositions"] == ["none", "left", "right"]
    assert options["layout"]["sidebarWidth"]["presets"] == ["25%", "30%", "35%"]
    assert options["typography"]["bodyFonts"][:3] == ["Inter", "Roboto", "Lato"]
    assert "corporate" in options["colors"]["palettePresets"]
    assert "certifications" in options["sections"]["types"]
    assert options["locale"]["languages"] == ["fr", "en", "de", "es"]
    assert options["locale"]["directions"] == ["ltr", "rtl"]
    assert options["templates"]["ats"]["enforced"]["layout"]["columns"] == 1


def _template_package_bytes(*, include_preview: bool = True, engine_version: str = "1") -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr(
            "manifest.json",
            json.dumps(
                {
                    "id": "mindris/community-open-source",
                    "name": "Community Open Source",
                    "version": "1.0.0",
                    "author": "Mindris Community",
                    "license": "MIT",
                    "description": "Community template for OSS contributors.",
                    "category": "developer",
                    "tags": ["opensource", "developer"],
                    "engine_version": engine_version,
                }
            ),
        )
        archive.writestr(
            "template.json",
            json.dumps(
                {
                    "base_template_id": "modern",
                    "preset_settings": {
                        "global_settings": {
                            "template_id": "modern",
                            "colors": {"palette_preset": "tech"},
                        }
                    },
                }
            ),
        )
        archive.writestr("styles.css", ":host { --primary-color: #0f766e; }")
        if include_preview:
            archive.writestr("preview.png", b"\x89PNG\r\n\x1a\npreview")
    return buffer.getvalue()


def test_template_package_inspection_accepts_valid_v1_archive() -> None:
    package = inspect_template_package(_template_package_bytes())
    assert package["manifest"]["id"] == "mindris/community-open-source"
    assert package["manifest"]["engine_version"] == "1"
    assert package["template"]["base_template_id"] == "modern"
    assert package["files"]["preview"] == "preview.png"


def test_template_package_inspection_rejects_missing_preview() -> None:
    with pytest.raises(HTTPException) as exc_info:
        inspect_template_package(_template_package_bytes(include_preview=False))
    assert exc_info.value.status_code == 422
    assert "preview" in str(exc_info.value.detail).lower()


def test_template_package_inspection_rejects_unsupported_engine_version() -> None:
    with pytest.raises(HTTPException) as exc_info:
        inspect_template_package(_template_package_bytes(engine_version="99"))
    assert exc_info.value.status_code == 422
    assert "engine_version" in str(exc_info.value.detail)
