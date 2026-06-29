"""API health/status tests."""

from conftest import auth_headers, client


def test_health_check_is_public() -> None:
    api = client()
    response = api.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_status_is_public() -> None:
    api = client()
    response = api.get("/api/v1/system/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ready", "degraded"}
    assert payload["renderer_url"] == "http://localhost:4000"
    assert payload["sqlite"]["path"].endswith("mindris.db")
    assert "timeouts" in payload


def test_system_readiness_reports_core_checks() -> None:
    api = client()
    response = api.get("/api/v1/system/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["checks"]["storage"]["ok"] is True
    assert payload["checks"]["sqlite"]["ok"] is True


def test_api_key_required_for_llm_catalogue() -> None:
    api = client()
    unauthorized = api.get("/api/v1/llm/catalogue")
    assert unauthorized.status_code == 401
    assert unauthorized.json()["status"] == "error"
    assert unauthorized.json()["message"]
    assert api.get("/api/v1/llm/catalogue", headers=auth_headers()).status_code == 200


def test_llm_catalogue_accepts_api_key_query_for_sse_compat() -> None:
    api = client()
    response = api.get("/api/v1/llm/catalogue?api_key=dev-mindris-api-key")
    assert response.status_code == 200
    payload = response.json()
    assert "providers" in payload
    assert payload["providers"]["ollama"]["mode"] == "local"
    assert payload["providers"]["groq"]["mode"] == "cloud"


def test_invalid_provider_or_model_is_rejected() -> None:
    api = client()
    response = api.post(
        "/api/v1/optimize",
        headers=auth_headers(),
        json={
            "job_url": "https://example.com/job",
            "provider": "groq",
            "model_name": "not-a-model",
        },
    )
    assert response.status_code == 422
    assert response.json()["status"] == "error"
