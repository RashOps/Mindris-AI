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
    assert response.json()["sqlite"]["path"].endswith("mindris.db")


def test_api_key_required_for_llm_catalogue() -> None:
    api = client()
    assert api.get("/api/v1/llm/catalogue").status_code == 401
    assert api.get("/api/v1/llm/catalogue", headers=auth_headers()).status_code == 200
