"""Test fixtures for API Gateway tests."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api-gateway"))
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "packages"))

from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402
from utils.config import settings  # noqa: E402


def auth_headers() -> dict[str, str]:
    """Return test API auth headers."""
    return {"X-API-Key": settings.api_key.get_secret_value()}


def client() -> TestClient:
    """Return a FastAPI test client."""
    return TestClient(app)
