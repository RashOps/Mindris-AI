"""Resume library route and schema tests."""

import io
import json
from zipfile import ZipFile

import pytest
from database.session import SessionLocal, init_db
from fastapi import HTTPException
from pydantic import ValidationError
from routers.resumes import (
    create_resume_route,
    delete_resume_route,
    duplicate_resume_route,
    export_resume_docx,
    export_resume_html,
    export_resume_json,
    export_resume_markdown,
    import_resume_json,
    list_resumes,
    update_resume_route,
)
from schemas import (
    CVDataModel,
    ResumeCreateRequest,
    ResumeImportRequest,
    ResumeUpdateRequest,
)


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


def _session():
    init_db()
    return SessionLocal()


def _create_resume_direct(payload: dict, template_id: str = "modern") -> dict:
    request = ResumeCreateRequest(
        name="Customization CV",
        cv_data=payload,
        template_id=template_id,
    )
    with _session() as session:
        return create_resume_route(request, session)["item"]


def test_resume_crud_duplicate_and_export() -> None:
    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="Data CV",
                cv_data=_cv_payload(),
                template_id="modern",
            ),
            session,
        )["item"]
        assert resume["name"] == "Data CV"
        assert resume["cvData"]["profile"]["full_name"] == "Ada Lovelace"

        listed = list_resumes(session)
        assert any(item["id"] == resume["id"] for item in listed["items"])

        patched = update_resume_route(
            int(resume["id"]),
            ResumeUpdateRequest(name="Backend CV", cv_data=_cv_payload("compact")),
            session,
        )
        assert patched["item"]["name"] == "Backend CV"
        assert patched["item"]["templateId"] == "compact"

        duplicate = duplicate_resume_route(int(resume["id"]), session)["item"]
        assert duplicate["name"] == "Backend CV copy"

        exported = export_resume_json(int(resume["id"]), session)
        assert json.loads(exported.body)["id"] == resume["id"]

        markdown = export_resume_markdown(int(resume["id"]), session)
        assert "text/markdown" in markdown.headers["content-type"]
        assert markdown.headers["content-disposition"].endswith('.md"')
        assert "# Ada Lovelace" in markdown.body.decode()

        html = export_resume_html(int(resume["id"]), session)
        assert "text/html" in html.headers["content-type"]
        assert html.headers["content-disposition"].endswith('.html"')
        assert "Ada Lovelace" in html.body.decode()
        assert "<script" not in html.body.decode().lower()

        docx = export_resume_docx(int(resume["id"]), session)
        assert (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            in docx.headers["content-type"]
        )
        assert docx.headers["content-disposition"].endswith('.docx"')
        assert len(docx.body) > 1000
        with ZipFile(io.BytesIO(docx.body)) as package:
            assert "word/document.xml" in package.namelist()
            document = package.read("word/document.xml").decode()
            assert "Ada Lovelace" in document

        deleted = delete_resume_route(int(duplicate["id"]), session)
        assert deleted["status"] == "success"


def test_resume_import_accepts_resume_document_shape() -> None:
    with _session() as session:
        response = import_resume_json(
            ResumeImportRequest(
                resume={
                    "name": "Imported Resume",
                    "cvData": _cv_payload("compact"),
                }
            ),
            session,
        )

    item = response["item"]
    assert item["name"] == "Imported Resume"
    assert item["templateId"] == "compact"


def test_resume_create_migrates_legacy_global_settings_direct_route() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"].update(
        {
            "primary_color": "#111827",
            "font_family": "Merriweather",
            "font_size": "11px",
            "line_height": "1.35",
            "margin_h": "40px",
            "margin_v": "36px",
            "entry_spacing": "12px",
            "col_left_width": "62",
            "col_swap": "true",
        }
    )

    item = _create_resume_direct(payload, "modern")

    settings = item["cvData"]["global_settings"]
    assert settings["schema_version"] == "2"
    assert settings["template_id"] == "modern"
    assert settings["colors"]["primary"] == "#111827"
    assert settings["typography"]["body_font"] == "Merriweather"
    assert settings["typography"]["base_size"] == "11px"
    assert settings["typography"]["line_height"] == "1.35"
    assert settings["page"]["margins"]["horizontal"] == "40px"
    assert settings["page"]["margins"]["vertical"] == "36px"
    assert settings["layout"]["sidebar_width"] == "62%"
    assert settings["layout"]["sidebar_position"] == "right"
    assert any(
        section["type"] == "experience" and section["label"] == "Expériences"
        for section in settings["sections"]
    )


def test_cv_schema_migrates_legacy_global_settings() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"].update(
        {
            "primary_color": "#0f766e",
            "font_family": "Lato",
            "margin_h": "32px",
            "col_left_width": "30",
        }
    )

    cv_data = CVDataModel.model_validate(payload).model_dump(mode="json")

    settings = cv_data["global_settings"]
    assert settings["schema_version"] == "2"
    assert settings["colors"]["primary"] == "#0f766e"
    assert settings["typography"]["body_font"] == "Lato"
    assert settings["page"]["margins"]["horizontal"] == "32px"
    assert settings["layout"]["sidebar_width"] == "30%"


def test_cv_schema_applies_ats_strict_constraints() -> None:
    payload = _cv_payload("ats")
    payload["global_settings"] = {
        "template_id": "ats",
        "layout": {
            "columns": 2,
            "sidebar_position": "left",
            "photo": {"enabled": True, "shape": "round"},
        },
        "typography": {"bullet_style": "icons"},
        "colors": {
            "primary": "#475569",
            "text": "#111827",
            "sidebar_background": "#ffffff",
        },
    }

    cv_data = CVDataModel.model_validate(payload).model_dump(mode="json")
    settings = cv_data["global_settings"]
    assert settings["layout"]["columns"] == 1
    assert settings["layout"]["sidebar_position"] == "none"
    assert settings["layout"]["photo"]["enabled"] is False
    assert settings["typography"]["bullet_style"] == "dash"
    assert settings["colors"]["monochrome"] is True


def test_cv_schema_rejects_invalid_customization_values() -> None:
    payload = _cv_payload()
    payload["global_settings"] = {
        "template_id": "modern",
        "page": {"format": "Legal"},
        "colors": {"text": "#ffffff", "sidebar_background": "#ffffff"},
    }

    with pytest.raises(ValidationError, match="format"):
        CVDataModel.model_validate(payload)


def test_cv_schema_rejects_low_contrast_colors() -> None:
    payload = _cv_payload()
    payload["global_settings"] = {
        "template_id": "modern",
        "colors": {"text": "#ffffff", "sidebar_background": "#ffffff"},
    }

    with pytest.raises(ValidationError, match="contrast"):
        CVDataModel.model_validate(payload)


def test_resume_create_rejects_invalid_cv_shape() -> None:
    with pytest.raises(ValidationError):
        ResumeCreateRequest(
            name="Broken CV",
            cv_data={
                "global_settings": {"template_id": "modern"},
                "experience": [],
            },
        )


def test_resume_exports_return_404_for_missing_resume() -> None:
    with _session() as session:
        for route in (
            export_resume_json,
            export_resume_markdown,
            export_resume_html,
            export_resume_docx,
        ):
            with pytest.raises(HTTPException) as exc_info:
                route(999999, session)
            assert exc_info.value.status_code == 404
