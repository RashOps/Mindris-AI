"""Backend-owned dynamic LLM model registry contracts."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

import pytest
from intelligence.model_registry import (
    ModelDescriptor,
    ModelRegistry,
    ModelRegistryError,
)


class StubAdapter:
    """Deterministic provider adapter used by registry tests."""

    def __init__(self, models: list[ModelDescriptor] | Exception) -> None:
        self.models = models
        self.calls = 0

    def discover(self) -> list[ModelDescriptor]:
        self.calls += 1
        if isinstance(self.models, Exception):
            raise self.models
        return self.models


def descriptor(
    model_id: str,
    *,
    provider: str = "groq",
    capabilities: tuple[str, ...] = ("chat",),
) -> ModelDescriptor:
    """Build a concise test descriptor."""
    return ModelDescriptor(
        id=model_id,
        label=model_id,
        provider=provider,
        capabilities=capabilities,
        context_window=131_072,
        lifecycle="stable",
        source="provider",
    )


def test_registry_refreshes_configured_providers_and_persists_cache(tmp_path) -> None:
    now = datetime(2026, 7, 19, 9, 0, tzinfo=UTC)
    adapter = StubAdapter(
        [
            descriptor("llama-chat"),
            descriptor("whisper-audio", capabilities=("audio",)),
        ]
    )
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={"groq": adapter},
        bootstrap_catalogue={"groq": [descriptor("bootstrap-chat")]},
        configured=lambda provider: provider == "groq",
        now=lambda: now,
    )

    snapshot = registry.refresh()

    assert adapter.calls == 1
    assert [item["id"] for item in snapshot["catalogue"]["groq"]] == ["llama-chat"]
    assert snapshot["providers"]["groq"]["source"] == "provider"
    assert snapshot["providers"]["groq"]["stale"] is False
    assert (tmp_path / "model-registry.json").exists()

    restored = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={},
        bootstrap_catalogue={},
        configured=lambda _provider: False,
        now=lambda: now + timedelta(hours=1),
    ).snapshot()
    assert restored["catalogue"]["groq"][0]["id"] == "llama-chat"


def test_registry_preserves_last_successful_models_when_refresh_fails(tmp_path) -> None:
    now = datetime(2026, 7, 19, 9, 0, tzinfo=UTC)
    working = StubAdapter([descriptor("llama-chat")])
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={"groq": working},
        bootstrap_catalogue={"groq": [descriptor("bootstrap-chat")]},
        configured=lambda _provider: True,
        now=lambda: now,
    )
    registry.refresh()

    failing = StubAdapter(ModelRegistryError("provider unavailable"))
    degraded = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={"groq": failing},
        bootstrap_catalogue={"groq": [descriptor("bootstrap-chat")]},
        configured=lambda _provider: True,
        now=lambda: now + timedelta(hours=8),
    ).refresh()

    assert degraded["catalogue"]["groq"][0]["id"] == "llama-chat"
    assert degraded["providers"]["groq"]["stale"] is True
    assert degraded["providers"]["groq"]["error"] == "provider unavailable"


def test_registry_does_not_contact_unconfigured_cloud_provider(tmp_path) -> None:
    adapter = StubAdapter([descriptor("llama-chat")])
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={"groq": adapter},
        bootstrap_catalogue={"groq": [descriptor("bootstrap-chat")]},
        configured=lambda _provider: False,
    )

    snapshot = registry.refresh()

    assert adapter.calls == 0
    assert snapshot["catalogue"]["groq"][0]["id"] == "bootstrap-chat"
    assert snapshot["providers"]["groq"]["configured"] is False


def test_registry_resolves_explicit_fallback_without_mutating_preference(
    tmp_path,
) -> None:
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={},
        bootstrap_catalogue={
            "groq": [descriptor("available-groq")],
            "ollama": [
                descriptor("local-model", provider="ollama"),
            ],
        },
        configured=lambda _provider: True,
    )

    resolution = registry.resolve(
        provider="groq",
        model_id="removed-model",
        fallbacks=(("groq", "available-groq"), ("ollama", "local-model")),
    )

    assert resolution.provider == "groq"
    assert resolution.model_id == "available-groq"
    assert resolution.used_fallback is True
    assert resolution.requested_model_id == "removed-model"


def test_registry_rejects_selection_without_compatible_fallback(tmp_path) -> None:
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={},
        bootstrap_catalogue={"groq": [descriptor("audio", capabilities=("audio",))]},
        configured=lambda _provider: True,
    )

    with pytest.raises(ModelRegistryError, match="No compatible chat model"):
        registry.resolve(provider="groq", model_id="missing", fallbacks=())


def test_registry_does_not_resolve_models_from_unconfigured_provider(tmp_path) -> None:
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={},
        bootstrap_catalogue={"groq": [descriptor("bootstrap-chat")]},
        configured=lambda _provider: False,
    )

    with pytest.raises(ModelRegistryError, match="No compatible chat model"):
        registry.resolve(
            provider="groq",
            model_id="bootstrap-chat",
            fallbacks=(),
        )


def test_registry_deduplicates_provider_models_by_id(tmp_path) -> None:
    registry = ModelRegistry(
        cache_path=tmp_path / "model-registry.json",
        adapters={
            "mistral": StubAdapter(
                [
                    descriptor("mistral-large", provider="mistral"),
                    descriptor("mistral-large", provider="mistral"),
                ]
            )
        },
        bootstrap_catalogue={},
        configured=lambda provider: provider == "mistral",
    )

    snapshot = registry.refresh()

    assert [item["id"] for item in snapshot["catalogue"]["mistral"]] == [
        "mistral-large"
    ]


def test_registry_repairs_duplicate_entries_from_existing_cache(tmp_path) -> None:
    cache_path = tmp_path / "model-registry.json"
    cached = descriptor("mistral-medium", provider="mistral").public_dict()
    cache_path.write_text(
        json.dumps(
            {
                "updated_at": None,
                "catalogue": {"mistral": [cached, cached]},
                "providers": {"mistral": {}},
            }
        ),
        encoding="utf-8",
    )

    snapshot = ModelRegistry(
        cache_path=cache_path,
        adapters={},
        bootstrap_catalogue={},
        configured=lambda _provider: True,
    ).snapshot()

    assert len(snapshot["catalogue"]["mistral"]) == 1
