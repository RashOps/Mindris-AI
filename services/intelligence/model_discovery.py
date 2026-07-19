"""Provider adapters and response parsers for dynamic LLM discovery."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import httpx

from .model_registry import ModelDescriptor, ModelRegistryError

JsonObject = dict[str, Any]
Parser = Callable[[JsonObject], list[ModelDescriptor]]

_NON_CHAT_MARKERS = (
    "audio",
    "embed",
    "guard",
    "moderation",
    "realtime",
    "speech",
    "transcribe",
    "tts",
    "whisper",
)


def _lifecycle(model_id: str) -> str:
    lowered = model_id.casefold()
    if "experimental" in lowered or "-exp" in lowered:
        return "experimental"
    if "preview" in lowered:
        return "preview"
    if "latest" in lowered:
        return "rolling"
    return "stable"


def _is_chat_id(model_id: str) -> bool:
    lowered = model_id.casefold()
    return not any(marker in lowered for marker in _NON_CHAT_MARKERS)


def _items(payload: JsonObject, key: str) -> list[JsonObject]:
    value = payload.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def parse_openai_models(payload: JsonObject) -> list[ModelDescriptor]:
    """Normalize OpenAI models while excluding known non-chat families."""
    discovered: list[ModelDescriptor] = []
    for item in _items(payload, "data"):
        model_id = item.get("id")
        if not isinstance(model_id, str) or not _is_chat_id(model_id):
            continue
        if not (model_id.startswith(("gpt-", "chatgpt-", "o1", "o3", "o4", "ft:"))):
            continue
        discovered.append(
            ModelDescriptor(
                id=model_id,
                label=model_id,
                provider="openai",
                lifecycle=_lifecycle(model_id),
                source="provider",
            )
        )
    return discovered


def parse_groq_models(payload: JsonObject) -> list[ModelDescriptor]:
    """Normalize active Groq text-generation models."""
    discovered: list[ModelDescriptor] = []
    for item in _items(payload, "data"):
        model_id = item.get("id")
        if not isinstance(model_id, str) or not _is_chat_id(model_id):
            continue
        if item.get("active") is False:
            continue
        context_window = item.get("context_window")
        discovered.append(
            ModelDescriptor(
                id=model_id,
                label=model_id,
                provider="groq",
                context_window=context_window
                if isinstance(context_window, int)
                else None,
                lifecycle=_lifecycle(model_id),
                source="provider",
            )
        )
    return discovered


def parse_gemini_models(payload: JsonObject) -> list[ModelDescriptor]:
    """Normalize Gemini models supporting generateContent."""
    discovered: list[ModelDescriptor] = []
    for item in _items(payload, "models"):
        name = item.get("name")
        methods = item.get("supportedGenerationMethods", [])
        if not isinstance(name, str) or not isinstance(methods, list):
            continue
        if "generateContent" not in methods:
            continue
        model_id = name.removeprefix("models/")
        label = item.get("displayName")
        context_window = item.get("inputTokenLimit")
        capabilities = ["chat"]
        if "createCachedContent" in methods:
            capabilities.append("cache")
        discovered.append(
            ModelDescriptor(
                id=model_id,
                label=label if isinstance(label, str) and label else model_id,
                provider="gemini",
                capabilities=tuple(capabilities),
                context_window=context_window
                if isinstance(context_window, int)
                else None,
                lifecycle=_lifecycle(model_id),
                source="provider",
            )
        )
    return discovered


def parse_mistral_models(payload: JsonObject) -> list[ModelDescriptor]:
    """Normalize non-archived Mistral chat-completion models."""
    discovered: list[ModelDescriptor] = []
    for item in _items(payload, "data"):
        model_id = item.get("id")
        capabilities = item.get("capabilities")
        if not isinstance(model_id, str) or not isinstance(capabilities, dict):
            continue
        if (
            item.get("archived") is True
            or capabilities.get("completion_chat") is not True
        ):
            continue
        normalized_capabilities = ["chat"]
        if capabilities.get("function_calling") is True:
            normalized_capabilities.append("tools")
        if capabilities.get("vision") is True:
            normalized_capabilities.append("vision")
        context_window = item.get("max_context_length")
        discovered.append(
            ModelDescriptor(
                id=model_id,
                label=model_id,
                provider="mistral",
                capabilities=tuple(normalized_capabilities),
                context_window=context_window
                if isinstance(context_window, int)
                else None,
                lifecycle=_lifecycle(model_id),
                source="provider",
            )
        )
    return discovered


def parse_ollama_models(payload: JsonObject) -> list[ModelDescriptor]:
    """Normalize locally installed Ollama generation models."""
    discovered: list[ModelDescriptor] = []
    for item in _items(payload, "models"):
        model_id = item.get("name")
        if not isinstance(model_id, str) or not _is_chat_id(model_id):
            continue
        discovered.append(
            ModelDescriptor(
                id=model_id,
                label=model_id,
                provider="ollama",
                lifecycle="local",
                source="provider",
            )
        )
    return discovered


@dataclass(slots=True)
class HttpModelDiscoveryAdapter:
    """Discover one provider catalogue through a secret-safe HTTP request."""

    provider: str
    url: str
    parser: Parser
    api_key: Callable[[], str | None] = lambda: None
    auth_header: str = "Authorization"
    auth_prefix: str = "Bearer "
    timeout_seconds: float = 3.0

    def discover(self) -> list[ModelDescriptor]:
        """Fetch and normalize the provider model list."""
        key = self.api_key()
        headers: dict[str, str] = {"Accept": "application/json"}
        if key:
            headers[self.auth_header] = f"{self.auth_prefix}{key}"
        try:
            response = httpx.get(
                self.url,
                headers=headers,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            suffix = f" (HTTP {status})" if status else ""
            raise ModelRegistryError(
                f"{self.provider} model discovery failed{suffix}."
            ) from exc
        if not isinstance(payload, dict):
            raise ModelRegistryError(
                f"{self.provider} model discovery returned an invalid payload."
            )
        return self.parser(payload)


class GeminiModelDiscoveryAdapter(HttpModelDiscoveryAdapter):
    """Fetch all paginated Gemini model pages."""

    def discover(self) -> list[ModelDescriptor]:
        """Fetch and combine every Gemini models page."""
        key = self.api_key()
        headers = {"Accept": "application/json"}
        if key:
            headers[self.auth_header] = f"{self.auth_prefix}{key}"
        models: list[ModelDescriptor] = []
        page_token: str | None = None
        try:
            while True:
                params: dict[str, str | int] = {"pageSize": 1000}
                if page_token:
                    params["pageToken"] = page_token
                response = httpx.get(
                    self.url,
                    headers=headers,
                    params=params,
                    timeout=self.timeout_seconds,
                )
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict):
                    raise ModelRegistryError(
                        "gemini model discovery returned an invalid payload."
                    )
                models.extend(self.parser(payload))
                token = payload.get("nextPageToken")
                if not isinstance(token, str) or not token:
                    return models
                page_token = token
        except ModelRegistryError:
            raise
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            suffix = f" (HTTP {status})" if status else ""
            raise ModelRegistryError(f"gemini model discovery failed{suffix}.") from exc
