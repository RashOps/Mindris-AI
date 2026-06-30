"""Resume template catalogue routes."""

from copy import deepcopy
from typing import Any

from fastapi import APIRouter, HTTPException
from schemas import TemplateCatalogItem
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])
logger = get_logger(__name__, service_name="api-gateway")


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
            "Community template tuned for bilingual CVs and "
            "international applications."
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


def resolve_template_defaults(template_id: str) -> dict[str, Any]:
    """Return the preset settings associated with a template."""
    for template in TEMPLATE_CATALOG:
        if template.id == template_id:
            return template.preset_settings
    return {}


def apply_template_defaults(
    cv_data: dict[str, Any], template_id: str
) -> dict[str, Any]:
    """Overlay template defaults on top of a CV payload."""
    defaults = resolve_template_defaults(template_id)
    if not defaults:
        return cv_data
    return _deep_merge(defaults, cv_data)


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
            "range": {"min": 20, "max": 40, "unit": "%"},
        },
        "densities": ["student", "compact", "normal", "senior"],
        "headerAlignments": ["left", "center", "right"],
        "photo": {"enabled": [True, False], "shapes": ["round", "square"]},
        "placements": ["main", "sidebar"],
    },
    "typography": {
        "bodyFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "headingFonts": ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
        "baseSize": {"min": 9, "max": 12, "unit": "pt"},
        "headingScale": {"min": 1.0, "max": 1.6, "step": 0.05},
        "weights": ["regular", "medium", "bold"],
        "capitalization": ["normal", "uppercase"],
        "lineHeights": ["compact", "normal", "large"],
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
        "monochrome": [True, False],
        "minimumContrast": 4.5,
    },
    "sections": {
        "types": [
            "profile",
            "contact",
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
        "toggles": ["visible", "show_dates", "show_locations"],
        "placements": ["main", "sidebar"],
    },
    "locale": {
        "languages": ["fr", "en", "de", "es"],
        "directions": ["ltr", "rtl"],
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


@router.get("")
def list_templates() -> dict:
    """List resume templates owned by the backend catalogue."""
    logger.debug("Listing %d templates", len(TEMPLATE_CATALOG))
    return {
        "status": "success",
        "items": [template.model_dump(mode="json") for template in TEMPLATE_CATALOG],
    }


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


@router.get("/{template_id}")
def get_template(template_id: str) -> dict:
    """Return one resume template."""
    for template in TEMPLATE_CATALOG:
        if template.id == template_id:
            return {"status": "success", "item": template.model_dump(mode="json")}
    logger.warning("Template '%s' not found", template_id)
    raise HTTPException(status_code=404, detail="Template not found.")
