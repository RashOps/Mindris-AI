"""Resume library API tests."""

import io
from zipfile import ZipFile

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

    markdown = api.get(
        f"/api/v1/resumes/{resume['id']}/export-markdown",
        headers=headers,
    )
    assert markdown.status_code == 200
    assert "text/markdown" in markdown.headers["content-type"]
    assert markdown.headers["content-disposition"].endswith('.md"')
    assert "# Ada Lovelace" in markdown.text

    html = api.get(f"/api/v1/resumes/{resume['id']}/export-html", headers=headers)
    assert html.status_code == 200
    assert "text/html" in html.headers["content-type"]
    assert html.headers["content-disposition"].endswith('.html"')
    assert "Ada Lovelace" in html.text
    assert "<script" not in html.text.lower()

    docx = api.get(f"/api/v1/resumes/{resume['id']}/export-docx", headers=headers)
    assert docx.status_code == 200
    assert (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in docx.headers["content-type"]
    )
    assert docx.headers["content-disposition"].endswith('.docx"')
    assert len(docx.content) > 1000
    with ZipFile(io.BytesIO(docx.content)) as package:
        assert "word/document.xml" in package.namelist()
        document = package.read("word/document.xml").decode()
        assert "Ada Lovelace" in document

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


def test_resume_exports_return_404_for_missing_resume() -> None:
    api = client()
    headers = auth_headers()

    for endpoint in ("export-json", "export-markdown", "export-html", "export-docx"):
        response = api.get(f"/api/v1/resumes/999999/{endpoint}", headers=headers)
        assert response.status_code == 404
