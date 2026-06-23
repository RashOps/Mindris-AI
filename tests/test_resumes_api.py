"""Resume library API tests."""

from conftest import auth_headers, client


def _cv_payload(template_id: str = "modern") -> dict:
    return {
        "global_settings": {"template_id": template_id},
        "profile": {
            "full_name": "Ada Lovelace",
            "title": "AI Engineer",
            "phone": "",
            "email": "ada@example.com",
            "location": {"city": "Paris", "country": "France"},
            "socials": [],
            "text_markdown": "",
        },
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "languages": [],
        "hobbies": [],
    }


def test_resume_crud_duplicate_and_export() -> None:
    api = client()
    headers = auth_headers()

    created = api.post(
        "/api/v1/resumes",
        headers=headers,
        json={"name": "Data CV", "cv_data": _cv_payload(), "template_id": "modern"},
    )
    assert created.status_code == 200
    resume = created.json()["item"]
    assert resume["name"] == "Data CV"
    assert resume["cvData"]["profile"]["full_name"] == "Ada Lovelace"

    listed = api.get("/api/v1/resumes", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == resume["id"] for item in listed.json()["items"])

    patched = api.patch(
        f"/api/v1/resumes/{resume['id']}",
        headers=headers,
        json={"name": "Backend CV", "cv_data": _cv_payload("compact")},
    )
    assert patched.status_code == 200
    assert patched.json()["item"]["name"] == "Backend CV"
    assert patched.json()["item"]["templateId"] == "compact"

    duplicated = api.post(f"/api/v1/resumes/{resume['id']}/duplicate", headers=headers)
    assert duplicated.status_code == 200
    duplicate = duplicated.json()["item"]
    assert duplicate["name"] == "Backend CV copy"

    exported = api.get(f"/api/v1/resumes/{resume['id']}/export-json", headers=headers)
    assert exported.status_code == 200
    assert exported.json()["id"] == resume["id"]

    deleted = api.delete(f"/api/v1/resumes/{duplicate['id']}", headers=headers)
    assert deleted.status_code == 200


def test_resume_import_accepts_resume_document_shape() -> None:
    api = client()
    response = api.post(
        "/api/v1/resumes/import-json",
        headers=auth_headers(),
        json={
            "resume": {
                "name": "Imported Resume",
                "cvData": _cv_payload("compact"),
            }
        },
    )
    assert response.status_code == 200
    item = response.json()["item"]
    assert item["name"] == "Imported Resume"
    assert item["templateId"] == "compact"


def test_resume_create_rejects_invalid_cv_shape() -> None:
    api = client()
    response = api.post(
        "/api/v1/resumes",
        headers=auth_headers(),
        json={
            "name": "Broken CV",
            "cv_data": {
                "global_settings": {"template_id": "modern"},
                "experience": [],
            },
        },
    )
    assert response.status_code == 422
