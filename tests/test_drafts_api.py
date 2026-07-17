"""Workspace draft API tests."""

from conftest import auth_headers, client


def test_draft_upsert_get_and_delete() -> None:
    api = client()
    headers = auth_headers()

    created = api.put(
        "/api/v1/drafts/markdown",
        headers=headers,
        json={
            "data": {
                "markdown": "# Hello",
                "style": "document",
                "title": "Draft",
            }
        },
    )
    assert created.status_code == 200
    assert created.json()["item"]["data"]["markdown"] == "# Hello"

    updated = api.put(
        "/api/v1/drafts/markdown",
        headers=headers,
        json={
            "data": {
                "markdown": "# Updated",
                "style": "letter",
                "title": "Letter",
            }
        },
    )
    assert updated.status_code == 200
    assert updated.json()["item"]["data"]["style"] == "letter"

    fetched = api.get("/api/v1/drafts/markdown", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["item"]["data"]["title"] == "Letter"

    deleted = api.delete("/api/v1/drafts/markdown", headers=headers)
    assert deleted.status_code == 200

    missing = api.get("/api/v1/drafts/markdown", headers=headers)
    assert missing.status_code == 404

    nullable = api.get("/api/v1/drafts/maybe/markdown", headers=headers)
    assert nullable.status_code == 200
    assert nullable.json()["item"] is None
