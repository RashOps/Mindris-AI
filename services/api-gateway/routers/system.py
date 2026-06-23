"""Health and system status routes."""

from pathlib import Path

from database.session import DB_PATH
from fastapi import APIRouter
from utils.config import settings

router = APIRouter(tags=["system"])


@router.get("/")
def health_check() -> dict:
    """Return the health status of the API Gateway."""
    return {"status": "healthy", "service": "Mindris AI Gateway"}


@router.get("/api/v1/system/status")
def system_status() -> dict:
    """Return local service and storage status."""
    return {
        "status": "healthy",
        "api": "ok",
        "renderer_url": settings.renderer_url,
        "storage": {
            "path": str(settings.storage_dir),
            "exists": settings.storage_dir.exists(),
        },
        "vectordb": {
            "path": str(settings.chroma_db_dir),
            "exists": settings.chroma_db_dir.exists(),
        },
        "sqlite": {
            "path": str(Path(DB_PATH)),
            "exists": Path(DB_PATH).exists(),
        },
    }
