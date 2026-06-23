"""Tracker CRUD tests."""

from conftest import auth_headers, client


def test_tracker_create_list_move_delete() -> None:
    api = client()
    headers = auth_headers()

    created = api.post(
        "/api/v1/tracker/applications",
        headers=headers,
        json={
            "company": "Acme",
            "role": "AI Engineer",
            "status": "wishlist",
            "url": "https://example.com/job",
        },
    )
    assert created.status_code == 200
    item = created.json()["item"]
    assert item["url"] == "https://example.com/job"

    listed = api.get("/api/v1/tracker/applications", headers=headers)
    assert listed.status_code == 200
    assert any(row["id"] == item["id"] for row in listed.json()["items"])

    moved = api.patch(
        f"/api/v1/tracker/applications/{item['id']}/move",
        headers=headers,
        json={"status": "applied", "position": 0},
    )
    assert moved.status_code == 200
    assert moved.json()["item"]["status"] == "applied"

    deleted = api.delete(f"/api/v1/tracker/applications/{item['id']}", headers=headers)
    assert deleted.status_code == 200


def test_tracker_rejects_invalid_url() -> None:
    api = client()
    response = api.post(
        "/api/v1/tracker/applications",
        headers=auth_headers(),
        json={"company": "Acme", "role": "AI Engineer", "url": "not-a-url"},
    )
    assert response.status_code == 422
