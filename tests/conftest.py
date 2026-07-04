"""Test fixtures for API Gateway tests."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api-gateway"))
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "packages"))

from database.session import init_db  # noqa: E402
from httpx import ASGITransport, AsyncClient, Response  # noqa: E402
from main import app  # noqa: E402
from utils.config import settings  # noqa: E402


class ApiClient:
    """Minimal sync wrapper around httpx ASGI transport for backend tests."""

    def request(self, method: str, path: str, **kwargs: Any) -> Response:
        """Send a request to the in-process ASGI application."""

        async def _run() -> Response:
            transport = ASGITransport(app=app, raise_app_exceptions=False)
            async with AsyncClient(
                transport=transport,
                base_url="http://testserver",
            ) as client:
                return await client.request(method, path, **kwargs)

        return asyncio.run(_run())

    def get(self, path: str, **kwargs: Any) -> Response:
        """Send a GET request to the in-process ASGI application."""
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> Response:
        """Send a POST request to the in-process ASGI application."""
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs: Any) -> Response:
        """Send a PUT request to the in-process ASGI application."""
        return self.request("PUT", path, **kwargs)

    def patch(self, path: str, **kwargs: Any) -> Response:
        """Send a PATCH request to the in-process ASGI application."""
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Response:
        """Send a DELETE request to the in-process ASGI application."""
        return self.request("DELETE", path, **kwargs)


def auth_headers() -> dict[str, str]:
    """Return test API auth headers."""
    return {"X-API-Key": settings.api_key.get_secret_value()}


def client() -> ApiClient:
    """Return a lightweight ASGI client for the FastAPI app."""
    init_db()
    return ApiClient()
