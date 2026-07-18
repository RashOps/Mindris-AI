"""Authentication helpers for local-first Mindris API routes."""

from __future__ import annotations

from ipaddress import ip_address
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader
from utils.config import settings
from utils.logger import get_logger
from utils.runtime_config import resolve_secret_slot

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
logger = get_logger(__name__, service_name="api-gateway")

_LOOPBACK_NAMES = {"localhost", "127.0.0.1", "::1", "testserver", "testclient"}


def _is_loopback_host(value: str | None) -> bool:
    if not value:
        return False
    host = value.strip().lower()
    if not host:
        return False
    if host in _LOOPBACK_NAMES:
        return True
    try:
        return ip_address(host).is_loopback
    except ValueError:
        return False


def _parsed_host(url: str | None) -> str | None:
    if not url:
        return None
    parsed = urlparse(url)
    return parsed.hostname


def is_local_request(request: Request) -> bool:
    """Return whether the request comes from an explicit local runtime context."""
    client_host = request.client.host if request.client else None
    request_host = request.url.hostname
    if not _is_loopback_host(request_host):
        return False

    origin = _parsed_host(request.headers.get("origin"))
    if origin and not _is_loopback_host(origin):
        return False

    referer = _parsed_host(request.headers.get("referer"))
    if referer and not _is_loopback_host(referer):
        return False

    if _is_loopback_host(client_host):
        return True

    # Docker Desktop/WSL forwards host-loopback traffic through its bridge.
    # In that case, require an explicit loopback browser origin so arbitrary
    # non-browser clients cannot inherit the local trust boundary.
    return origin is not None


def auth_boundary_contract() -> dict[str, object]:
    """Describe the current local-first auth contract without leaking secrets."""
    return {
        "mode": "local_browser_or_api_key",
        "browser_loopback_enabled": True,
        "query_string_credentials": False,
        "header": "X-API-Key",
        "hosted_note": (
            "Hosted deployments must terminate auth before browser requests "
            "reach Mindris APIs."
        ),
    }


async def verify_api_key(
    request: Request,
    api_key: str | None = Depends(api_key_header),
) -> None:
    """Validate the configured API key or allow explicit local loopback access."""
    expected = resolve_secret_slot("api_key", settings.api_key) or ""
    if not expected:
        logger.debug("API key protection disabled for current environment")
        return
    if api_key == expected:
        return
    if is_local_request(request):
        logger.debug("Accepted local loopback request without browser-side API key")
        return

    logger.warning("Rejected request outside local trust boundary")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Local loopback access or X-API-Key required.",
    )
