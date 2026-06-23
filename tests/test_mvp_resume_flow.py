"""MVP resume flow API tests."""

from conftest import auth_headers, client
from test_resumes_api import _cv_payload


def test_mvp_resume_template_create_update_duplicate_export_flow() -> None:
    api = client()
    headers = auth_headers()

    templates = api.get("/api/v1/templates", headers=headers)
    assert templates.status_code == 200
    ready_template = next(
        item for item in templates.json()["items"] if item["status"] == "ready"
    )

    created = api.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "name": "MVP CV",
            "template_id": ready_template["id"],
            "cv_data": _cv_payload(ready_template["id"]),
        },
    )
    assert created.status_code == 200
    resume = created.json()["item"]
    assert resume["templateId"] == ready_template["id"]

    updated_cv = _cv_payload(ready_template["id"])
    updated_cv["profile"]["title"] = "Backend-owned Resume Builder"
    patched = api.patch(
        f"/api/v1/resumes/{resume['id']}",
        headers=headers,
        json={"cv_data": updated_cv},
    )
    assert patched.status_code == 200
    assert patched.json()["item"]["cvData"]["profile"]["title"] == (
        "Backend-owned Resume Builder"
    )

    duplicated = api.post(f"/api/v1/resumes/{resume['id']}/duplicate", headers=headers)
    assert duplicated.status_code == 200

    exported = api.get(f"/api/v1/resumes/{resume['id']}/export-json", headers=headers)
    assert exported.status_code == 200
    assert exported.json()["cvData"]["profile"]["title"] == (
        "Backend-owned Resume Builder"
    )
