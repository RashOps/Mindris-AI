"""Resume template catalogue routes."""

from fastapi import APIRouter, HTTPException
from schemas import TemplateCatalogItem

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


TEMPLATE_CATALOG = [
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


@router.get("")
def list_templates() -> dict:
    """List resume templates owned by the backend catalogue."""
    return {
        "status": "success",
        "items": [template.model_dump(mode="json") for template in TEMPLATE_CATALOG],
    }


@router.get("/{template_id}")
def get_template(template_id: str) -> dict:
    """Return one resume template."""
    for template in TEMPLATE_CATALOG:
        if template.id == template_id:
            return {"status": "success", "item": template.model_dump(mode="json")}
    raise HTTPException(status_code=404, detail="Template not found.")
