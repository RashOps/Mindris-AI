"""System configuration API tests."""

from __future__ import annotations

import json

from conftest import auth_headers, client


def test_system_configuration_requires_api_key() -> None:
    api = client()
    response = api.get("/api/v1/system/configuration")
    assert response.status_code == 401
    assert response.json()["status"] == "error"


def test_system_configuration_returns_masked_backend_owned_settings() -> None:
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


def test_system_configuration_update_persists_runtime_defaults() -> None:
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


def test_system_secret_update_marks_slot_as_configured_without_leaking_value() -> None:
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
