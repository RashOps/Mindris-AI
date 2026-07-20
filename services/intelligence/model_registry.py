"""Backend-owned discovery, caching, and resolution of LLM models."""

from __future__ import annotations

import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from typing import Protocol


class ModelRegistryError(RuntimeError):
    """Raised when model discovery or resolution cannot produce a safe result."""


@dataclass(frozen=True, slots=True)
class ModelDescriptor:
    """Normalized model metadata independent from provider response shapes."""

    id: str
    label: str
    provider: str
    capabilities: tuple[str, ...] = ("chat",)
    context_window: int | None = None
    lifecycle: str = "unknown"
    source: str = "provider"

    def public_dict(self, *, last_seen_at: str | None = None) -> dict[str, object]:
        """Return the stable API/cache representation."""
        payload = asdict(self)
        payload["capabilities"] = list(self.capabilities)
        payload["available"] = True
        payload["last_seen_at"] = last_seen_at
        return payload


@dataclass(frozen=True, slots=True)
class ModelResolution:
    """Resolved backend model while preserving the user's requested value."""

    provider: str
    model_id: str
    requested_provider: str
    requested_model_id: str
    used_fallback: bool


class ModelDiscoveryAdapter(Protocol):
    """Provider-specific model discovery contract."""

    def discover(self) -> list[ModelDescriptor]:
        """Return normalized models currently available to the configured user."""


class ModelRegistry:
    """Keep the last valid model catalogue and refresh configured providers."""

    def __init__(
        self,
        *,
        cache_path: Path,
        adapters: Mapping[str, ModelDiscoveryAdapter],
        bootstrap_catalogue: Mapping[str, Sequence[ModelDescriptor]],
        configured: Callable[[str], bool],
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self.cache_path = cache_path
        self.adapters = dict(adapters)
        self.bootstrap_catalogue = {
            provider: list(models) for provider, models in bootstrap_catalogue.items()
        }
        self.configured = configured
        self.now = now or (lambda: datetime.now(UTC))
        self._lock = RLock()
        self._state = self._load_cache() or self._bootstrap_state()

    def snapshot(self) -> dict[str, object]:
        """Return a detached JSON-compatible snapshot without network access."""
        with self._lock:
            return json.loads(json.dumps(self._state))

    def refresh(self, providers: Sequence[str] | None = None) -> dict[str, object]:
        """Refresh configured providers while preserving last successful data."""
        with self._lock:
            state = json.loads(json.dumps(self._state))
            catalogue = state.setdefault("catalogue", {})
            metadata = state.setdefault("providers", {})
            provider_names = list(
                providers
                or dict.fromkeys(
                    [
                        *self.bootstrap_catalogue.keys(),
                        *self.adapters.keys(),
                        *catalogue.keys(),
                    ]
                )
            )
            refreshed_at = self._iso_now()

            for provider in provider_names:
                is_configured = self.configured(provider)
                previous = list(catalogue.get(provider, []))
                provider_meta = dict(metadata.get(provider, {}))
                provider_meta["configured"] = is_configured

                if not is_configured:
                    provider_meta.update(
                        {
                            "source": provider_meta.get("source", "bootstrap"),
                            "stale": bool(previous),
                            "error": None,
                        }
                    )
                    metadata[provider] = provider_meta
                    continue

                adapter = self.adapters.get(provider)
                if adapter is None:
                    provider_meta.update(
                        {
                            "source": provider_meta.get("source", "bootstrap"),
                            "stale": True,
                            "error": "No discovery adapter configured.",
                        }
                    )
                    metadata[provider] = provider_meta
                    continue

                try:
                    discovered = self._deduplicate_descriptors(
                        [
                            model
                            for model in adapter.discover()
                            if model.provider == provider
                            and "chat" in model.capabilities
                            and model.id.strip()
                        ]
                    )
                    if not discovered:
                        raise ModelRegistryError(
                            f"Provider '{provider}' returned no compatible chat models."
                        )
                    discovered.sort(
                        key=lambda model: (model.label.casefold(), model.id)
                    )
                    catalogue[provider] = [
                        model.public_dict(last_seen_at=refreshed_at)
                        for model in discovered
                    ]
                    provider_meta.update(
                        {
                            "source": "provider",
                            "stale": False,
                            "error": None,
                            "last_success_at": refreshed_at,
                        }
                    )
                except Exception as exc:  # adapters normalize transport failures
                    if not previous:
                        previous = self._bootstrap_models(provider)
                    catalogue[provider] = previous
                    provider_meta.update(
                        {
                            "source": provider_meta.get("source", "bootstrap"),
                            "stale": True,
                            "error": str(exc),
                        }
                    )
                metadata[provider] = provider_meta

            state["updated_at"] = refreshed_at
            self._state = state
            self._write_cache(state)
            return self.snapshot()

    def resolve(
        self,
        *,
        provider: str,
        model_id: str,
        fallbacks: Sequence[tuple[str, str]],
        capability: str = "chat",
    ) -> ModelResolution:
        """Resolve a compatible selection and report any fallback explicitly."""
        requested = (provider, model_id)
        for candidate_provider, candidate_model in (requested, *fallbacks):
            if self._supports(candidate_provider, candidate_model, capability):
                return ModelResolution(
                    provider=candidate_provider,
                    model_id=candidate_model,
                    requested_provider=provider,
                    requested_model_id=model_id,
                    used_fallback=(candidate_provider, candidate_model) != requested,
                )
        raise ModelRegistryError(
            f"No compatible {capability} model is available for "
            f"'{provider}/{model_id}'."
        )

    def _supports(self, provider: str, model_id: str, capability: str) -> bool:
        if not self.configured(provider):
            return False
        models = self._state.get("catalogue", {}).get(provider, [])
        return any(
            item.get("id") == model_id
            and capability in item.get("capabilities", [])
            and item.get("available", True)
            for item in models
            if isinstance(item, dict)
        )

    def _bootstrap_state(self) -> dict[str, object]:
        return {
            "updated_at": None,
            "catalogue": {
                provider: [
                    model.public_dict()
                    for model in self._deduplicate_descriptors(models)
                ]
                for provider, models in self.bootstrap_catalogue.items()
            },
            "providers": {
                provider: {
                    "configured": self.configured(provider),
                    "source": "bootstrap",
                    "stale": True,
                    "error": None,
                    "last_success_at": None,
                }
                for provider in self.bootstrap_catalogue
            },
        }

    def _bootstrap_models(self, provider: str) -> list[dict[str, object]]:
        return [
            model.public_dict()
            for model in self._deduplicate_descriptors(
                self.bootstrap_catalogue.get(provider, [])
            )
        ]

    def _load_cache(self) -> dict[str, object] | None:
        if not self.cache_path.exists():
            return None
        try:
            payload = json.loads(self.cache_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        if not isinstance(payload, dict):
            return None
        if not isinstance(payload.get("catalogue"), dict):
            return None
        if not isinstance(payload.get("providers"), dict):
            return None
        payload["catalogue"] = {
            provider: self._deduplicate_payload(models)
            for provider, models in payload["catalogue"].items()
            if isinstance(models, list)
        }
        return payload

    @staticmethod
    def _deduplicate_descriptors(
        models: Sequence[ModelDescriptor],
    ) -> list[ModelDescriptor]:
        """Keep one stable entry per provider model id."""
        unique: dict[str, ModelDescriptor] = {}
        for model in models:
            model_id = model.id.strip()
            if model_id and model_id not in unique:
                unique[model_id] = model
        return list(unique.values())

    @staticmethod
    def _deduplicate_payload(models: list[object]) -> list[dict[str, object]]:
        """Repair duplicate ids from caches written by older versions."""
        unique: dict[str, dict[str, object]] = {}
        for model in models:
            if not isinstance(model, dict):
                continue
            model_id = model.get("id")
            if isinstance(model_id, str) and model_id.strip():
                unique.setdefault(model_id.strip(), model)
        return list(unique.values())

    def _write_cache(self, state: dict[str, object]) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.cache_path.with_suffix(f"{self.cache_path.suffix}.tmp")
        temporary.write_text(
            json.dumps(state, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temporary.replace(self.cache_path)

    def _iso_now(self) -> str:
        current = self.now()
        if current.tzinfo is None:
            current = current.replace(tzinfo=UTC)
        return current.astimezone(UTC).isoformat()
