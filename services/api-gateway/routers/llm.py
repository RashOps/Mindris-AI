"""LLM catalogue routes."""

from typing import Annotated

from fastapi import APIRouter, Query
from intelligence.model_catalogue import catalogue_payload, get_model_registry
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/llm", tags=["llm"])
logger = get_logger(__name__, service_name="api-gateway")


@router.get("/catalogue")
async def llm_catalogue() -> dict:
    """Return available providers, models, and per-task defaults."""
    logger.debug("Serving LLM catalogue")
    return catalogue_payload()


@router.post("/catalogue/refresh")
async def refresh_llm_catalogue(
    provider: Annotated[list[str] | None, Query()] = None,
) -> dict:
    """Refresh configured providers and retain last-known-good data on failure."""
    logger.info("Refreshing LLM catalogue providers=%s", provider or "configured")
    get_model_registry().refresh(provider)
    return catalogue_payload()
