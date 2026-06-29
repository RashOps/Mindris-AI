"""LLM catalogue routes."""

from fastapi import APIRouter
from intelligence.llm_config import (
    MODEL_CATALOGUE,
    TASK_DEFAULTS,
    provider_configuration_status,
)

router = APIRouter(prefix="/api/v1/llm", tags=["llm"])


@router.get("/catalogue")
def llm_catalogue() -> dict:
    """Return available providers, models, and per-task defaults."""
    return {
        "catalogue": MODEL_CATALOGUE,
        "defaults": TASK_DEFAULTS,
        "providers": provider_configuration_status(),
    }
