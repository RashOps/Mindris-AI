"""Health and system status routes."""

import os
from pathlib import Path
from typing import Any

from auth import auth_boundary_contract, verify_api_key
from database.session import DB_PATH, engine
from fastapi import APIRouter, Depends
from intelligence.llm_config import provider_configuration_status
from monitoring import monitor
from schemas import (
    SystemConfigurationItem,
    SystemConfigurationLLM,
    SystemConfigurationProviderStatus,
    SystemConfigurationRuntime,
    SystemConfigurationSecrets,
    SystemConfigurationSecretSlot,
    SystemConfigurationStorage,
    SystemConfigurationTaskDefault,
    SystemConfigurationUpdateRequest,
    SystemDiagnosticsItem,
    SystemDiagnosticsOllama,
    SystemDiagnosticsService,
    SystemSecretUpdateRequest,
)
from sqlalchemy import text
from utils.config import settings
from utils.logger import get_logger
from utils.runtime_config import (
    load_runtime_configuration,
    save_runtime_configuration,
    secret_slot_configured,
    set_secret_slot,
)

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


@router.get("/api/v1/system/auth-mode")
async def system_auth_mode() -> dict:
    """Return the public local-vs-hosted auth contract."""
    return {"status": "success", "item": auth_boundary_contract()}


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


@router.get("/api/v1/system/metrics")
async def runtime_metrics() -> dict:
    """Return lightweight in-memory runtime metrics."""
    return monitor.snapshot(readiness=await readiness_checks())


@router.get("/api/v1/system/configuration")
async def system_configuration(_: None = Depends(verify_api_key)) -> dict:
    """Return backend-owned runtime configuration without exposing secrets."""
    return {
        "status": "success",
        "item": _configuration_payload(),
    }


@router.put("/api/v1/system/configuration")
async def update_system_configuration(
    request: SystemConfigurationUpdateRequest,
    _: None = Depends(verify_api_key),
) -> dict:
    """Persist backend-owned app configuration."""
    payload: dict[str, Any] = {}
    if request.defaults is not None:
        payload["defaults"] = {
            task: config.model_dump(mode="json")
            for task, config in request.defaults.items()
        }
    if request.pdf_ingestion_mode is not None:
        payload["pdf_ingestion_mode"] = request.pdf_ingestion_mode
    save_runtime_configuration(payload)
    return {"status": "success", "item": _configuration_payload()}


@router.put("/api/v1/system/secrets/{slot}")
async def update_system_secret(
    slot: str,
    request: SystemSecretUpdateRequest,
    _: None = Depends(verify_api_key),
) -> dict:
    """Persist a write-only secret slot on the backend."""
    set_secret_slot(slot, request.value)
    return {
        "status": "success",
        "item": {"slot": slot, "configured": True, "masked": True},
    }


@router.get("/api/v1/system/ollama-models")
async def system_ollama_models(_: None = Depends(verify_api_key)) -> dict:
    """Return best-effort discovered local Ollama models for configuration UI."""
    return {"status": "success", "items": _discover_ollama_models()}


@router.get("/api/v1/system/diagnostics")
async def system_diagnostics(_: None = Depends(verify_api_key)) -> dict:
    """Return aggregated backend-owned diagnostics for configuration UI."""
    api_status = await readiness_checks()
    return {
        "status": "success",
        "item": SystemDiagnosticsItem(
            api=api_status,
            renderer=SystemDiagnosticsService.model_validate(_renderer_diagnostics()),
            ollama=SystemDiagnosticsOllama.model_validate(_ollama_diagnostics()),
            storage=SystemConfigurationStorage(
                logs_dir=str(settings.logs_dir),
                storage_dir=str(settings.storage_dir),
                chroma_db_dir=str(settings.chroma_db_dir),
            ),
            runtime=SystemConfigurationRuntime(
                renderer_url=settings.renderer_url,
                service_timeout_seconds=settings.service_timeout_seconds,
                pipeline_timeout_seconds=settings.pipeline_timeout_seconds,
                max_pdf_upload_bytes=settings.max_pdf_upload_bytes,
                ollama_api_base=settings.ollama_api_base,
                llm_num_ctx=settings.llm_num_ctx,
                scraper_timeout_ms=settings.scraper_timeout_ms,
                scraper_headless=settings.scraper_headless,
                scraper_strategy=settings.scraper_strategy,
                scraper_proxy_fallback=settings.scraper_proxy_fallback,
                log_level=settings.log_level,
            ),
        ).model_dump(mode="json"),
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


def _secret_slot(value: object | None) -> SystemConfigurationSecretSlot:
    configured = False
    if value is not None:
        getter = getattr(value, "get_secret_value", None)
        configured = bool(getter()) if callable(getter) else bool(value)
    return SystemConfigurationSecretSlot(configured=configured)


def _stored_secret_slot(
    slot: str,
    value: object | None,
) -> SystemConfigurationSecretSlot:
    fallback = value if hasattr(value, "get_secret_value") else None
    return SystemConfigurationSecretSlot(
        configured=secret_slot_configured(slot, fallback),
    )


def _configuration_payload() -> dict[str, Any]:
    app_config = load_runtime_configuration()
    return SystemConfigurationItem(
        runtime=SystemConfigurationRuntime(
            renderer_url=settings.renderer_url,
            service_timeout_seconds=settings.service_timeout_seconds,
            pipeline_timeout_seconds=settings.pipeline_timeout_seconds,
            max_pdf_upload_bytes=settings.max_pdf_upload_bytes,
            ollama_api_base=settings.ollama_api_base,
            llm_num_ctx=settings.llm_num_ctx,
            scraper_timeout_ms=settings.scraper_timeout_ms,
            scraper_headless=settings.scraper_headless,
            scraper_strategy=settings.scraper_strategy,
            scraper_proxy_fallback=settings.scraper_proxy_fallback,
            log_level=settings.log_level,
        ),
        storage=SystemConfigurationStorage(
            logs_dir=str(settings.logs_dir),
            storage_dir=str(settings.storage_dir),
            chroma_db_dir=str(settings.chroma_db_dir),
        ),
        llm=SystemConfigurationLLM(
            defaults={
                task: SystemConfigurationTaskDefault.model_validate(config)
                for task, config in app_config["defaults"].items()
            },
            providers={
                provider: SystemConfigurationProviderStatus.model_validate(status)
                for provider, status in provider_configuration_status().items()
            },
        ),
        app=app_config,
        secrets=SystemConfigurationSecrets(
            api_key=_stored_secret_slot("api_key", settings.api_key),
            openai_api_key=_stored_secret_slot(
                "openai_api_key",
                settings.openai_api_key,
            ),
            groq_api_key=_stored_secret_slot("groq_api_key", settings.groq_api_key),
            gemini_api_key=_stored_secret_slot(
                "gemini_api_key",
                settings.gemini_api_key,
            ),
            mistral_api_key=_stored_secret_slot(
                "mistral_api_key",
                settings.mistral_api_key,
            ),
            llama_cloud_api_key=_stored_secret_slot(
                "llama_cloud_api_key",
                settings.llama_cloud_api_key,
            ),
            scrape_do_api_key=_stored_secret_slot(
                "scrape_do_api_key",
                settings.scrape_do_api_key,
            ),
            scrapingbee_api_key=_stored_secret_slot(
                "scrapingbee_api_key",
                settings.scrapingbee_api_key,
            ),
        ),
    ).model_dump(mode="json")


def _discover_ollama_models() -> list[dict[str, str]]:
    return _ollama_diagnostics()["items"]


def _renderer_diagnostics() -> dict[str, Any]:
    try:
        import httpx

        response = httpx.get(
            f"{settings.renderer_url.rstrip('/')}/ready",
            timeout=2.0,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # pragma: no cover - exercised against local runtime
        return {
            "status": "unreachable",
            "url": settings.renderer_url,
            "reachable": False,
            "checks": {},
            "error": str(exc),
        }

    return {
        "status": payload.get("status", "ready"),
        "url": settings.renderer_url,
        "reachable": True,
        "checks": payload.get("checks", {}),
        "error": None,
    }


def _ollama_diagnostics() -> dict[str, Any]:
    try:
        import httpx

        response = httpx.get(
            f"{settings.ollama_api_base.rstrip('/')}/api/tags",
            timeout=2.0,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # pragma: no cover - exercised against local runtime
        return {
            "status": "unreachable",
            "base_url": settings.ollama_api_base,
            "reachable": False,
            "model_count": 0,
            "items": [],
            "error": str(exc),
        }

    models = payload.get("models")
    if not isinstance(models, list):
        return {
            "status": "degraded",
            "base_url": settings.ollama_api_base,
            "reachable": True,
            "model_count": 0,
            "items": [],
            "error": "Invalid Ollama payload.",
        }

    discovered = []
    for item in models:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        discovered.append({"id": name, "label": name})
    return {
        "status": "ready",
        "base_url": settings.ollama_api_base,
        "reachable": True,
        "model_count": len(discovered),
        "items": discovered,
        "error": None,
    }
