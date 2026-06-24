"""Template catalogue API tests."""

from conftest import auth_headers, client


def test_template_catalog_lists_ready_templates() -> None:
    api = client()
    response = api.get("/api/v1/templates", headers=auth_headers())
    assert response.status_code == 200
    items = response.json()["items"]
    ready_ids = {item["id"] for item in items if item["status"] == "ready"}
    assert {"modern", "compact", "ats", "student", "creative"} <= ready_ids


def test_template_detail_404_for_unknown_template() -> None:
    api = client()
    response = api.get("/api/v1/templates/not-real", headers=auth_headers())
    assert response.status_code == 404
