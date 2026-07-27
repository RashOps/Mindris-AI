"""Test fixtures for API Gateway tests."""

from __future__ import annotations

import asyncio
import atexit
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
_TEST_RUNTIME_DIR = Path(tempfile.mkdtemp(prefix="mindris-tests-"))
os.environ["LOGS_DIR"] = str(_TEST_RUNTIME_DIR / "logs")
atexit.register(shutil.rmtree, _TEST_RUNTIME_DIR, True)

sys.path.insert(0, str(ROOT / "services" / "api-gateway"))
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "packages"))

from database.session import init_db  # noqa: E402
from httpx import ASGITransport, AsyncClient, Response  # noqa: E402
from main import app  # noqa: E402
from utils.config import settings  # noqa: E402


class ApiClient:
    """Minimal sync wrapper around httpx ASGI transport for backend tests."""

    def __init__(
        self,
        *,
        client_host: str = "127.0.0.1",
        base_url: str = "http://testserver",
    ) -> None:
        self._client_host = client_host
        self._base_url = base_url

    def request(self, method: str, path: str, **kwargs: Any) -> Response:
        """Send a request to the in-process ASGI application."""

        async def _run() -> Response:
            transport = ASGITransport(
                app=app,
                raise_app_exceptions=False,
                client=(self._client_host, 1234),
            )
            async with AsyncClient(
                transport=transport,
                base_url=self._base_url,
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


def client(
    *,
    client_host: str = "127.0.0.1",
    base_url: str = "http://testserver",
) -> ApiClient:
    """Return a lightweight ASGI client for the FastAPI app."""
    init_db()
    return ApiClient(client_host=client_host, base_url=base_url)
