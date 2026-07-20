"""Single backend source of truth for LLM models and task defaults."""

from __future__ import annotations

from functools import lru_cache

from utils.config import settings
from utils.runtime_config import DEFAULT_TASK_CONFIGURATION, resolve_secret_slot

from .model_discovery import (
    GeminiModelDiscoveryAdapter,
    HttpModelDiscoveryAdapter,
    parse_gemini_models,
    parse_groq_models,
    parse_mistral_models,
    parse_ollama_models,
    parse_openai_models,
)
from .model_registry import ModelDescriptor, ModelRegistry

SUPPORTED_PROVIDERS = ("groq", "gemini", "openai", "mistral", "ollama")

TASK_DEFAULTS = DEFAULT_TASK_CONFIGURATION

_DEFAULT_FALLBACKS = (
    ("groq", "llama-3.3-70b-versatile"),
    ("groq", "llama-3.1-8b-instant"),
    ("openai", "gpt-4o-mini"),
    ("mistral", "mistral-small-latest"),
    ("gemini", "gemini-2.5-flash"),
    ("ollama", "llama3.2"),
)
TASK_FALLBACKS: dict[str, tuple[tuple[str, str], ...]] = dict.fromkeys(
    TASK_DEFAULTS, _DEFAULT_FALLBACKS
)


def _model(provider: str, model_id: str, label: str) -> ModelDescriptor:
    return ModelDescriptor(
        id=model_id,
        label=label,
        provider=provider,
        source="bootstrap",
    )


# Minimal offline safety net. Configured providers replace these entries on refresh.
BOOTSTRAP_CATALOGUE = {
    "groq": [
        _model("groq", "llama-3.3-70b-versatile", "Llama 3.3 70B"),
        _model("groq", "llama-3.1-8b-instant", "Llama 3.1 8B"),
    ],
    "gemini": [_model("gemini", "gemini-2.5-flash", "Gemini 2.5 Flash")],
    "openai": [_model("openai", "gpt-4o-mini", "GPT-4o mini")],
    "mistral": [_model("mistral", "mistral-small-latest", "Mistral Small (latest)")],
    "ollama": [_model("ollama", "llama3.2", "Llama 3.2 (local)")],
}


def provider_configuration_status() -> dict[str, dict[str, str | bool]]:
    """Return secret-safe provider availability metadata."""
    cloud_reason = "Configure this provider in backend secret slots."
    secrets = {
        "groq": resolve_secret_slot("groq_api_key", settings.groq_api_key),
        "gemini": resolve_secret_slot("gemini_api_key", settings.gemini_api_key),
        "openai": resolve_secret_slot("openai_api_key", settings.openai_api_key),
        "mistral": resolve_secret_slot("mistral_api_key", settings.mistral_api_key),
    }
    status = {
        provider: {
            "configured": bool(secret),
            "mode": "cloud",
            "reason": "" if secret else cloud_reason,
        }
        for provider, secret in secrets.items()
    }
    ollama_url = settings.ollama_api_base.strip()
    status["ollama"] = {
        "configured": bool(ollama_url),
        "mode": "local",
        "reason": "" if ollama_url else "Set OLLAMA_API_BASE to an Ollama endpoint.",
    }
    return status


def _secret(slot: str):  # noqa: ANN202
    fallback = getattr(settings, slot)
    return lambda: resolve_secret_slot(slot, fallback)


@lru_cache(maxsize=1)
def get_model_registry() -> ModelRegistry:
    """Build the process-wide registry without performing network I/O."""
    adapters = {
        "openai": HttpModelDiscoveryAdapter(
            "openai",
            "https://api.openai.com/v1/models",
            parse_openai_models,
            api_key=_secret("openai_api_key"),
        ),
        "groq": HttpModelDiscoveryAdapter(
            "groq",
            "https://api.groq.com/openai/v1/models",
            parse_groq_models,
            api_key=_secret("groq_api_key"),
        ),
        "gemini": GeminiModelDiscoveryAdapter(
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta/models",
            parse_gemini_models,
            api_key=_secret("gemini_api_key"),
            auth_header="x-goog-api-key",
            auth_prefix="",
        ),
        "mistral": HttpModelDiscoveryAdapter(
            "mistral",
            "https://api.mistral.ai/v1/models",
            parse_mistral_models,
            api_key=_secret("mistral_api_key"),
        ),
        "ollama": HttpModelDiscoveryAdapter(
            "ollama",
            f"{settings.ollama_api_base.rstrip('/')}/api/tags",
            parse_ollama_models,
        ),
    }
    return ModelRegistry(
        cache_path=settings.storage_dir / "model-registry.json",
        adapters=adapters,
        bootstrap_catalogue=BOOTSTRAP_CATALOGUE,
        configured=lambda provider: bool(
            provider_configuration_status().get(provider, {}).get("configured")
        ),
    )


def catalogue_payload() -> dict[str, object]:
    """Merge discovery diagnostics with operator configuration metadata."""
    snapshot = get_model_registry().snapshot()
    discovery = snapshot.get("providers", {})
    statuses = provider_configuration_status()
    snapshot["providers"] = {
        provider: {**dict(discovery.get(provider, {})), **status}
        for provider, status in statuses.items()
    }
    snapshot["defaults"] = TASK_DEFAULTS
    return snapshot


def validate_llm_selection(provider: str, model_name: str) -> None:
    """Validate an explicit provider/model pair against the current snapshot."""
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(f"Unsupported LLM provider: '{provider}'.")
    models = get_model_registry().snapshot()["catalogue"].get(provider, [])
    if not any(model.get("id") == model_name for model in models):
        raise ValueError(f"Unsupported model '{model_name}' for provider '{provider}'.")
