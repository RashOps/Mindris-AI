"""Artifact lineage tests for resume-aware ATS and cover letters."""

from database.session import SessionLocal, init_db
from persistence_domain.artifacts import (
    save_ats_report,
    save_cover_letter,
    serialize_ats,
    serialize_cover_letter,
)
from persistence_domain.resumes import (
    _latest_resume_revision,
    create_resume,
    update_resume,
)


def _cv(title: str) -> dict:
    return {
        "global_settings": {"template_id": "modern"},
        "profile": {
            "full_name": "Ada Lovelace",
            "title": title,
            "email": "ada@example.com",
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


def test_ats_and_letter_become_stale_after_resume_revision() -> None:
    init_db()
    with SessionLocal() as session:
        resume = create_resume(
            session,
            name="Lineage CV",
            cv_data=_cv("Engineer"),
            template_id="modern",
        )
        source_revision = _latest_resume_revision(session, resume.id)
        report = save_ats_report(
            session,
            {
                "score": 80,
                "context": {
                    "resume_id": resume.id,
                    "resume_revision": source_revision,
                },
            },
            "ollama",
            "local-model",
            resume_id=resume.id,
            resume_revision=source_revision,
        )
        letter = save_cover_letter(
            session,
            "# Lettre",
            "ollama",
            "local-model",
            resume_id=resume.id,
            resume_revision=source_revision,
        )

        update_resume(
            session,
            resume,
            cv_data=_cv("Senior Engineer"),
            source="manual",
        )
        current_revision = _latest_resume_revision(session, resume.id)

        serialized_report = serialize_ats(report, current_revision)
        serialized_letter = serialize_cover_letter(letter, current_revision)

    assert serialized_report["resume_revision"] == source_revision
    assert serialized_report["stale"] is True
    assert serialized_letter["resume_revision"] == source_revision
    assert serialized_letter["stale"] is True

