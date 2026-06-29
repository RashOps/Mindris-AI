"""Health and system status routes."""

import os
from pathlib import Path

from database.session import DB_PATH, engine
from fastapi import APIRouter
from sqlalchemy import text
from utils.config import settings
from utils.logger import get_logger

router = APIRouter(tags=["system"])
logger = get_logger(__name__, service_name="api-gateway")


@router.get("/")
async def health_check() -> dict:
    """Return the health status of the API Gateway."""
    return {"status": "healthy", "service": "api-gateway"}


@router.get("/api/v1/system/status")
async def system_status() -> dict:
    """Return local service and storage status."""
    checks = await readiness_checks()
    return {
        "status": checks["status"],
        "api": "ok",
        "renderer_url": settings.renderer_url,
        "timeouts": {
            "service_seconds": settings.service_timeout_seconds,
            "pipeline_seconds": settings.pipeline_timeout_seconds,
        },
        "storage": {
            "path": str(settings.storage_dir),
            "exists": settings.storage_dir.exists(),
            "writable": os.access(settings.storage_dir, os.W_OK),
        },
        "vectordb": {
            "path": str(settings.chroma_db_dir),
            "exists": settings.chroma_db_dir.exists(),
            "writable": os.access(settings.chroma_db_dir, os.W_OK),
        },
        "sqlite": {
            "path": str(Path(DB_PATH)),
            "exists": Path(DB_PATH).exists(),
            "ok": checks["checks"]["sqlite"]["ok"],
        },
    }


@router.get("/api/v1/system/ready")
async def readiness_checks() -> dict:
    """Return readiness checks for storage and SQLite."""
    storage = _dir_check(settings.storage_dir)
    vectordb = _dir_check(settings.chroma_db_dir)
    sqlite = _sqlite_check()
    checks = {"storage": storage, "vectordb": vectordb, "sqlite": sqlite}
    ready = all(item["ok"] for item in checks.values())
    return {
        "status": "ready" if ready else "degraded",
        "service": "api-gateway",
        "checks": checks,
    }


def _dir_check(path: Path) -> dict:
    exists = path.exists()
    return {
        "ok": exists and path.is_dir() and os.access(path, os.W_OK),
        "path": str(path),
        "exists": exists,
        "is_dir": path.is_dir() if exists else False,
        "writable": os.access(path, os.W_OK) if exists else False,
    }


def _sqlite_check() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
    except Exception as exc:  # pragma: no cover - exercised by runtime readiness
        return {
            "ok": False,
            "path": str(Path(DB_PATH)),
            "exists": Path(DB_PATH).exists(),
            "error": str(exc),
        }
    return {
        "ok": True,
        "path": str(Path(DB_PATH)),
        "exists": Path(DB_PATH).exists(),
    }
