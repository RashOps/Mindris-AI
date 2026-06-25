"""MVP resume flow API tests."""

import json

from database.session import SessionLocal, init_db
from routers.resumes import (
    create_resume_route,
    duplicate_resume_route,
    export_resume_json,
    update_resume_route,
)
from routers.templates import list_templates
from schemas import ResumeCreateRequest, ResumeUpdateRequest
from test_resumes_api import _cv_payload


def test_mvp_resume_template_create_update_duplicate_export_flow() -> None:
    init_db()
    ready_template = next(
        item for item in list_templates()["items"] if item["status"] == "ready"
    )
    community_template = next(
        item for item in list_templates()["items"] if item["status"] == "community"
    )

    with SessionLocal() as session:
        created = create_resume_route(
            ResumeCreateRequest(
                name="MVP CV",
                template_id=ready_template["id"],
                cv_data=_cv_payload(ready_template["id"]),
            ),
            session,
        )
        resume = created["item"]
        assert resume["templateId"] == ready_template["id"]

        updated_cv = _cv_payload(ready_template["id"])
        updated_cv["profile"]["title"] = "Backend-owned Resume Builder"
        patched = update_resume_route(
            int(resume["id"]),
            ResumeUpdateRequest(cv_data=updated_cv),
            session,
        )
        assert patched["item"]["cvData"]["profile"]["title"] == (
            "Backend-owned Resume Builder"
        )

        duplicated = duplicate_resume_route(int(resume["id"]), session)
        assert duplicated["item"]["name"] == "MVP CV copy"

        exported = export_resume_json(int(resume["id"]), session)
        assert json.loads(exported.body)["cvData"]["profile"]["title"] == (
            "Backend-owned Resume Builder"
        )

        community = create_resume_route(
            ResumeCreateRequest(
                name="Community CV",
                template_id=community_template["id"],
                cv_data=_cv_payload(community_template["id"]),
            ),
            session,
        )["item"]
        assert community["templateId"] == community_template["id"]
        assert community["locale"] == "en"
