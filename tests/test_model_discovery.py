"""Provider response normalization for dynamic model discovery."""

from intelligence.model_discovery import (
    parse_gemini_models,
    parse_groq_models,
    parse_mistral_models,
    parse_ollama_models,
    parse_openai_models,
)


def model_ids(models) -> list[str]:  # noqa: ANN001
    """Return normalized ids for concise assertions."""
    return [model.id for model in models]


def test_openai_parser_excludes_non_chat_families() -> None:
    models = parse_openai_models(
        {
            "data": [
                {"id": "gpt-5.2", "owned_by": "openai"},
                {"id": "gpt-4o-mini-transcribe", "owned_by": "openai"},
                {"id": "text-embedding-3-small", "owned_by": "openai"},
                {"id": "ft:gpt-4o-mini:mindris:test", "owned_by": "mindris"},
            ]
        }
    )

    assert model_ids(models) == ["gpt-5.2", "ft:gpt-4o-mini:mindris:test"]


def test_groq_parser_requires_active_chat_model() -> None:
    models = parse_groq_models(
        {
            "data": [
                {
                    "id": "llama-3.3-70b-versatile",
                    "active": True,
                    "context_window": 131072,
                },
                {"id": "whisper-large-v3", "active": True, "context_window": 448},
                {"id": "llama-guard-3-8b", "active": True, "context_window": 8192},
                {"id": "retired-chat", "active": False, "context_window": 8192},
            ]
        }
    )

    assert model_ids(models) == ["llama-3.3-70b-versatile"]
    assert models[0].context_window == 131072


def test_gemini_parser_uses_generate_content_capability() -> None:
    models = parse_gemini_models(
        {
            "models": [
                {
                    "name": "models/gemini-2.5-flash",
                    "displayName": "Gemini 2.5 Flash",
                    "inputTokenLimit": 1048576,
                    "supportedGenerationMethods": ["generateContent", "countTokens"],
                },
                {
                    "name": "models/gemini-embedding-001",
                    "displayName": "Gemini Embedding",
                    "supportedGenerationMethods": ["embedContent"],
                },
                {
                    "name": "models/gemini-preview-model",
                    "displayName": "Gemini Preview",
                    "supportedGenerationMethods": ["generateContent"],
                },
            ]
        }
    )

    assert model_ids(models) == ["gemini-2.5-flash", "gemini-preview-model"]
    assert models[0].context_window == 1048576
    assert models[1].lifecycle == "preview"


def test_mistral_parser_uses_capabilities_and_archived_status() -> None:
    models = parse_mistral_models(
        {
            "data": [
                {
                    "id": "mistral-small-latest",
                    "capabilities": {"completion_chat": True, "function_calling": True},
                    "max_context_length": 32768,
                    "aliases": ["mistral-small"],
                    "archived": False,
                },
                {
                    "id": "mistral-embed",
                    "capabilities": {"completion_chat": False},
                    "archived": False,
                },
                {
                    "id": "old-chat",
                    "capabilities": {"completion_chat": True},
                    "archived": True,
                },
            ]
        }
    )

    assert model_ids(models) == ["mistral-small-latest"]
    assert models[0].capabilities == ("chat", "tools")


def test_ollama_parser_uses_locally_installed_tags() -> None:
    models = parse_ollama_models(
        {
            "models": [
                {"name": "llama3.2:latest", "details": {"family": "llama"}},
                {
                    "name": "nomic-embed-text:latest",
                    "details": {"family": "nomic-bert"},
                },
            ]
        }
    )

    assert model_ids(models) == ["llama3.2:latest"]
