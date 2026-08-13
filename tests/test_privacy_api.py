"""Scope C API tests for privacy configuration, consent and safe activity."""

from __future__ import annotations

import json
import os
from pathlib import Path

from conftest import auth_headers, client
from database.records import ExternalActivityRecord
from database.session import SessionLocal, init_db
from intelligence.privacy import (
    CLASSIFICATION_REGISTRY_VERSION,
    PRIVACY_POLICY_VERSION,
    ConsentStatus,
    OutboundManifest,
    PrivacyMode,
    PrivacyTask,
)
from privacy_runtime import persist_outbound_manifest, resolve_consent
from sqlalchemy import delete


def _isolate_runtime_storage(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "utils.runtime_config.CONFIG_PATH",
        tmp_path / "runtime-config.json",
    )
    monkeypatch.setattr(
        "utils.runtime_config.SECRETS_PATH",
        tmp_path / "runtime-secrets.json",
    )


def _clear_privacy_records() -> None:
    init_db()
    with SessionLocal() as session:
        session.execute(delete(ExternalActivityRecord))
        session.commit()


def test_privacy_mode_is_backend_owned_and_local_strict_disables_telemetry(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    api = client()
    response = api.put(
        "/api/v1/system/configuration",
        headers=auth_headers(),
        json={"privacy_mode": "local_strict", "telemetry_enabled": True},
    )
    assert response.status_code == 200
    assert response.json()["item"]["app"]["privacy_mode"] == "local_strict"
    assert response.json()["item"]["app"]["telemetry_enabled"] is False
    assert os.environ["OTEL_SDK_DISABLED"] == "true"
    assert os.environ["CREWAI_TELEMETRY_OPT_OUT"] == "true"
    ready = api.get("/api/v1/system/ready", headers=auth_headers())
    privacy = ready.json()["checks"]["privacy"]
    assert privacy["ok"] is True
    assert privacy["local_provider_destination"]["allowed"] is True


def test_contract_and_preview_never_return_original_identifiers(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    api = client()
    contract = api.get("/api/v1/privacy/contract", headers=auth_headers())
    assert contract.status_code == 200
    assert contract.json()["item"]["classification"]["version"]
    assert contract.json()["item"]["providers"]["openai"]["source_url"]

    preview = api.post(
        "/api/v1/privacy/preview",
        headers=auth_headers(),
        json={
            "provider": "openai",
            "model": "gpt-test",
            "task": "cover_letter",
            "mode": "private_cloud",
            "payload": {
                "profile": {
                    "full_name": "Ada Lovelace",
                    "email": "ada@example.com",
                },
                "experience": [{"company": "Analytical Engines", "role": "Engineer"}],
                "job": {"description": "Build reliable systems"},
            },
        },
    )
    assert preview.status_code == 200
    serialized = json.dumps(preview.json())
    assert "Ada Lovelace" not in serialized
    assert "ada@example.com" not in serialized
    assert "Analytical Engines" not in serialized
    assert "[CANDIDATE_NAME]" in serialized


def test_consent_is_exact_revocable_and_activity_contains_no_content() -> None:
    _clear_privacy_records()
    api = client()
    grant = api.put(
        "/api/v1/privacy/consents",
        headers=auth_headers(),
        json={
            "provider": "openai",
            "task": "cover_letter",
            "mode": "private_cloud",
            "granted": True,
        },
    )
    assert grant.status_code == 200
    assert (
        resolve_consent("openai", PrivacyTask.COVER_LETTER, PrivacyMode.PRIVATE_CLOUD)
        == ConsentStatus.GRANTED
    )

    revoke = api.put(
        "/api/v1/privacy/consents",
        headers=auth_headers(),
        json={
            "provider": "openai",
            "task": "cover_letter",
            "mode": "private_cloud",
            "granted": False,
        },
    )
    assert revoke.status_code == 200
    assert (
        resolve_consent("openai", PrivacyTask.COVER_LETTER, PrivacyMode.PRIVATE_CLOUD)
        == ConsentStatus.REVOKED
    )
    consents = api.get("/api/v1/privacy/consents", headers=auth_headers())
    matching = [
        item
        for item in consents.json()["items"]
        if item["provider"] == "openai" and item["task"] == "cover_letter"
    ]
    assert len(matching) == 1
    assert matching[0]["consent_status"] == "revoked"

    persist_outbound_manifest(
        OutboundManifest(
            provider="openai",
            model="gpt-test",
            task=PrivacyTask.COVER_LETTER,
            mode=PrivacyMode.PRIVATE_CLOUD,
            policy_version=PRIVACY_POLICY_VERSION,
            classification_version=CLASSIFICATION_REGISTRY_VERSION,
            categories=("professional_data",),
            character_count=321,
            approximate_tokens=80,
            payload_hash="abc123",
            consent_status=ConsentStatus.GRANTED,
            created_at="2026-07-27T00:00:00+00:00",
        ),
        "success",
    )
    activity = api.get("/api/v1/privacy/activity", headers=auth_headers())
    assert activity.status_code == 200
    serialized = json.dumps(activity.json())
    assert "prompt" not in serialized
    assert "response" not in serialized
    assert "mapping" not in serialized
    assert activity.json()["items"][0]["character_count"] == 321

    cleared = api.delete("/api/v1/privacy/activity", headers=auth_headers())
    assert cleared.status_code == 204


def test_full_context_consent_requires_explicit_risk_acknowledgement() -> None:
    api = client()
    payload = {
        "provider": "llama_cloud",
        "task": "cv_parse",
        "mode": "full_context_cloud",
        "granted": True,
    }
    refused = api.put(
        "/api/v1/privacy/consents",
        headers=auth_headers(),
        json=payload,
    )
    assert refused.status_code == 422
    accepted = api.put(
        "/api/v1/privacy/consents",
        headers=auth_headers(),
        json={**payload, "acknowledge_full_context": True},
    )
    assert accepted.status_code == 200


def test_local_provider_is_not_recorded_as_external_activity() -> None:
    _clear_privacy_records()
    persist_outbound_manifest(
        OutboundManifest(
            provider="ollama",
            model="local",
            task=PrivacyTask.ATS,
            mode=PrivacyMode.LOCAL_STRICT,
            policy_version=PRIVACY_POLICY_VERSION,
            classification_version=CLASSIFICATION_REGISTRY_VERSION,
            categories=("professional_data",),
            character_count=10,
            approximate_tokens=2,
            payload_hash="local",
            consent_status=ConsentStatus.NOT_REQUIRED,
            created_at="2026-07-27T00:00:00+00:00",
        ),
        "success",
    )
    response = client().get("/api/v1/privacy/activity", headers=auth_headers())
    assert response.json()["items"] == []
