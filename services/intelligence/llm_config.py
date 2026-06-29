"""LLM factory for Mindris AI — multi-provider, multi-task support.

Supported providers : ollama | groq | gemini | openai | mistral

Default LLMs per task
---------------------
- optimize     : Groq  — llama-3.3-70b-versatile  (fast, high quality)
- cover_letter : Gemini — gemini-2.0-flash         (creative writing)
- ats_score    : Groq  — llama-3.1-8b-instant      (lightweight scoring)
- patch        : Groq  — llama-3.3-70b-versatile

These can be overridden at runtime by passing provider/model_name.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from utils.config import settings
from utils.logger import get_logger

if TYPE_CHECKING:
    from crewai import LLM

logger = get_logger(__name__, service_name="intelligence")

# ── Per-task defaults ─────────────────────────────────────────────────────────

TASK_DEFAULTS: dict[str, dict[str, str]] = {
    "optimize": {
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",
    },
    "cover_letter": {
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",  # Gemini when quota available
    },
    "ats_score": {
        "provider": "groq",
        "model_name": "llama-3.1-8b-instant",
    },
    "patch": {
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",
    },
}

# ── Model catalogue (for frontend selectors) ──────────────────────────────────

MODEL_CATALOGUE: dict[str, list[dict[str, str]]] = {
    "groq": [
        {"id": "llama-3.3-70b-versatile", "label": "Llama 3.3 70B"},
        {"id": "llama-3.1-8b-instant", "label": "Llama 3.1 8B (fast)"},
        {"id": "mixtral-8x7b-32768", "label": "Mixtral 8x7B"},
        {"id": "gemma2-9b-it", "label": "Gemma 2 9B"},
    ],
    "gemini": [
        {"id": "gemini-2.0-flash", "label": "Gemini 2.0 Flash"},
        {"id": "gemini-1.5-pro", "label": "Gemini 1.5 Pro"},
        {"id": "gemini-1.5-flash", "label": "Gemini 1.5 Flash"},
    ],
    "openai": [
        {"id": "gpt-4o", "label": "GPT-4o"},
        {"id": "gpt-4o-mini", "label": "GPT-4o Mini"},
        {"id": "gpt-4-turbo", "label": "GPT-4 Turbo"},
    ],
    "mistral": [
        {"id": "mistral-large-latest", "label": "Mistral Large"},
        {"id": "mistral-small-latest", "label": "Mistral Small"},
        {"id": "open-mistral-7b", "label": "Mistral 7B (open)"},
    ],
    "ollama": [
        {"id": "gemma4:32k", "label": "Gemma4 32K (local)"},
        {"id": "llama3.2", "label": "Llama 3.2 (local)"},
        {"id": "phi4", "label": "Phi-4 (local)"},
    ],
}


def provider_configuration_status() -> dict[str, dict[str, str | bool]]:
    """Return user-facing provider availability metadata."""
    return {
        "groq": {
            "configured": settings.groq_api_key is not None,
            "mode": "cloud",
            "reason": ""
            if settings.groq_api_key is not None
            else "Set GROQ_API_KEY in the environment.",
        },
        "gemini": {
            "configured": settings.gemini_api_key is not None,
            "mode": "cloud",
            "reason": ""
            if settings.gemini_api_key is not None
            else "Set GEMINI_API_KEY in the environment.",
        },
        "openai": {
            "configured": settings.openai_api_key is not None,
            "mode": "cloud",
            "reason": ""
            if settings.openai_api_key is not None
            else "Set OPENAI_API_KEY in the environment.",
        },
        "mistral": {
            "configured": settings.mistral_api_key is not None,
            "mode": "cloud",
            "reason": ""
            if settings.mistral_api_key is not None
            else "Set MISTRAL_API_KEY in the environment.",
        },
        "ollama": {
            "configured": bool(settings.ollama_api_base.strip()),
            "mode": "local",
            "reason": ""
            if settings.ollama_api_base.strip()
            else "Set OLLAMA_API_BASE to a local Ollama endpoint.",
        },
    }


def ensure_provider_configured(provider: str) -> None:
    """Raise a clear error when a selected provider is unavailable locally."""
    status = provider_configuration_status().get(provider)
    if not status:
        raise ValueError(f"Unsupported LLM provider: '{provider}'.")
    if status["configured"]:
        return
    raise ValueError(
        f"Provider '{provider}' is not configured on this instance. {status['reason']}"
    )


# ── Factory ───────────────────────────────────────────────────────────────────


def get_llm(
    provider: str = "groq",
    model_name: str = "llama-3.3-70b-versatile",
) -> LLM:
    """Build and return the LLM configured for the specified provider.

    Args:
        provider:   The LLM provider (ollama | groq | gemini | openai | mistral).
        model_name: The specific model name for the provider.

    Returns:
        A :class:`crewai.LLM` ready to be attached to an agent.

    Raises:
        ValueError: If an unsupported provider is specified.
    """
    from crewai import LLM

    ensure_provider_configured(provider)

    if provider == "ollama":
        name = (
            model_name if model_name.startswith("ollama/") else f"ollama/{model_name}"
        )
        return LLM(
            model=name,
            base_url=settings.ollama_api_base,
            extra_body={"options": {"num_ctx": settings.llm_num_ctx}},
            timeout=600,
        )

    if provider == "groq":
        name = model_name if model_name.startswith("groq/") else f"groq/{model_name}"
        api_key = settings.groq_api_key
        return LLM(model=name, api_key=api_key.get_secret_value() if api_key else None)

    if provider == "gemini":
        name = (
            model_name if model_name.startswith("gemini/") else f"gemini/{model_name}"
        )
        api_key = settings.gemini_api_key
        return LLM(model=name, api_key=api_key.get_secret_value() if api_key else None)

    if provider == "openai":
        api_key = settings.openai_api_key
        return LLM(
            model=model_name,
            api_key=api_key.get_secret_value() if api_key else None,
        )

    if provider == "mistral":
        name = (
            model_name if model_name.startswith("mistral/") else f"mistral/{model_name}"
        )
        api_key = settings.mistral_api_key
        return LLM(model=name, api_key=api_key.get_secret_value() if api_key else None)

    raise ValueError(
        f"Unsupported LLM provider: '{provider}'. "
        f"Choose from: {list(MODEL_CATALOGUE.keys())}"
    )


def get_task_llm(task: str) -> LLM:
    """Return the default LLM for a given Mindris task.

    Args:
        task: One of 'optimize', 'cover_letter', 'ats_score', 'patch'.

    Returns:
        A configured :class:`crewai.LLM` for the given task.
    """
    cfg = TASK_DEFAULTS.get(task, TASK_DEFAULTS["optimize"])
    return get_llm(provider=cfg["provider"], model_name=cfg["model_name"])
