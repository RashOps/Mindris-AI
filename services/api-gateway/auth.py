"""API-key authentication for local Mindris API routes."""

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import APIKeyHeader
from utils.config import settings
from utils.logger import get_logger
from utils.runtime_config import resolve_secret_slot

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
logger = get_logger(__name__, service_name="api-gateway")


async def verify_api_key(
    api_key: str | None = Depends(api_key_header),
    api_key_query: str | None = Query(default=None, alias="api_key"),
) -> None:
    """Validate the configured API key for protected API routes."""
    expected = resolve_secret_slot("api_key", settings.api_key) or ""
    if not expected:
        logger.debug("API key protection disabled for current environment")
        return
    if (api_key or api_key_query) != expected:
        logger.warning("Rejected request with invalid or missing API key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
