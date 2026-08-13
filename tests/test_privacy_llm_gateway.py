"""Integration checks proving provider calls cross the privacy gateway."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
from crewai import LLM
from intelligence.model_discovery import HttpModelDiscoveryAdapter
from intelligence.privacy import (
    ConsentRequiredError,
    ConsentStatus,
    OutboundPrivacyGateway,
    PrivacyMode,
    PrivacyTask,
    PseudonymizationError,
)
from intelligence.privacy_gateway import (
    privacy_guarded_llm_class,
    register_gateway_factory,
)


def test_guarded_crewai_client_filters_rehydrates_and_audits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}
    audits: list[str] = []

    def fake_call(_: LLM, messages: Any, *args: Any, **kwargs: Any) -> str:
        del args, kwargs
        captured["messages"] = messages
        return "Bonjour [CANDIDATE_NAME] ([CANDIDATE_EMAIL])"

    monkeypatch.setattr(LLM, "call", fake_call)
    gateway = OutboundPrivacyGateway(
        mode=PrivacyMode.PRIVATE_CLOUD,
        consent_resolver=lambda *_: ConsentStatus.GRANTED,
        audit_sink=lambda _manifest, status: audits.append(status),
    )
    previous = register_gateway_factory(lambda: gateway)
    try:
        guarded = privacy_guarded_llm_class()(
            model="openai/test",
            privacy_provider="openai",
            privacy_task=PrivacyTask.COVER_LETTER,
        )
        result = guarded.call(
            [{"role": "user", "content": "Candidate Ada Lovelace <ada@example.com>"}]
        )

        serialized = str(captured["messages"])
        assert "ada@example.com" not in serialized
        assert "Ada Lovelace" not in serialized
        assert "<UNTRUSTED_TASK_INPUT_DATA>" in serialized
        assert result == "Bonjour Ada Lovelace (ada@example.com)"
        assert audits == ["success"]
    finally:
        register_gateway_factory(previous)


def test_guarded_crewai_client_never_calls_provider_without_consent(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    def fake_call(_: LLM, messages: Any, *args: Any, **kwargs: Any) -> str:
        del messages, args, kwargs
        nonlocal called
        called = True
        return "unexpected"

    monkeypatch.setattr(LLM, "call", fake_call)
    previous = register_gateway_factory(
        lambda: OutboundPrivacyGateway(mode=PrivacyMode.PRIVATE_CLOUD)
    )
    try:
        guarded = privacy_guarded_llm_class()(
            model="groq/test",
            privacy_provider="groq",
            privacy_task=PrivacyTask.ATS,
        )
        with pytest.raises(ConsentRequiredError):
            guarded.call([{"role": "user", "content": "Python"}])
        assert called is False
    finally:
        register_gateway_factory(previous)


def test_ats_prompt_removes_identity_and_disallowed_employer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def fake_call(_: LLM, messages: Any, *args: Any, **kwargs: Any) -> str:
        del args, kwargs
        captured["messages"] = messages
        return '{"score": 80}'

    monkeypatch.setattr(LLM, "call", fake_call)
    gateway = OutboundPrivacyGateway(
        mode=PrivacyMode.PRIVATE_CLOUD,
        consent_resolver=lambda *_: ConsentStatus.GRANTED,
    )
    previous = register_gateway_factory(lambda: gateway)
    try:
        guarded = privacy_guarded_llm_class()(
            model="groq/test",
            privacy_provider="groq",
            privacy_task=PrivacyTask.ATS,
        )
        guarded.call(
            [
                {
                    "role": "user",
                    "content": (
                        "Candidate Ada Lovelace <ada@example.com>\n"
                        "[fact_1] experience.0.company: Analytical Engines\n"
                        "[fact_2] experience.0.description_markdown: "
                        "Built compilers at Analytical Engines"
                    ),
                }
            ]
        )
        serialized = str(captured["messages"])
        assert "Ada Lovelace" not in serialized
        assert "ada@example.com" not in serialized
        assert "Analytical Engines" not in serialized
        assert "<redacted-employer>" in serialized
    finally:
        register_gateway_factory(previous)


def test_response_filter_failure_is_audited_as_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    audits: list[str] = []
    monkeypatch.setattr(
        LLM,
        "call",
        lambda *_args, **_kwargs: "Invented contact: leak@example.com",
    )
    gateway = OutboundPrivacyGateway(
        mode=PrivacyMode.PRIVATE_CLOUD,
        consent_resolver=lambda *_: ConsentStatus.GRANTED,
        audit_sink=lambda _manifest, status: audits.append(status),
    )
    previous = register_gateway_factory(lambda: gateway)
    try:
        guarded = privacy_guarded_llm_class()(
            model="openai/test",
            privacy_provider="openai",
            privacy_task=PrivacyTask.REWRITE,
        )
        with pytest.raises(PseudonymizationError):
            guarded.call("Rewrite this backend bullet.")
        assert audits == ["error"]
    finally:
        register_gateway_factory(previous)


def test_no_unapproved_direct_llm_sdk_call_sites() -> None:
    root = Path(__file__).parents[1] / "services"
    allowed = {
        root / "intelligence" / "pdf_parser.py",
    }
    offenders: list[str] = []
    for path in root.rglob("*.py"):
        if path in allowed:
            continue
        source = path.read_text(encoding="utf-8")
        if "litellm.completion(" in source or "AsyncLlamaCloud(" in source:
            offenders.append(str(path.relative_to(root)))
    assert offenders == []

    parser_source = next(iter(allowed)).read_text(encoding="utf-8")
    assert "outbound_gateway().prepare" not in parser_source
    assert "gateway.prepare(" in parser_source


def test_local_strict_blocks_external_discovery_before_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    called = False

    def fake_get(*args: Any, **kwargs: Any) -> None:
        del args, kwargs
        nonlocal called
        called = True

    monkeypatch.setattr("intelligence.model_discovery.httpx.get", fake_get)
    previous = register_gateway_factory(
        lambda: OutboundPrivacyGateway(mode=PrivacyMode.LOCAL_STRICT)
    )
    try:
        adapter = HttpModelDiscoveryAdapter(
            provider="openai",
            url="https://api.openai.com/v1/models",
            parser=lambda _: [],
        )
        with pytest.raises(PermissionError, match="local_strict_blocked"):
            adapter.discover()
        assert called is False
    finally:
        register_gateway_factory(previous)
