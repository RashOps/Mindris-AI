"""Process-wide privacy gateway registration and CrewAI LLM boundary."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from utils.runtime_config import load_runtime_configuration

from .privacy import (
    OutboundPrivacyGateway,
    OutboundProviderError,
    PreparedOutboundRequest,
    PrivacyMode,
    PrivacyTask,
    structured_untrusted_data,
    validate_provider_response,
)

GatewayFactory = Callable[[], OutboundPrivacyGateway]


def _default_gateway_factory() -> OutboundPrivacyGateway:
    """Fail closed for cloud calls until the API registers consent persistence."""
    mode = PrivacyMode(load_runtime_configuration()["privacy_mode"])
    return OutboundPrivacyGateway(mode=mode)


_gateway_factory: GatewayFactory = _default_gateway_factory


def register_gateway_factory(factory: GatewayFactory) -> GatewayFactory:
    """Register the backend-owned gateway factory during service startup."""
    global _gateway_factory
    previous = _gateway_factory
    _gateway_factory = factory
    return previous


def outbound_gateway() -> OutboundPrivacyGateway:
    """Return a fresh gateway reflecting the latest backend configuration."""
    return _gateway_factory()


def _message_payload(task: PrivacyTask, content: list[str]) -> dict[str, Any]:
    if task in {PrivacyTask.JOB_ANALYSIS, PrivacyTask.COMPANY_ANALYSIS}:
        return {"job": {"description": content}}
    if task in {PrivacyTask.COVER_LETTER, PrivacyTask.CV_PARSE}:
        return {"profile": {"text_markdown": content}}
    return {"skills": [{"description": item} for item in content]}


def _filtered_content(
    task: PrivacyTask,
    payload: dict[str, Any],
) -> list[str]:
    if task in {PrivacyTask.JOB_ANALYSIS, PrivacyTask.COMPANY_ANALYSIS}:
        value = payload.get("job", {}).get("description", [])
    elif task in {PrivacyTask.COVER_LETTER, PrivacyTask.CV_PARSE}:
        value = payload.get("profile", {}).get("text_markdown", [])
    else:
        value = [
            item.get("description", "")
            for item in payload.get("skills", [])
            if isinstance(item, dict)
        ]
    return value if isinstance(value, list) else [str(value)]


def _prepare_messages(
    *,
    messages: str | list[dict[str, Any]],
    provider: str,
    model: str,
    task: PrivacyTask,
) -> tuple[list[dict[str, Any]], PreparedOutboundRequest]:
    normalized = (
        [{"role": "user", "content": messages}]
        if isinstance(messages, str)
        else [dict(message) for message in messages]
    )
    user_indices: list[int] = []
    user_content: list[str] = []
    for index, message in enumerate(normalized):
        if message.get("role") == "user":
            user_indices.append(index)
            user_content.append(str(message.get("content", "")))
    prepared = outbound_gateway().prepare(
        provider=provider,
        model=model,
        task=task,
        payload=_message_payload(task, user_content),
    )
    filtered = _filtered_content(task, prepared.payload)
    for index, content in zip(user_indices, filtered, strict=False):
        normalized[index]["content"] = structured_untrusted_data(
            "task_input",
            str(content),
            limit=prepared.manifest.character_count,
        )
    return normalized, prepared


def _finish_response(
    response: Any,
    *,
    prepared: PreparedOutboundRequest,
    status: str,
) -> Any:
    gateway = outbound_gateway()
    try:
        result = response
        if isinstance(response, str):
            validate_provider_response(
                response,
                allow_personal_data=prepared.manifest.provider == "ollama",
            )
            result = prepared.pseudonymizer.rehydrate(response)
    except Exception:
        gateway.audit_sink(prepared.manifest, "error")
        raise
    else:
        gateway.audit_sink(prepared.manifest, status)
        return result
    finally:
        prepared.close()


def privacy_guarded_llm_class() -> type:
    """Build the CrewAI subclass lazily so privacy core stays dependency-light."""
    from crewai import LLM

    class PrivacyGuardedLLM(LLM):
        """CrewAI client whose external calls cross the privacy gateway."""

        def __init__(
            self,
            *args: Any,
            privacy_provider: str,
            privacy_task: PrivacyTask,
            **kwargs: Any,
        ) -> None:
            super().__init__(*args, **kwargs)
            object.__setattr__(self, "_privacy_provider", privacy_provider)
            object.__setattr__(self, "_privacy_task", privacy_task)

        def call(self, messages: Any, *args: Any, **kwargs: Any) -> Any:
            """Filter and audit a synchronous provider call."""
            filtered, prepared = _prepare_messages(
                messages=messages,
                provider=self._privacy_provider,
                model=self.model,
                task=self._privacy_task,
            )
            try:
                response = super().call(filtered, *args, **kwargs)
            except Exception:
                outbound_gateway().audit_sink(prepared.manifest, "error")
                prepared.close()
                raise OutboundProviderError(
                    self._privacy_provider,
                    self._privacy_task,
                ) from None
            return _finish_response(response, prepared=prepared, status="success")

        async def acall(self, messages: Any, *args: Any, **kwargs: Any) -> Any:
            """Filter and audit an asynchronous provider call."""
            filtered, prepared = _prepare_messages(
                messages=messages,
                provider=self._privacy_provider,
                model=self.model,
                task=self._privacy_task,
            )
            try:
                response = await super().acall(filtered, *args, **kwargs)
            except Exception:
                outbound_gateway().audit_sink(prepared.manifest, "error")
                prepared.close()
                raise OutboundProviderError(
                    self._privacy_provider,
                    self._privacy_task,
                ) from None
            return _finish_response(response, prepared=prepared, status="success")

    return PrivacyGuardedLLM
