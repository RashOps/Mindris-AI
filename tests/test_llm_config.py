"""LLM configuration guardrail tests."""

from intelligence.llm_config import ensure_provider_configured, provider_configuration_status


def test_provider_configuration_status_exposes_local_and_cloud_modes() -> None:
    status = provider_configuration_status()
    assert status["ollama"]["mode"] == "local"
    assert status["groq"]["mode"] == "cloud"


def test_ollama_provider_is_configured_by_default_base_url() -> None:
    ensure_provider_configured("ollama")
