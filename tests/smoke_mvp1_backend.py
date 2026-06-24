"""Backend MVP1 smoke check.

This script validates the backend contracts that do not require an LLM provider:
SQLite migrations, template catalogue, resume persistence, and workspace drafts.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api-gateway"))
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "packages"))

from database.session import SessionLocal, init_db  # noqa: E402
from exporters import resume_to_html, resume_to_markdown  # noqa: E402
from persistence import (  # noqa: E402
    create_resume,
    serialize_draft,
    update_resume,
    upsert_workspace_draft,
)
from routers.templates import list_templates  # noqa: E402


def main() -> None:
    """Run a minimal backend smoke check for MVP1."""
    init_db()
    templates = list_templates()["items"]
    template_ids = sorted(item["id"] for item in templates)
    expected = ["ats", "compact", "creative", "modern", "student"]
    if template_ids != expected:
        raise SystemExit(f"Unexpected templates: {template_ids}")

    cv_data = {
        "global_settings": {"template_id": "modern"},
        "profile": {"full_name": "Phase 5", "title": "QA"},
        "experience": [],
        "education": [],
        "skills": [],
        "projects": [],
        "languages": [],
        "hobbies": [],
    }

    session = SessionLocal()
    try:
        resume = create_resume(
            session,
            name="Phase 5 CV",
            cv_data=cv_data,
            template_id="modern",
        )
        markdown = resume_to_markdown(resume)
        html = resume_to_html(resume)
        if "# Phase 5" not in markdown:
            raise SystemExit("Markdown export smoke check failed.")
        if "Phase 5" not in html or "<script" in html.lower():
            raise SystemExit("HTML export smoke check failed.")
        update_resume(session, resume, name="Phase 5 CV Updated")
        draft = upsert_workspace_draft(
            session,
            draft_key="phase5",
            data={"status": "ok"},
        )
        if serialize_draft(draft)["data"]["status"] != "ok":
            raise SystemExit("Draft smoke check failed.")
        session.delete(resume)
        session.commit()
    finally:
        session.close()

    print("mvp1-backend-smoke-ok")  # noqa: T201


if __name__ == "__main__":
    main()
