"""Backend MVP1 smoke check.

This script validates the backend contracts that do not require an LLM provider:
SQLite migrations, template catalogue, resume persistence, and workspace drafts.
"""

from __future__ import annotations

import asyncio
import sys
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "api-gateway"))
sys.path.insert(0, str(ROOT / "services"))
sys.path.insert(0, str(ROOT / "packages"))

from database.session import SessionLocal, init_db  # noqa: E402
from exporters import (  # noqa: E402
    resume_to_docx,
    resume_to_html,
    resume_to_latex,
    resume_to_markdown,
    resume_to_typst,
)
from persistence import (  # noqa: E402
    create_resume,
    serialize_draft,
    update_resume,
    upsert_workspace_draft,
)
from routers.system import readiness_checks  # noqa: E402
from routers.templates import list_templates  # noqa: E402


def main() -> None:
    """Run a minimal backend smoke check for MVP1."""
    init_db()
    templates = list_templates()["items"]
    template_ids = sorted(item["id"] for item in templates if item["status"] == "ready")
    expected = ["ats", "compact", "creative", "modern", "student"]
    if template_ids != expected:
        raise SystemExit(f"Unexpected templates: {template_ids}")
    readiness = asyncio.run(readiness_checks())
    if readiness["status"] != "ready":
        raise SystemExit(f"Readiness smoke check failed: {readiness}")

    cv_data = {
        "global_settings": {
            "schema_version": "2",
            "template_id": "ats",
            "layout": {"columns": 1, "sidebar_position": "none"},
            "colors": {"monochrome": True},
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
                {"id": "skills", "type": "skills", "label": "Compétences"},
            ],
        },
        "profile": {"full_name": "Phase 5", "title": "QA"},
        "experience": [
            {
                "id": "exp-1",
                "role": "Engineer",
                "company": "Mindris",
                "period": "2024",
                "location": "Paris",
                "description_markdown": "- Built the studio",
            }
        ],
        "education": [],
        "skills": [],
        "projects": [
            {
                "id": "proj-1",
                "name": "Mindris AI",
                "description_markdown": "- Open-source CV tooling",
            }
        ],
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
        latex = resume_to_latex(resume)
        typst = resume_to_typst(resume)
        docx = resume_to_docx(resume)
        if "# Phase 5" not in markdown:
            raise SystemExit("Markdown export smoke check failed.")
        if "## Parcours professionnel" not in markdown:
            raise SystemExit("Markdown label smoke check failed.")
        if "## Langues" in markdown:
            raise SystemExit("Markdown hidden section smoke check failed.")
        if markdown.index("## Projets") > markdown.index("## Parcours professionnel"):
            raise SystemExit("Markdown ordering smoke check failed.")
        if "Phase 5" not in html or "<script" in html.lower():
            raise SystemExit("HTML export smoke check failed.")
        if "<h2>Parcours professionnel</h2>" not in html:
            raise SystemExit("HTML label smoke check failed.")
        if "<h2>Langues</h2>" in html:
            raise SystemExit("HTML hidden section smoke check failed.")
        if html.index("<h2>Projets</h2>") > html.index("<h2>Parcours professionnel</h2>"):
            raise SystemExit("HTML ordering smoke check failed.")
        if "\\begin{document}" not in latex or "Phase 5" not in latex:
            raise SystemExit("LaTeX export smoke check failed.")
        if "= Phase 5" not in typst or "Phase 5" not in typst:
            raise SystemExit("Typst export smoke check failed.")
        with ZipFile(BytesIO(docx)) as package:
            if "word/document.xml" not in package.namelist():
                raise SystemExit("DOCX export package smoke check failed.")
            document = package.read("word/document.xml").decode()
            if "Phase 5" not in document:
                raise SystemExit("DOCX export content smoke check failed.")
            if "Parcours professionnel" not in document:
                raise SystemExit("DOCX label smoke check failed.")
            if "Langues" in document:
                raise SystemExit("DOCX hidden section smoke check failed.")
            if document.index("Projets") > document.index("Parcours professionnel"):
                raise SystemExit("DOCX ordering smoke check failed.")
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
