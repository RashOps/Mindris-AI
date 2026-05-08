"""LLM factory for Mindris AI CrewAI pipelines.

Reads configuration from the central :mod:`utils.config` settings object and
returns a fully initialised :class:`crewai.LLM` instance.
"""

from crewai import LLM

from utils.config import settings


def get_llm() -> LLM:
    """Build and return the LLM configured in the environment.

    For Ollama targets the model identifier is prefixed with ``ollama/`` so
    that LiteLLM routes to the correct provider.  The ``extra_body`` trick
    injects ``options.num_ctx`` into the raw request body — the only reliable
    way to raise the context window when using the OpenAI-compatible endpoint.

    Returns:
        A :class:`crewai.LLM` ready to be attached to an agent.
    """
    if settings.llm_type == "ollama":
        model_name = settings.openai_model_name
        if not model_name.startswith("ollama/"):
            model_name = f"ollama/{model_name}"

        return LLM(
            model=model_name,
            base_url=settings.openai_api_base,
            # Inject num_ctx via extra_body: the only way that works through
            # the OpenAI-compatible endpoint without crashing the SDK parser.
            extra_body={"options": {"num_ctx": settings.llm_num_ctx}},
            # Local GPU models can be slow — 10 minutes before giving up.
            timeout=600,
        )

    # Generic fallback (OpenAI, Anthropic, etc.)
    return LLM(model=settings.openai_model_name)
