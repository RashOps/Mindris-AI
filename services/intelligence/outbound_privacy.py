"""Execution boundary for already classified and minimized provider payloads."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

from .privacy import (
    _OMIT,
    CLASSIFICATION_REGISTRY_VERSION,
    MAX_OUTBOUND_CHARACTERS,
    PRIVACY_POLICY_VERSION,
    TASK_PRIVACY_POLICIES,
    ConsentStatus,
    DataCategory,
    EphemeralPseudonymizer,
    PrivacyMode,
    PrivacyTask,
    PseudonymizationError,
    _flatten,
    _rebuild_minimized,
    scan_sensitive_text,
    validate_provider_response,
)


@dataclass(frozen=True)
class OutboundManifest:
    """Safe metadata describing an outbound request without its content."""

    provider: str
    model: str
    task: PrivacyTask
    mode: PrivacyMode
    policy_version: str
    classification_version: str
    categories: tuple[str, ...]
    character_count: int
    approximate_tokens: int
    payload_hash: str
    consent_status: ConsentStatus
    created_at: str


@dataclass
class PreparedOutboundRequest:
    """Minimized payload and ephemeral mapping ready for one provider call."""

    payload: Any
    manifest: OutboundManifest
    pseudonymizer: EphemeralPseudonymizer = field(repr=False)

    def close(self) -> None:
        """Erase the associated pseudonymization mapping."""
        self.pseudonymizer.close()


class ConsentRequiredError(PermissionError):
    """Carries a safe preview when cloud consent is absent or revoked."""

    def __init__(
        self,
        manifest: OutboundManifest,
        examples: tuple[str, ...] = (),
    ) -> None:
        super().__init__("privacy.consent.required")
        self.manifest = manifest
        self.examples = examples


class LocalStrictViolationError(PermissionError):
    """Raised when an external destination is selected in local-strict mode."""


class OutboundProviderError(RuntimeError):
    """Content-free provider failure safe for logs and API responses."""

    def __init__(self, provider: str, task: PrivacyTask) -> None:
        super().__init__(f"privacy.provider.unavailable:{provider}:{task.value}")


class ProviderAdapter(Protocol):
    """Adapter invoked only after the gateway authorizes a payload."""

    def __call__(self, payload: Any) -> str:
        """Send an already-filtered payload and return provider text."""
        ...


AuditSink = Callable[[OutboundManifest, str], None]
ConsentResolver = Callable[[str, PrivacyTask, PrivacyMode], ConsentStatus]


class OutboundPrivacyGateway:
    """Mandatory privacy boundary around external provider adapters."""

    def __init__(
        self,
        *,
        mode: PrivacyMode,
        consent_resolver: ConsentResolver | None = None,
        audit_sink: AuditSink | None = None,
    ) -> None:
        self.mode = mode
        self.consent_resolver = consent_resolver or (
            lambda _provider, _task, _mode: ConsentStatus.REQUIRED
        )
        self.audit_sink = audit_sink or (lambda _manifest, _status: None)

    def prepare(
        self,
        *,
        provider: str,
        model: str,
        task: PrivacyTask,
        payload: Any,
        declared_categories: frozenset[DataCategory] = frozenset(),
        character_count_override: int | None = None,
    ) -> PreparedOutboundRequest:
        """Minimize, pseudonymize, scan and authorize an outbound payload."""
        local = provider == "ollama"
        if self.mode == PrivacyMode.LOCAL_STRICT and not local:
            raise LocalStrictViolationError(
                "privacy.local_strict.external_provider_blocked"
            )
        policy = TASK_PRIVACY_POLICIES[task]
        pseudonymizer = EphemeralPseudonymizer()
        categories: set[DataCategory] = set()
        full_context = self.mode == PrivacyMode.FULL_CONTEXT_CLOUD
        minimized = (
            payload
            if local
            else _rebuild_minimized(
                payload,
                path="",
                policy=policy,
                pseudonymizer=pseudonymizer,
                full_context=full_context,
                categories=categories,
            )
        )
        if minimized is _OMIT:
            minimized = {}
        categories.update(declared_categories)
        serialized = json.dumps(
            minimized,
            ensure_ascii=False,
            sort_keys=True,
            default=str,
        )
        max_characters = min(
            policy.max_characters or MAX_OUTBOUND_CHARACTERS,
            MAX_OUTBOUND_CHARACTERS,
        )
        if len(serialized) > max_characters:
            pseudonymizer.close()
            raise ValueError("privacy.payload.too_large")
        findings = scan_sensitive_text(serialized)
        if any(item.category == DataCategory.TECHNICAL_SECRET for item in findings):
            pseudonymizer.close()
            raise ValueError("privacy.payload.secret_detected")
        if any(item.kind == "prompt_injection" for item in findings):
            pseudonymizer.close()
            raise ValueError("privacy.payload.prompt_injection")
        consent = (
            ConsentStatus.NOT_REQUIRED
            if local
            else self.consent_resolver(provider, task, self.mode)
        )
        manifest = OutboundManifest(
            provider=provider,
            model=model,
            task=task,
            mode=self.mode,
            policy_version=PRIVACY_POLICY_VERSION,
            classification_version=CLASSIFICATION_REGISTRY_VERSION,
            categories=tuple(sorted(item.value for item in categories)),
            character_count=character_count_override or len(serialized),
            approximate_tokens=max(
                1,
                (character_count_override or len(serialized)) // 4,
            ),
            payload_hash=hashlib.sha256(serialized.encode()).hexdigest(),
            consent_status=consent,
            created_at=datetime.now(UTC).isoformat(),
        )
        if consent not in {ConsentStatus.NOT_REQUIRED, ConsentStatus.GRANTED}:
            self.audit_sink(manifest, "consent_required")
            examples = tuple(
                str(value)[:160]
                for _, value in _flatten(minimized)
                if isinstance(value, str) and value.strip()
            )[:3]
            pseudonymizer.close()
            raise ConsentRequiredError(manifest, examples)
        return PreparedOutboundRequest(minimized, manifest, pseudonymizer)

    def execute(
        self,
        *,
        provider: str,
        model: str,
        task: PrivacyTask,
        payload: Any,
        adapter: ProviderAdapter,
    ) -> str:
        """Execute one authorized provider call and safely rehydrate its output."""
        prepared = self.prepare(
            provider=provider,
            model=model,
            task=task,
            payload=payload,
        )
        try:
            raw_response = adapter(prepared.payload)
            validate_provider_response(
                raw_response,
                allow_personal_data=provider == "ollama",
            )
            response = prepared.pseudonymizer.rehydrate(raw_response)
        except Exception as exc:
            self.audit_sink(prepared.manifest, "error")
            if isinstance(exc, PseudonymizationError):
                raise
            raise OutboundProviderError(provider, task) from None
        else:
            self.audit_sink(prepared.manifest, "success")
            return response
        finally:
            prepared.close()
