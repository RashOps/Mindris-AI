"""Resume library route and schema tests."""

import io
import json
from zipfile import ZipFile

import pytest
from database.records import ResumeRecord
from database.session import SessionLocal, init_db
from fastapi import HTTPException
from persistence_lib.json import load_json
from pydantic import ValidationError
from routers.resumes import (
    activate_resume_locale_route,
    compare_resume_revisions_route,
    create_resume_locale_route,
    create_resume_revision_route,
    create_resume_route,
    delete_resume_locale_route,
    delete_resume_route,
    duplicate_resume_route,
    export_resume_docx,
    export_resume_html,
    export_resume_json,
    export_resume_latex,
    export_resume_markdown,
    export_resume_typst,
    get_resume_route,
    import_resume_json,
    list_resume_revisions_route,
    list_resumes,
    restore_resume_revision_route,
    update_resume_route,
)
from routers.templates import list_customization_catalogue
from schemas import (
    CVDataModel,
    ResumeCreateRequest,
    ResumeImportRequest,
    ResumeLocaleCreateRequest,
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
        "certifications": [],
        "volunteering": [],
        "publications": [],
        "references": [],
        "custom_sections": [],
    }


def _advanced_cv_payload(template_id: str = "modern") -> dict:
    payload = _cv_payload(template_id)
    payload.update(
        {
            "certifications": [
                {
                    "id": "cert-1",
                    "name": "AWS Certified",
                    "issuer": "Amazon",
                    "date": "2025",
                    "url": "https://example.com/cert",
                    "description_markdown": "- Cloud architecture",
                }
            ],
            "volunteering": [
                {
                    "id": "vol-1",
                    "organization": "Open Source Org",
                    "role": "Mentor",
                    "period": "2024",
                    "location": "Remote",
                    "description_markdown": "- Supported contributors",
                }
            ],
            "publications": [
                {
                    "id": "pub-1",
                    "title": "Open Resume Formats",
                    "publisher": "Mindris Press",
                    "date": "2023",
                    "url": "https://example.com/paper",
                    "description_markdown": "- Semantics first",
                }
            ],
            "references": [
                {
                    "id": "ref-1",
                    "name": "Grace Hopper",
                    "role": "Engineering Manager",
                    "company": "Navy",
                    "contact": "grace@example.com",
                    "description_markdown": "- Available on request",
                }
            ],
            "custom_sections": [
                {
                    "id": "custom-1",
                    "title": "Awards",
                    "content_markdown": "- Best OSS tool\n- Speaker",
                    "items": ["Hackathon winner", "Conference speaker"],
                }
            ],
        }
    )
    return payload


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

        latex = export_resume_latex(int(resume["id"]), session)
        assert "application/x-latex" in latex.headers["content-type"]
        assert latex.headers["content-disposition"].endswith('.tex"')
        assert "\\begin{document}" in latex.body.decode()
        assert "Ada Lovelace" in latex.body.decode()

        typst = export_resume_typst(int(resume["id"]), session)
        assert "text/typst" in typst.headers["content-type"]
        assert typst.headers["content-disposition"].endswith('.typ"')
        assert "= Ada Lovelace" in typst.body.decode()
        assert "Ada Lovelace" in typst.body.decode()

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


def test_resume_create_exposes_multilingual_metadata() -> None:
    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="FR CV",
                cv_data=_cv_payload(),
                template_id="modern",
            ),
            session,
        )["item"]

        assert resume["locale"] == "fr"
        assert resume["multilingual"] == {
            "defaultLocale": "fr",
            "activeLocale": "fr",
            "availableLocales": ["fr"],
        }
        assert "multilingual" not in resume["cvData"]


def test_legacy_resume_is_lazy_migrated_to_multilingual_shape() -> None:
    with _session() as session:
        legacy = ResumeRecord(
            name="Legacy CV",
            data_json=json.dumps(_cv_payload(), ensure_ascii=False),
            template_id="modern",
            locale="fr",
            source="manual",
        )
        session.add(legacy)
        session.commit()
        session.refresh(legacy)

        fetched = get_resume_route(int(legacy.id), session)["item"]
        assert fetched["multilingual"] == {
            "defaultLocale": "fr",
            "activeLocale": "fr",
            "availableLocales": ["fr"],
        }
        assert fetched["cvData"]["profile"]["full_name"] == "Ada Lovelace"

        session.refresh(legacy)
        stored = load_json(legacy.data_json, {})
        assert stored["multilingual"]["default_locale"] == "fr"
        assert stored["multilingual"]["active_locale"] == "fr"
        assert stored["multilingual"]["variants"]["fr"]["profile"]["full_name"] == (
            "Ada Lovelace"
        )


def test_resume_locale_variants_are_backend_owned() -> None:
    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="Multilingual CV",
                cv_data=_cv_payload(),
                template_id="modern",
            ),
            session,
        )["item"]

        localized = create_resume_locale_route(
            int(resume["id"]),
            ResumeLocaleCreateRequest(locale="en", source_locale="fr"),
            session,
        )["item"]
        assert localized["multilingual"] == {
            "defaultLocale": "fr",
            "activeLocale": "en",
            "availableLocales": ["fr", "en"],
        }
        assert (
            localized["cvData"]["global_settings"]["locale"]["label_language"] == "en"
        )
        assert localized["cvData"]["profile"]["full_name"] == "Ada Lovelace"

        en_payload = _cv_payload()
        en_payload["global_settings"]["locale"] = {"label_language": "en"}
        en_payload["profile"]["title"] = "AI Engineer EN"
        updated = update_resume_route(
            int(resume["id"]),
            ResumeUpdateRequest(cv_data=en_payload, target_locale="en"),
            session,
        )["item"]
        assert updated["multilingual"]["activeLocale"] == "en"
        assert updated["cvData"]["profile"]["title"] == "AI Engineer EN"

        session.refresh(session.get(ResumeRecord, int(resume["id"])))
        stored = load_json(session.get(ResumeRecord, int(resume["id"])).data_json, {})
        assert stored["multilingual"]["variants"]["fr"]["profile"]["title"] == (
            "AI Engineer"
        )
        assert stored["multilingual"]["variants"]["en"]["profile"]["title"] == (
            "AI Engineer EN"
        )

        with pytest.raises(HTTPException):
            delete_resume_locale_route(int(resume["id"]), "fr", session)

        activated = activate_resume_locale_route(int(resume["id"]), "fr", session)[
            "item"
        ]
        assert activated["multilingual"]["activeLocale"] == "fr"

        deleted = delete_resume_locale_route(int(resume["id"]), "en", session)["item"]
        assert deleted["multilingual"] == {
            "defaultLocale": "fr",
            "activeLocale": "fr",
            "availableLocales": ["fr"],
        }


def test_resume_exports_include_advanced_sections() -> None:
    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="Advanced CV",
                cv_data=_advanced_cv_payload(),
                template_id="modern",
            ),
            session,
        )["item"]

        markdown = export_resume_markdown(int(resume["id"]), session).body.decode()
        html = export_resume_html(int(resume["id"]), session).body.decode()
        docx = export_resume_docx(int(resume["id"]), session)

        assert "## Certifications" in markdown
        assert "## Volunteering" in markdown
        assert "## Publications" in markdown
        assert "## References" in markdown
        assert "## Awards" in markdown
        assert "AWS Certified" in markdown
        assert "Open Source Org" in markdown
        assert "Open Resume Formats" in markdown
        assert "Grace Hopper" in markdown
        assert "Hackathon winner" in markdown

        assert "<h2>Certifications</h2>" in html
        assert "<h2>Volunteering</h2>" in html
        assert "<h2>Publications</h2>" in html
        assert "<h2>References</h2>" in html
        assert "<h2>Awards</h2>" in html
        assert "AWS Certified" in html
        assert "Open Source Org" in html
        assert "Open Resume Formats" in html
        assert "Grace Hopper" in html
        assert "Hackathon winner" in html

        with ZipFile(io.BytesIO(docx.body)) as package:
            document = package.read("word/document.xml").decode()
            assert "Certifications" in document
            assert "Volunteering" in document
            assert "Publications" in document
            assert "References" in document
            assert "Awards" in document
            assert "AWS Certified" in document
            assert "Open Source Org" in document
            assert "Open Resume Formats" in document
            assert "Grace Hopper" in document
            assert "Hackathon winner" in document


def test_hidden_configured_sections_stay_hidden_even_when_data_exists() -> None:
    payload = _cv_payload("ats")
    payload["languages"] = [
        {"id": "lang-1", "language": "English", "level": "C1"},
    ]
    payload["global_settings"] = {
        "template_id": "ats",
        "sections": [
            {"id": "profile", "type": "profile", "label": "Profil"},
            {"id": "projects", "type": "projects", "label": "Projets"},
            {
                "id": "experience",
                "type": "experience",
                "label": "Parcours professionnel",
            },
            {
                "id": "languages",
                "type": "languages",
                "label": "Langues",
                "visible": False,
            },
        ],
    }

    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="Hidden Section CV",
                cv_data=payload,
                template_id="ats",
            ),
            session,
        )["item"]

        markdown = export_resume_markdown(int(resume["id"]), session).body.decode()
        html = export_resume_html(int(resume["id"]), session).body.decode()
        docx = export_resume_docx(int(resume["id"]), session)

        assert "## Langues" not in markdown
        assert "## Languages" not in markdown
        assert "<h2>Langues</h2>" not in html
        assert "<h2>Languages</h2>" not in html

        with ZipFile(io.BytesIO(docx.body)) as package:
            document = package.read("word/document.xml").decode()
            assert "Langues" not in document
            assert "Languages" not in document


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


def test_resume_versioning_snapshots_and_restore() -> None:
    with _session() as session:
        created = create_resume_route(
            ResumeCreateRequest(
                name="Versioned CV",
                cv_data=_cv_payload("modern"),
                template_id="modern",
            ),
            session,
        )["item"]

        patched = update_resume_route(
            int(created["id"]),
            ResumeUpdateRequest(
                cv_data={
                    **_cv_payload("modern"),
                    "profile": {
                        **_cv_payload("modern")["profile"],
                        "title": "Backend Engineer",
                    },
                }
            ),
            session,
        )["item"]
        assert patched["cvData"]["profile"]["title"] == "Backend Engineer"

        snapshot = create_resume_revision_route(int(created["id"]), session)["item"]
        assert snapshot["revision"] >= 1

        revisions = list_resume_revisions_route(int(created["id"]), session)["items"]
        assert len(revisions) >= 2

        restored = restore_resume_revision_route(
            int(created["id"]),
            int(revisions[-1]["revision"]),
            session,
        )["item"]
        assert restored["id"] == created["id"]
        assert restored["name"] == revisions[-1]["name"]


def test_resume_revision_comparison_returns_semantic_diff() -> None:
    with _session() as session:
        created = create_resume_route(
            ResumeCreateRequest(
                name="Diff CV",
                cv_data=_cv_payload("modern"),
                template_id="modern",
            ),
            session,
        )["item"]

        update_resume_route(
            int(created["id"]),
            ResumeUpdateRequest(
                name="Diff CV v2",
                cv_data={
                    **_cv_payload("compact"),
                    "experience": [
                        {
                            "id": "exp-1",
                            "role": "Lead Engineer",
                            "company": "Mindris",
                            "period": "2025",
                            "location": {"city": "Paris", "country": "France"},
                            "description_markdown": "- Shipped comparisons",
                        }
                    ],
                },
            ),
            session,
        )

        revisions = list_resume_revisions_route(int(created["id"]), session)["items"]
        newest = revisions[0]["revision"]
        older = revisions[-1]["revision"]
        compare = compare_resume_revisions_route(
            int(created["id"]),
            base_revision=older,
            target_revision=newest,
            session=session,
        )["item"]

        assert compare["resumeId"] == created["id"]
        assert compare["baseRevision"]["revision"] == older
        assert compare["targetRevision"]["revision"] == newest
        assert compare["changeCount"] >= 2
        assert any(
            item["section"] == "experience" for item in compare["sectionSummaries"]
        )
        assert any(change["path"] == "name" for change in compare["changes"])
        assert any("experience" in change["path"] for change in compare["changes"])


def test_resume_exports_resolve_selected_locale_variant() -> None:
    with _session() as session:
        created = create_resume_route(
            ResumeCreateRequest(
                name="Localized Export CV",
                cv_data=_cv_payload("modern"),
                template_id="modern",
            ),
            session,
        )["item"]

        create_resume_locale_route(
            int(created["id"]),
            ResumeLocaleCreateRequest(locale="en", source_locale="fr"),
            session,
        )
        en_payload = _cv_payload("modern")
        en_payload["global_settings"]["locale"] = {"label_language": "en"}
        en_payload["profile"]["full_name"] = "Ada Lovelace EN"
        en_payload["profile"]["title"] = "Platform Engineer EN"
        update_resume_route(
            int(created["id"]),
            ResumeUpdateRequest(cv_data=en_payload, target_locale="en"),
            session,
        )

        markdown_fr = export_resume_markdown(int(created["id"]), session).body.decode()
        markdown_en = export_resume_markdown(
            int(created["id"]),
            session,
            locale="en",
        ).body.decode()
        html_en = export_resume_html(
            int(created["id"]),
            session,
            locale="en",
        ).body.decode()

        assert "# Ada Lovelace" in markdown_fr
        assert "# Ada Lovelace EN" in markdown_en
        assert "Platform Engineer EN" in markdown_en
        assert "Ada Lovelace EN" in html_en
        assert "<html lang=\"en\">" in html_en


def test_resume_revision_compare_can_target_locale_variant() -> None:
    with _session() as session:
        created = create_resume_route(
            ResumeCreateRequest(
                name="Locale Diff CV",
                cv_data=_cv_payload("modern"),
                template_id="modern",
            ),
            session,
        )["item"]

        create_resume_locale_route(
            int(created["id"]),
            ResumeLocaleCreateRequest(locale="en", source_locale="fr"),
            session,
        )
        update_resume_route(
            int(created["id"]),
            ResumeUpdateRequest(
                cv_data={
                    **_cv_payload("modern"),
                    "global_settings": {
                        **_cv_payload("modern")["global_settings"],
                        "locale": {"label_language": "en"},
                    },
                    "profile": {
                        **_cv_payload("modern")["profile"],
                        "title": "Platform Engineer EN",
                    },
                },
                target_locale="en",
            ),
            session,
        )

        revisions = list_resume_revisions_route(int(created["id"]), session)["items"]
        newest = revisions[0]["revision"]
        older = next(
            item["revision"]
            for item in reversed(revisions)
            if item["locale"] == "en"
        )
        compare = compare_resume_revisions_route(
            int(created["id"]),
            base_revision=older,
            target_revision=newest,
            session=session,
            locale="en",
        )["item"]

        assert compare["baseRevision"]["locale"] == "en"
        assert compare["targetRevision"]["locale"] == "en"
        assert any(
            change["path"] == "profile.title"
            and change["after"] == "Platform Engineer EN"
            for change in compare["changes"]
        )


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


def test_cv_schema_applies_one_page_challenge_constraints() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"] = {
        "template_id": "modern",
        "page": {
            "one_page_challenge": True,
            "page_break_mode": "manual",
            "margins": {"horizontal": "64px", "vertical": "48px"},
        },
        "layout": {
            "density": "senior",
            "photo": {"enabled": True, "shape": "round"},
        },
        "typography": {
            "base_size": "13px",
            "line_height": "1.5",
            "date_style": "normal",
        },
    }

    cv_data = CVDataModel.model_validate(payload).model_dump(mode="json")
    settings = cv_data["global_settings"]
    assert settings["page"]["one_page_challenge"] is True
    assert settings["page"]["page_break_mode"] == "auto"
    assert settings["page"]["margins"]["horizontal"] == "36px"
    assert settings["page"]["margins"]["vertical"] == "28px"
    assert settings["layout"]["density"] == "compact"
    assert settings["layout"]["photo"]["enabled"] is False
    assert settings["typography"]["base_size"] == "11.5px"
    assert settings["typography"]["line_height"] == "1.35"
    assert settings["typography"]["date_style"] == "small"


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


def test_cv_schema_accepts_advanced_css_contract() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"] = {
        "template_id": "modern",
        "advanced_css": {
            "enabled": True,
            "mode": "css_patch",
            "css_text": (
                ":host { --primary-color: #111827; }\n"
                ".resume-name { letter-spacing: 0; }"
            ),
        },
    }

    cv_data = CVDataModel.model_validate(payload).model_dump(mode="json")
    settings = cv_data["global_settings"]
    assert settings["advanced_css"]["enabled"] is True
    assert settings["advanced_css"]["mode"] == "css_patch"
    assert ":host" in settings["advanced_css"]["css_text"]


def test_cv_schema_rejects_unsafe_advanced_css() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"] = {
        "template_id": "modern",
        "advanced_css": {
            "enabled": True,
            "mode": "css_patch",
            "css_text": "@import url('https://evil.test/x.css');",
        },
    }

    with pytest.raises(ValidationError, match="advanced_css"):
        CVDataModel.model_validate(payload)


def test_customization_catalogue_exposes_advanced_css_capabilities() -> None:
    payload = list_customization_catalogue()["item"]

    assert payload["advancedCss"]["enabled"] is True
    assert payload["advancedCss"]["maxLength"] >= 2000
    assert ":host" in payload["advancedCss"]["allowedScopes"]
    assert "@import" in payload["advancedCss"]["blockedAtRules"]
    assert "expression(" in payload["advancedCss"]["blockedFunctions"]


def test_semantic_exports_ignore_advanced_css_payload() -> None:
    payload = _cv_payload("modern")
    payload["global_settings"] = {
        "template_id": "modern",
        "advanced_css": {
            "enabled": True,
            "mode": "css_patch",
            "css_text": ".section-title { color: #0f766e; }",
        },
    }
    payload["experience"] = [
        {
            "id": "exp-1",
            "role": "Lead Engineer",
            "company": "Mindris",
            "period": "2025",
            "location": {"city": "Paris", "country": "France"},
            "description_markdown": "- Shipped advanced CSS support",
        }
    ]

    with _session() as session:
        resume = create_resume_route(
            ResumeCreateRequest(
                name="Styled CV",
                cv_data=payload,
                template_id="modern",
            ),
            session,
        )["item"]

        exported = export_resume_json(int(resume["id"]), session)
        document = json.loads(exported.body)
        markdown = export_resume_markdown(int(resume["id"]), session).body.decode()
        html = export_resume_html(int(resume["id"]), session).body.decode()
        docx = export_resume_docx(int(resume["id"]), session)

        assert (
            document["cvData"]["global_settings"]["advanced_css"]["css_text"]
            == ".section-title { color: #0f766e; }"
        )
        assert ".section-title { color: #0f766e; }" not in markdown
        assert ".section-title { color: #0f766e; }" not in html

        with ZipFile(io.BytesIO(docx.body)) as package:
            xml = package.read("word/document.xml").decode()
            assert ".section-title { color: #0f766e; }" not in xml


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
