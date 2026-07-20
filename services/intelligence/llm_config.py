"""LLM factory for Mindris AI — multi-provider, multi-task support.

Supported providers : ollama | groq | gemini | openai | mistral

Default LLMs per task
---------------------
- optimize     : Groq  — llama-3.3-70b-versatile  (fast, high quality)
- cover_letter : Groq  — llama-3.3-70b-versatile  (creative writing)
- ats_score    : Groq  — llama-3.1-8b-instant      (lightweight scoring)
- patch        : Groq  — llama-3.3-70b-versatile

These can be overridden at runtime by passing provider/model_name.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from utils.config import settings
from utils.logger import get_logger
from utils.runtime_config import load_runtime_configuration, resolve_secret_slot

from .model_catalogue import (
    SUPPORTED_PROVIDERS,
    TASK_DEFAULTS,
    TASK_FALLBACKS,
    get_model_registry,
    provider_configuration_status,
)

if TYPE_CHECKING:
    from crewai import LLM

logger = get_logger(__name__, service_name="intelligence")


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
        api_key = resolve_secret_slot("groq_api_key", settings.groq_api_key)
        return LLM(model=name, api_key=api_key)

    if provider == "gemini":
        name = (
            model_name if model_name.startswith("gemini/") else f"gemini/{model_name}"
        )
        api_key = resolve_secret_slot("gemini_api_key", settings.gemini_api_key)
        return LLM(model=name, api_key=api_key)

    if provider == "openai":
        api_key = resolve_secret_slot("openai_api_key", settings.openai_api_key)
        return LLM(model=model_name, api_key=api_key)

    if provider == "mistral":
        name = (
            model_name if model_name.startswith("mistral/") else f"mistral/{model_name}"
        )
        api_key = resolve_secret_slot("mistral_api_key", settings.mistral_api_key)
        return LLM(model=name, api_key=api_key)

    raise ValueError(
        f"Unsupported LLM provider: '{provider}'. "
        f"Choose from: {list(SUPPORTED_PROVIDERS)}"
    )


def get_task_llm(task: str) -> LLM:
    """Return the default LLM for a given Mindris task.

    Args:
        task: One of 'optimize', 'cover_letter', 'ats_score', 'patch'.

    Returns:
        A configured :class:`crewai.LLM` for the given task.
    """
    cfg = load_runtime_configuration()["defaults"].get(task, TASK_DEFAULTS["optimize"])
    resolution = get_model_registry().resolve(
        provider=cfg["provider"],
        model_id=cfg["model_name"],
        fallbacks=TASK_FALLBACKS.get(task, TASK_FALLBACKS["optimize"]),
    )
    if resolution.used_fallback:
        logger.warning(
            "LLM fallback task=%s requested=%s/%s resolved=%s/%s",
            task,
            resolution.requested_provider,
            resolution.requested_model_id,
            resolution.provider,
            resolution.model_id,
        )
    return get_llm(provider=resolution.provider, model_name=resolution.model_id)
