"""LLM factory for Mindris AI CrewAI pipelines.

Reads configuration from the central :mod:`utils.config` settings object and
returns a fully initialised :class:`crewai.LLM` instance depending on the provider.
"""

from crewai import LLM
from utils.config import settings


def get_llm(provider: str = "ollama", model_name: str = "gemma4:32k") -> LLM:
    """Build and return the LLM configured for the specified provider.

    Args:
        provider: The LLM provider (e.g., "ollama", "groq", "gemini", "openai").
        model_name: The specific model name for the provider.

    Returns:
        A :class:`crewai.LLM` ready to be attached to an agent.

    Raises:
        ValueError: If an unsupported provider is specified.
    """
    if provider == "ollama":
        name = model_name
        if not name.startswith("ollama/"):
            name = f"ollama/{name}"
        return LLM(
            model=name,
            base_url=settings.ollama_api_base,
            # Inject num_ctx via extra_body: the only way that works through
            # the OpenAI-compatible endpoint without crashing the SDK parser.
            extra_body={"options": {"num_ctx": settings.llm_num_ctx}},
            # Local GPU models can be slow — 10 minutes before giving up.
            timeout=600,
        )

    elif provider == "groq":
        name = model_name
        if not name.startswith("groq/"):
            name = f"groq/{name}"
        api_key = settings.groq_api_key
        return LLM(
            model=name,
            api_key=api_key.get_secret_value() if api_key else None,
        )

    elif provider == "gemini":
        name = model_name
        if not name.startswith("gemini/"):
            name = f"gemini/{name}"
        api_key = settings.gemini_api_key
        return LLM(
            model=name,
            api_key=api_key.get_secret_value() if api_key else None,
        )

    elif provider == "openai":
        api_key = settings.openai_api_key
        return LLM(
            model=model_name,
            api_key=api_key.get_secret_value() if api_key else None,
        )

    raise ValueError(f"Provider not supported: {provider}")
