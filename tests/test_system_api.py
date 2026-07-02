"""System configuration API tests."""

from __future__ import annotations

import json
from pathlib import Path

from conftest import auth_headers, client


def _isolate_runtime_storage(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        "utils.runtime_config.CONFIG_PATH",
        tmp_path / "runtime-config.json",
    )
    monkeypatch.setattr(
        "utils.runtime_config.SECRETS_PATH",
        tmp_path / "runtime-secrets.json",
    )


def test_system_configuration_requires_api_key() -> None:
    api = client()
    response = api.get("/api/v1/system/configuration")
    assert response.status_code == 401
    assert response.json()["status"] == "error"


def test_system_configuration_returns_masked_backend_owned_settings(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    api = client()
    response = api.get("/api/v1/system/configuration", headers=auth_headers())

    assert response.status_code == 200
    payload = response.json()
    item = payload["item"]

    assert payload["status"] == "success"
    assert item["runtime"]["renderer_url"] == "http://localhost:4000"
    assert item["llm"]["defaults"]["optimize"]["provider"] == "groq"
    assert item["llm"]["providers"]["ollama"]["mode"] == "local"
    assert item["secrets"]["api_key"]["configured"] is True
    assert item["secrets"]["api_key"]["masked"] is True
    assert item["storage"]["logs_dir"]

    serialized = json.dumps(payload)
    assert "dev-mindris-api-key" not in serialized
    assert "OPENAI_API_KEY" not in serialized


def test_system_configuration_update_persists_runtime_defaults(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    api = client()
    response = api.put(
        "/api/v1/system/configuration",
        headers=auth_headers(),
        json={
            "defaults": {
                "optimize": {"provider": "ollama", "model_name": "llama3.2"},
                "ats_score": {"provider": "openai", "model_name": "gpt-4o-mini"},
            },
            "pdf_ingestion_mode": "local_text",
        },
    )

    assert response.status_code == 200
    item = response.json()["item"]
    assert item["app"]["defaults"]["optimize"]["provider"] == "ollama"
    assert item["app"]["defaults"]["ats_score"]["model_name"] == "gpt-4o-mini"
    assert item["app"]["pdf_ingestion_mode"] == "local_text"


def test_system_secret_update_marks_slot_as_configured_without_leaking_value(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    api = client()
    response = api.put(
        "/api/v1/system/secrets/openai_api_key",
        headers=auth_headers(),
        json={"value": "sk-test-value"},
    )

    assert response.status_code == 200
    assert response.json()["item"]["configured"] is True

    config_response = api.get("/api/v1/system/configuration", headers=auth_headers())
    assert config_response.status_code == 200
    payload = config_response.json()
    assert payload["item"]["secrets"]["openai_api_key"]["configured"] is True
    assert "sk-test-value" not in json.dumps(payload)


def test_runtime_api_key_slot_overrides_default_auth(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)

    api = client()
    rotate = api.put(
        "/api/v1/system/secrets/api_key",
        headers=auth_headers(),
        json={"value": "rotated-api-key"},
    )
    assert rotate.status_code == 200

    old_key_response = api.get("/api/v1/llm/catalogue", headers=auth_headers())
    assert old_key_response.status_code == 401

    new_key_response = api.get(
        "/api/v1/llm/catalogue",
        headers={"X-API-Key": "rotated-api-key"},
    )
    assert new_key_response.status_code == 200


def test_system_diagnostics_requires_api_key() -> None:
    api = client()
    response = api.get("/api/v1/system/diagnostics")
    assert response.status_code == 401
    assert response.json()["status"] == "error"


def test_system_diagnostics_returns_aggregated_runtime_state(
    monkeypatch,
    tmp_path: Path,
) -> None:
    _isolate_runtime_storage(monkeypatch, tmp_path)
    monkeypatch.setattr(
        "routers.system._renderer_diagnostics",
        lambda: {
            "status": "ready",
            "url": "http://localhost:4000",
            "reachable": True,
            "checks": {"templates": {"ok": True}, "pdf": {"ok": True}},
        },
    )
    monkeypatch.setattr(
        "routers.system._ollama_diagnostics",
        lambda: {
            "status": "ready",
            "base_url": "http://localhost:11434",
            "reachable": True,
            "model_count": 2,
            "items": [
                {"id": "llama3.2", "label": "llama3.2"},
                {"id": "phi4", "label": "phi4"},
            ],
        },
    )

    api = client()
    response = api.get("/api/v1/system/diagnostics", headers=auth_headers())

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["item"]["api"]["status"] in {"ready", "degraded"}
    assert payload["item"]["renderer"]["reachable"] is True
    assert payload["item"]["renderer"]["checks"]["pdf"]["ok"] is True
    assert payload["item"]["ollama"]["model_count"] == 2
    assert payload["item"]["ollama"]["items"][0]["id"] == "llama3.2"
