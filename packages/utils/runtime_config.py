"""Backend-owned runtime configuration and secret-slot helpers."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from pydantic import SecretStr

from .config import settings
from .logger import get_logger

logger = get_logger(__name__, service_name="utils")

CONFIG_PATH = settings.storage_dir / "runtime-config.json"
SECRETS_PATH = settings.storage_dir / "runtime-secrets.json"

DEFAULT_TASK_CONFIGURATION: dict[str, dict[str, str]] = {
    "optimize": {"provider": "groq", "model_name": "llama-3.3-70b-versatile"},
    "cover_letter": {"provider": "groq", "model_name": "llama-3.3-70b-versatile"},
    "ats_score": {"provider": "groq", "model_name": "llama-3.1-8b-instant"},
    "patch": {"provider": "groq", "model_name": "llama-3.3-70b-versatile"},
}

DEFAULT_APP_CONFIGURATION: dict[str, Any] = {
    "defaults": DEFAULT_TASK_CONFIGURATION,
    "pdf_ingestion_mode": "auto",
    "ui_locale": "fr",
}

SECRET_SLOTS = {
    "api_key",
    "openai_api_key",
    "groq_api_key",
    "gemini_api_key",
    "mistral_api_key",
    "llama_cloud_api_key",
    "scrape_do_api_key",
    "scrapingbee_api_key",
}


def _read_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return fallback
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.warning("Failed to read runtime JSON from %s; using fallback.", path)
        return fallback
    return data if isinstance(data, dict) else fallback


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        logger.debug("Could not chmod %s to 0600", path)


def load_runtime_configuration() -> dict[str, Any]:
    """Return backend-owned app configuration persisted outside the frontend."""
    current = _read_json(CONFIG_PATH, {})
    merged = json.loads(json.dumps(DEFAULT_APP_CONFIGURATION))
    if isinstance(current.get("defaults"), dict):
        for task, config in current["defaults"].items():
            if task in merged["defaults"] and isinstance(config, dict):
                merged["defaults"][task].update(
                    {
                        "provider": config.get(
                            "provider",
                            merged["defaults"][task]["provider"],
                        ),
                        "model_name": config.get(
                            "model_name",
                            merged["defaults"][task]["model_name"],
                        ),
                    }
                )
    if current.get("pdf_ingestion_mode") in {"auto", "llama_parse", "local_text"}:
        merged["pdf_ingestion_mode"] = current["pdf_ingestion_mode"]
    if current.get("ui_locale") in {"fr", "en"}:
        merged["ui_locale"] = current["ui_locale"]
    return merged


def save_runtime_configuration(config: dict[str, Any]) -> dict[str, Any]:
    """Persist backend-owned app configuration and return the normalized state."""
    current = load_runtime_configuration()
    defaults = config.get("defaults")
    if isinstance(defaults, dict):
        for task, task_config in defaults.items():
            if task in current["defaults"] and isinstance(task_config, dict):
                provider = task_config.get("provider")
                model_name = task_config.get("model_name")
                if isinstance(provider, str) and provider:
                    current["defaults"][task]["provider"] = provider
                if isinstance(model_name, str) and model_name:
                    current["defaults"][task]["model_name"] = model_name
    if config.get("pdf_ingestion_mode") in {"auto", "llama_parse", "local_text"}:
        current["pdf_ingestion_mode"] = config["pdf_ingestion_mode"]
    if config.get("ui_locale") in {"fr", "en"}:
        current["ui_locale"] = config["ui_locale"]
    _write_json(CONFIG_PATH, current)
    return current


def _load_secret_slots() -> dict[str, str]:
    raw = _read_json(SECRETS_PATH, {})
    return {
        key: value
        for key, value in raw.items()
        if key in SECRET_SLOTS and isinstance(value, str) and value.strip()
    }


def set_secret_slot(slot: str, value: str) -> None:
    """Persist a single write-only secret slot on the backend."""
    if slot not in SECRET_SLOTS:
        raise ValueError(f"Unsupported secret slot '{slot}'.")
    current = _load_secret_slots()
    current[slot] = value.strip()
    _write_json(SECRETS_PATH, current)


def resolve_secret_slot(slot: str, fallback: SecretStr | None = None) -> str | None:
    """Resolve a secret slot from backend storage first, then environment settings."""
    stored = _load_secret_slots().get(slot)
    if stored:
        return stored
    if fallback is None:
        return None
    return fallback.get_secret_value()


def secret_slot_configured(slot: str, fallback: SecretStr | None = None) -> bool:
    """Return whether a secret slot is configured by storage or environment."""
    return bool(resolve_secret_slot(slot, fallback))


def iter_configured_secret_values() -> list[str]:
    """Return the current non-empty backend-managed secret values."""
    values = list(_load_secret_slots().values())
    fallback_map = {
        "api_key": settings.api_key,
        "openai_api_key": settings.openai_api_key,
        "groq_api_key": settings.groq_api_key,
        "gemini_api_key": settings.gemini_api_key,
        "mistral_api_key": settings.mistral_api_key,
        "llama_cloud_api_key": settings.llama_cloud_api_key,
        "scrape_do_api_key": settings.scrape_do_api_key,
        "scrapingbee_api_key": settings.scrapingbee_api_key,
    }
    for slot, fallback in fallback_map.items():
        value = resolve_secret_slot(slot, fallback)
        if value:
            values.append(value)
    return sorted({value for value in values if value})
