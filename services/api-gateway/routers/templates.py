"""Resume template catalogue routes."""

import json
from copy import deepcopy
from io import BytesIO
from typing import Annotated, Any
from zipfile import BadZipFile, ZipFile

from database.records import CommunityTemplateRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import ValidationError
from schemas import (
    CommunityTemplateConfig,
    CommunityTemplateManifest,
    TemplateCatalogItem,
    TemplateRenderPayloadRequest,
    _contains_unsafe_css_fragment,
)
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])
logger = get_logger(__name__, service_name="api-gateway")
SUPPORTED_TEMPLATE_ENGINE_VERSION = "1"
MAX_TEMPLATE_STYLESHEET_BYTES = 8000
TEMPLATE_IMPORT_FILE = File(...)
SessionDep = Annotated[Session, Depends(get_session)]


READY_TEMPLATES = [
    TemplateCatalogItem(
        id="modern",
        name="Modern",
        description=(
            "Balanced two-column layout for tech, product, and business profiles."
        ),
        status="ready",
        category="tech",
        accent="#2563eb",
        layout="two-column",
    ),
    TemplateCatalogItem(
        id="compact",
        name="Compact",
        description=(
            "Dense one-page format for experienced profiles and long histories."
        ),
        status="ready",
        category="senior",
        accent="#0f766e",
        layout="two-column",
    ),
    TemplateCatalogItem(
        id="ats",
        name="ATS Strict",
        description="Single-column, low-decoration template for ATS-friendly CVs.",
        status="ready",
        category="ats",
        accent="#475569",
        layout="single",
    ),
    TemplateCatalogItem(
        id="student",
        name="Student",
        description="Education-first template for internships and first roles.",
        status="ready",
        category="student",
        accent="#7c3aed",
        layout="single",
    ),
    TemplateCatalogItem(
        id="creative",
        name="Creative",
        description="Editorial template for marketing, design, and content roles.",
        status="ready",
        category="creative",
        accent="#e11d48",
        layout="two-column",
    ),
]

COMMUNITY_TEMPLATES = [
    TemplateCatalogItem(
        id="opensource",
        name="Open Source",
        description=(
            "Community-made template for developers, GitHub links, "
            "and OSS contributions."
        ),
        status="community",
        category="developer",
        accent="#0f766e",
        layout="two-column",
        base_template_id="modern",
        author="Mindris Community",
        preset_settings={
            "global_settings": {
                "template_id": "modern",
                "typography": {"heading_scale": "1.1"},
                "colors": {"palette_preset": "tech"},
                "locale": {"label_language": "en"},
            }
        },
    ),
    TemplateCatalogItem(
        id="bilingual",
        name="Bilingual FR/EN",
        description=(
            "Community template tuned for bilingual CVs and international applications."
        ),
        status="community",
        category="international",
        accent="#7c3aed",
        layout="two-column",
        base_template_id="compact",
        author="Mindris Community",
        preset_settings={
            "global_settings": {
                "template_id": "compact",
                "layout": {"density": "compact"},
                "locale": {"label_language": "en"},
            }
        },
    ),
]

TEMPLATE_CATALOG = [*READY_TEMPLATES, *COMMUNITY_TEMPLATES]


def _catalog_template_item(template_id: str) -> TemplateCatalogItem | None:
    for template in TEMPLATE_CATALOG:
        if template.id == template_id:
            return template
    return None


def _read_package_json(archive: ZipFile, path: str) -> dict[str, Any]:
    try:
        raw = archive.read(path).decode("utf-8")
    except KeyError as exc:
        raise HTTPException(
            status_code=422, detail=f"Template package is missing required file: {path}"
        ) from exc
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Template package contains invalid JSON: {path}",
        ) from exc
    if not isinstance(value, dict):
        raise HTTPException(
            status_code=422,
            detail=f"Template package JSON must be an object: {path}",
        )
    return value


def _is_valid_png(preview_bytes: bytes) -> bool:
    if not preview_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return False
    if len(preview_bytes) < 20:
        return False

    offset = 8
    seen_ihdr = False
    while offset + 8 <= len(preview_bytes):
        length = int.from_bytes(preview_bytes[offset : offset + 4], "big")
        chunk_type = preview_bytes[offset + 4 : offset + 8]
        data_start = offset + 8
        data_end = data_start + length
        crc_end = data_end + 4
        if crc_end > len(preview_bytes):
            return False

        if chunk_type == b"IHDR":
            seen_ihdr = True
            if length != 13:
                return False
        if chunk_type == b"IEND":
            return seen_ihdr and crc_end == len(preview_bytes)

        offset = crc_end

    return False


def _validate_archive_names(archive: ZipFile) -> None:
    for name in archive.namelist():
        normalized = name.replace("\\", "/")
        if normalized.startswith("/") or ".." in normalized.split("/"):
            raise HTTPException(
                status_code=422,
                detail="Template package contains unsafe archive entries.",
            )


def inspect_template_package(package_bytes: bytes) -> dict[str, Any]:
    """Validate a V1 portable community template package."""
    try:
        archive = ZipFile(BytesIO(package_bytes))
    except BadZipFile as exc:
        raise HTTPException(
            status_code=422,
            detail="Invalid template package archive.",
        ) from exc

    with archive:
        _validate_archive_names(archive)
        try:
            manifest = CommunityTemplateManifest.model_validate(
                _read_package_json(archive, "manifest.json")
            )
            template = CommunityTemplateConfig.model_validate(
                _read_package_json(archive, "template.json")
            )
        except ValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid template package metadata: {exc}",
            ) from exc
        try:
            stylesheet = archive.read("styles.css")
        except KeyError as exc:
            raise HTTPException(
                status_code=422,
                detail="Template package is missing required file: styles.css",
            ) from exc
        if len(stylesheet) > MAX_TEMPLATE_STYLESHEET_BYTES:
            raise HTTPException(
                status_code=422,
                detail="Template package styles.css exceeds the allowed size.",
            )
        blocked_stylesheet_fragment = _contains_unsafe_css_fragment(
            stylesheet.decode("utf-8", errors="ignore")
        )
        if blocked_stylesheet_fragment:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Template package styles.css contains blocked construct: "
                    f"{blocked_stylesheet_fragment}"
                ),
            )
        preview_path = "preview.png"
        try:
            preview_bytes = archive.read(preview_path)
        except KeyError as exc:
            raise HTTPException(
                status_code=422,
                detail="Template package is missing required file: preview.png",
            ) from exc
        if not _is_valid_png(preview_bytes):
            raise HTTPException(
                status_code=422,
                detail="Template package preview.png is not a valid PNG file.",
            )
        if manifest.engine_version != SUPPORTED_TEMPLATE_ENGINE_VERSION:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Unsupported template package engine_version: "
                    f"{manifest.engine_version}"
                ),
            )

    return {
        "status": "success",
        "manifest": manifest.model_dump(mode="json"),
        "template": template.model_dump(mode="json"),
        "files": {"preview": preview_path, "stylesheet": "styles.css"},
    }


def _base_template_item(base_template_id: str | None) -> TemplateCatalogItem | None:
    if not base_template_id:
        return None
    for template in TEMPLATE_CATALOG:
        if template.id == base_template_id:
            return template
    return None


def _serialize_installed_template(record: CommunityTemplateRecord) -> dict[str, Any]:
    manifest = json.loads(record.manifest_json)
    template_config = json.loads(record.template_json)
    base = _base_template_item(record.base_template_id)
    item = TemplateCatalogItem(
        id=record.template_id,
        name=record.name,
        description=record.description,
        status="community",
        category=record.category,
        accent=record.accent or (base.accent if base else "#2563eb"),
        layout=(
            record.layout if record.layout in {"single", "two-column"} else "two-column"
        ),
        base_template_id=record.base_template_id,
        author=record.author,
        preset_settings=template_config.get("preset_settings", {}),
    )
    payload = item.model_dump(mode="json")
    payload["manifest"] = manifest
    payload["previewAvailable"] = True
    return payload


def import_template_package(session: Session, package_bytes: bytes) -> dict[str, Any]:
    """Import and persist a portable community template package."""
    package = inspect_template_package(package_bytes)
    manifest = package["manifest"]
    template_config = package["template"]
    base = _base_template_item(template_config.get("base_template_id"))
    record = session.exec(
        select(CommunityTemplateRecord).where(
            CommunityTemplateRecord.template_id == manifest["id"]
        )
    ).first()
    if record is None:
        record = CommunityTemplateRecord(
            template_id=manifest["id"],
            name=manifest["name"],
            author=manifest["author"],
            description=manifest["description"],
            category=manifest["category"],
            accent=base.accent if base else "#2563eb",
            layout=base.layout if base else "two-column",
            base_template_id=template_config.get("base_template_id"),
            manifest_json=json.dumps(manifest, ensure_ascii=False),
            template_json=json.dumps(template_config, ensure_ascii=False),
            package_bytes=package_bytes,
        )
        session.add(record)
    else:
        record.name = manifest["name"]
        record.author = manifest["author"]
        record.description = manifest["description"]
        record.category = manifest["category"]
        record.base_template_id = template_config.get("base_template_id")
        record.manifest_json = json.dumps(manifest, ensure_ascii=False)
        record.template_json = json.dumps(template_config, ensure_ascii=False)
        record.package_bytes = package_bytes
        if base:
            record.accent = base.accent
            record.layout = base.layout
    session.commit()
    session.refresh(record)
    return {"status": "success", "item": _serialize_installed_template(record)}


def export_installed_template_package(session: Session, template_id: str) -> bytes:
    """Export a persisted community template package."""
    record = session.exec(
        select(CommunityTemplateRecord).where(
            CommunityTemplateRecord.template_id == template_id
        )
    ).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Installed template not found.")
    return bytes(record.package_bytes)


def export_installed_template_preview(session: Session, template_id: str) -> bytes:
    """Export the preview PNG embedded in a persisted community template package."""
    package_bytes = export_installed_template_package(session, template_id)
    with ZipFile(BytesIO(package_bytes)) as archive:
        try:
            return archive.read("preview.png")
        except KeyError as exc:
            raise HTTPException(
                status_code=404, detail="Installed template preview not found."
            ) from exc


def _deep_merge(base: Any, patch: Any) -> Any:
    if isinstance(base, dict) and isinstance(patch, dict):
        merged = deepcopy(base)
        for key, value in patch.items():
            if key in merged:
                if (
                    key == "label_language"
                    and isinstance(merged[key], str)
                    and isinstance(value, str)
                    and merged[key] != value
                    and value == "fr"
                ):
                    continue
                merged[key] = _deep_merge(merged[key], value)
            else:
                merged[key] = deepcopy(value)
        return merged
    if isinstance(base, list) and isinstance(patch, list):
        return deepcopy(patch) if patch else deepcopy(base)
    if isinstance(base, str) and isinstance(patch, str):
        return deepcopy(patch) if patch.strip() else deepcopy(base)
    if patch is None:
        return deepcopy(base)
    return deepcopy(patch)


def resolve_template_defaults(
    template_id: str, session: Session | None = None
) -> dict[str, Any]:
    """Return the preset settings associated with a template."""
    template = _catalog_template_item(template_id)
    if template is not None:
        return template.preset_settings
    if session is not None:
        record = session.exec(
            select(CommunityTemplateRecord).where(
                CommunityTemplateRecord.template_id == template_id
            )
        ).first()
        if record is not None:
            template_config = json.loads(record.template_json)
            preset_settings = deepcopy(template_config.get("preset_settings", {}))
            package_bytes = bytes(record.package_bytes)
            with ZipFile(BytesIO(package_bytes)) as archive:
                stylesheet = archive.read("styles.css").decode("utf-8")
            global_settings = preset_settings.setdefault("global_settings", {})
            if record.base_template_id:
                global_settings["template_id"] = record.base_template_id
            global_settings["advanced_css"] = {
                "enabled": True,
                "mode": "css_patch",
                "css_text": stylesheet,
            }
            return preset_settings
    return {}


def apply_template_defaults(
    cv_data: dict[str, Any], template_id: str, session: Session | None = None
) -> dict[str, Any]:
    """Overlay template defaults on top of a CV payload."""
    defaults = resolve_template_defaults(template_id, session=session)
    if not defaults:
        return cv_data
    merged = _deep_merge(defaults, cv_data)
    template = _catalog_template_item(template_id)
    if template is not None and template.base_template_id:
        global_settings = merged.setdefault("global_settings", {})
        global_settings["template_id"] = template.base_template_id
    if session is not None:
        record = session.exec(
            select(CommunityTemplateRecord).where(
                CommunityTemplateRecord.template_id == template_id
            )
        ).first()
        if record is not None and record.base_template_id:
            global_settings = merged.setdefault("global_settings", {})
            global_settings["template_id"] = record.base_template_id
    return merged


CUSTOMIZATION_CATALOGUE = {
    "schemaVersion": "2",
    "page": {
        "formats": ["A4", "Letter"],
        "pageBreakModes": ["auto", "manual"],
        "margins": {
            "presets": {
                "small": {"horizontal": "32px", "vertical": "28px"},
                "normal": {"horizontal": "64px", "vertical": "48px"},
                "large": {"horizontal": "80px", "vertical": "64px"},
            },
            "range": {"min": 16, "max": 96, "unit": "px"},
        },
    },
    "layout": {
        "columns": [1, 2],
        "sidebarPositions": ["none", "left", "right"],
        "sidebarWidth": {
            "presets": ["25%", "30%", "35%"],
            "range": {"min": 20, "max": 70, "unit": "%"},
        },
        "densities": ["student", "compact", "normal", "senior"],
        "headerAlignments": ["left", "center", "right"],
        "photo": {"enabled": [True, False], "shapes": ["round", "square"]},
        "placements": ["main", "sidebar"],
    },
    "typography": {
        "bodyFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "headingFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "baseSize": {"min": 9, "max": 14, "unit": "px"},
        "headingScale": {"min": 1.0, "max": 1.6, "step": 0.05},
        "weights": ["regular", "medium", "bold"],
        "capitalization": ["normal", "uppercase"],
        "lineHeights": ["1.25", "1.35", "1.5", "1.65"],
        "dateStyles": ["normal", "italic", "small", "right"],
        "bulletStyles": ["bullets", "dash", "dots", "icons"],
    },
    "colors": {
        "palettePresets": ["corporate", "tech", "minimal", "creative", "custom"],
        "editable": [
            "primary",
            "secondary",
            "text",
            "heading",
            "sidebar_background",
            "separators",
        ],
        "accentTargets": ["name", "title", "headings", "dates", "links", "skills"],
        "monochrome": [True, False],
        "minimumContrast": 4.5,
    },
    "sections": {
        "types": [
            "experience",
            "education",
            "projects",
            "skills",
            "languages",
            "certifications",
            "volunteering",
            "interests",
            "publications",
            "references",
            "custom",
        ],
        "displayModes": ["list", "timeline", "cards", "compact"],
        "detailLevels": ["short", "normal", "detailed"],
        "headingStyles": ["line", "plain", "box", "accent"],
        "headingCapitalization": ["normal", "uppercase"],
        "titleSubtitleOrders": ["title_first", "subtitle_first"],
        "dateLocationPositions": ["inline", "right", "below"],
        "skillStyles": ["tags", "plain", "bars"],
        "toggles": ["visible", "show_dates", "show_locations", "page_break_before"],
        "placements": ["main", "sidebar"],
    },
    "locale": {
        "languages": ["fr", "en", "de", "es"],
        "directions": ["ltr", "rtl"],
    },
    "advancedCss": {
        "enabled": True,
        "maxLength": 8000,
        "modes": ["off", "tokens", "css_patch"],
        "allowedScopes": [
            ":host",
            ".cv-shell",
            "[data-section]",
            "[data-section-type]",
            "[data-section-placement]",
        ],
        "blockedAtRules": ["@import"],
        "blockedFunctions": ["expression(", "javascript:", "url("],
        "examples": [
            ":host { --primary-color: #0f172a; --heading-scale: 1.1; }",
            "[data-section-type='experience'] h2 { color: #0f766e; }",
        ],
    },
    "templates": {
        "modern": {"compatibleLayouts": [1, 2]},
        "compact": {"compatibleLayouts": [1, 2]},
        "ats": {
            "compatibleLayouts": [1],
            "enforced": {
                "layout": {"columns": 1, "sidebar_position": "none"},
                "photo": {"enabled": False},
                "colors": {"monochrome": True},
                "typography": {"bullet_style": "dash"},
            },
        },
        "student": {"compatibleLayouts": [1]},
        "creative": {"compatibleLayouts": [1, 2]},
    },
}


def list_templates(session: Session | None = None) -> dict:
    """List resume templates owned by the backend catalogue."""
    items = [template.model_dump(mode="json") for template in TEMPLATE_CATALOG]
    if session is not None:
        installed = session.exec(
            select(CommunityTemplateRecord).order_by(
                CommunityTemplateRecord.updated_at.desc()
            )
        ).all()
        items.extend(_serialize_installed_template(record) for record in installed)
    logger.debug("Listing %d templates", len(items))
    return {
        "status": "success",
        "items": items,
    }


@router.get("")
def list_templates_route(session: SessionDep) -> dict:
    """HTTP route for listing backend and installed templates."""
    return list_templates(session)


@router.get("/community")
def list_community_templates() -> dict:
    """List community-made resume templates."""
    return {
        "status": "success",
        "items": [template.model_dump(mode="json") for template in COMMUNITY_TEMPLATES],
    }


@router.get("/customization-catalogue")
def list_customization_catalogue() -> dict:
    """Return backend-owned resume customization options."""
    return {"status": "success", "item": CUSTOMIZATION_CATALOGUE}


@router.post("/resolve-render-payload")
def resolve_template_render_payload_route(
    request: TemplateRenderPayloadRequest, session: SessionDep
) -> dict[str, Any]:
    """Resolve backend-owned template defaults before renderer preview/export."""
    cv_data = request.cv_data.model_dump(mode="json")
    settings = cv_data.get("global_settings", {})
    requested_template_id = request.template_id
    if requested_template_id is None and isinstance(settings, dict):
        settings_template_id = settings.get("template_id")
        if isinstance(settings_template_id, str):
            requested_template_id = settings_template_id
    requested_template_id = requested_template_id or "modern"
    resolved_cv_data = apply_template_defaults(
        cv_data, requested_template_id, session=session
    )
    resolved_settings = resolved_cv_data.setdefault("global_settings", {})
    resolved_template_id = resolved_settings.get("template_id")
    if not isinstance(resolved_template_id, str) or not resolved_template_id:
        resolved_template_id = requested_template_id
        resolved_settings["template_id"] = resolved_template_id
    return {
        "status": "success",
        "item": {
            "cv_data": resolved_cv_data,
            "template_id": resolved_template_id,
        },
    }


@router.get("/{template_id:path}/preview")
def get_template_preview(template_id: str, session: SessionDep) -> Response:
    """Return the preview image for an installed community template."""
    return Response(
        content=export_installed_template_preview(session, template_id),
        media_type="image/png",
    )


@router.post("/import")
async def import_template_package_route(
    session: SessionDep,
    file: UploadFile = TEMPLATE_IMPORT_FILE,
) -> dict[str, Any]:
    """Import a portable community template package."""
    if file.content_type not in {"application/zip", "application/octet-stream"}:
        raise HTTPException(
            status_code=422,
            detail="Template package file has an unsupported content type.",
        )
    package_bytes = await file.read()
    if not package_bytes:
        raise HTTPException(status_code=422, detail="Template package file is empty.")
    return import_template_package(session, package_bytes)


@router.get("/{template_id:path}/package")
def export_template_package_route(template_id: str, session: SessionDep) -> Response:
    """Export a persisted community template package."""
    package_bytes = export_installed_template_package(session, template_id)
    filename = f"{template_id.rsplit('/', 1)[-1]}.mindris-template"
    return Response(
        content=package_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{template_id:path}")
def get_template_route(template_id: str, session: SessionDep) -> dict:
    """HTTP route for one resume template."""
    return get_template(template_id, session)


def get_template(template_id: str, session: Session | None = None) -> dict:
    """Return one resume template."""
    for template in TEMPLATE_CATALOG:
        if template.id == template_id:
            return {"status": "success", "item": template.model_dump(mode="json")}
    if session is not None:
        record = session.exec(
            select(CommunityTemplateRecord).where(
                CommunityTemplateRecord.template_id == template_id
            )
        ).first()
        if record is not None:
            return {"status": "success", "item": _serialize_installed_template(record)}
    logger.warning("Template '%s' not found", template_id)
    raise HTTPException(status_code=404, detail="Template not found.")
