"""API-key authentication for local Mindris API routes."""

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import APIKeyHeader
from utils.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(
    api_key: str | None = Depends(api_key_header),
    api_key_query: str | None = Query(default=None, alias="api_key"),
) -> None:
    """Validate the configured API key for protected API routes."""
    expected = settings.api_key.get_secret_value()
    if not expected:
        return
    if (api_key or api_key_query) != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
