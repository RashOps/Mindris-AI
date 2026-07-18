"""Browser E2E smoke for MVP1 critical flows.

The test expects the three services to be running:
- web:      http://localhost:3000
- api:      http://localhost:8000
- renderer: http://localhost:4000
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from typing import Any
from zipfile import ZipFile

from playwright.sync_api import Page, expect, sync_playwright

VALID_PREVIEW_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/C/HwAF/gL+Q5H0WQAAAABJRU5ErkJggg=="
)


def request_json(
    base_url: str,
    path: str,
    *,
    api_key: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Send a JSON API request using only the standard library."""
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed: {exc.code} {detail}") from exc
    return json.loads(body) if body else {}


def request_text(base_url: str, path: str, *, api_key: str) -> str:
    """Fetch a text response using the API key."""
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"X-API-Key": api_key},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8")


def request_bytes(base_url: str, path: str, *, api_key: str) -> bytes:
    """Fetch a binary response using the API key."""
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"X-API-Key": api_key},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def sample_cv(unique: str) -> dict[str, Any]:
    """Return a valid CV payload aligned with the backend schema."""
    return {
        "global_settings": {
            "font_family": "Inter",
            "font_size": "13px",
            "primary_color": "#2563eb",
            "line_height": "1.5",
            "margin_page": "48px",
            "margin_h": "64px",
            "margin_v": "48px",
            "entry_spacing": "20px",
            "col_left_width": "65",
            "col_swap": "false",
            "template_id": "modern",
        },
        "profile": {
            "full_name": f"E2E Candidate {unique}",
            "title": "Open Source AI Engineer",
            "phone": "+33 6 00 00 00 00",
            "email": "e2e@example.com",
            "location": {"city": "Paris", "country": "France"},
            "socials": [
                {
                    "type": "github",
                    "url": "https://github.com/mindris-ai",
                    "label": "GitHub",
                }
            ],
            "text_markdown": "Builder smoke profile for browser E2E.",
        },
        "experience": [
            {
                "id": f"exp-{unique}",
                "company": "Mindris Labs",
                "role": "AI Platform Engineer",
                "period": "2024 - Present",
                "location": {"city": "Paris", "country": "France"},
                "description_markdown": (
                    "- Built resume automation workflows\n- Improved ATS exports"
                ),
                "keywords": ["FastAPI", "Next.js", "ATS"],
            }
        ],
        "education": [
            {
                "id": f"edu-{unique}",
                "institution": "Open Source University",
                "degree": "MSc AI Systems",
                "period": "2022 - 2024",
                "location": "Paris, France",
                "description_markdown": "Focus on production AI systems.",
            }
        ],
        "skills": [
            {
                "id": f"skills-{unique}",
                "category": "Stack",
                "skills": ["Python", "FastAPI", "Next.js", "Docker"],
            }
        ],
        "projects": [
            {
                "id": f"project-{unique}",
                "name": "Mindris AI",
                "url": "https://github.com/mindris-ai",
                "description_markdown": "Open-source resume and job tooling.",
                "tech_stack": ["uv", "bun", "Playwright"],
            }
        ],
        "languages": [
            {"id": f"lang-{unique}", "language": "English", "level": "C1"},
            {"id": f"lang2-{unique}", "language": "French", "level": "Native"},
        ],
        "hobbies": ["Open source", "Career tooling"],
    }


def community_template_package() -> bytes:
    """Build a portable community template fixture for browser import."""
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr(
            "manifest.json",
            json.dumps(
                {
                    "id": "mindris/community-open-source",
                    "name": "Community Open Source",
                    "version": "1.0.0",
                    "author": "Mindris Community",
                    "license": "MIT",
                    "description": "Community template for OSS contributors.",
                    "category": "developer",
                    "tags": ["opensource", "developer"],
                    "engine_version": "1",
                }
            ),
        )
        archive.writestr(
            "template.json",
            json.dumps(
                {
                    "base_template_id": "modern",
                    "preset_settings": {
                        "global_settings": {
                            "template_id": "modern",
                            "colors": {"palette_preset": "tech"},
                        }
                    },
                }
            ),
        )
        archive.writestr("styles.css", ":host { --primary-color: #0f766e; }")
        archive.writestr("preview.png", VALID_PREVIEW_PNG)
    return buffer.getvalue()


def seed_resume(api_url: str, api_key: str, unique: str) -> str:
    """Create a resume so the builder has backend-owned data to load."""
    response = request_json(
        api_url,
        "/api/v1/resumes",
        api_key=api_key,
        method="POST",
        payload={
            "name": f"E2E Resume {unique}",
            "cv_data": sample_cv(unique),
            "template_id": "modern",
            "locale": "fr",
            "source": "e2e",
        },
    )
    return str(response["item"]["id"])


def seed_ats_draft(api_url: str, api_key: str) -> None:
    """Seed the ATS page with a deterministic report, avoiding LLM calls."""
    report = {
        "score": 82,
        "summary": (
            "E2E fixture: strong match with production and open-source keywords."
        ),
        "keyword_analysis": [
            {"keyword": "FastAPI", "found": True, "density": "2", "severity": "high"},
            {"keyword": "Docker", "found": True, "density": "1", "severity": "medium"},
            {"keyword": "Recruiter", "found": False, "density": "0", "severity": "low"},
        ],
        "scoring_breakdown": [
            {
                "criterion": "Keyword coverage",
                "weight": 40,
                "score": 34,
                "max_score": 40,
                "explanation": "Most core keywords are present.",
            },
            {
                "criterion": "Structure",
                "weight": 30,
                "score": 25,
                "max_score": 30,
                "explanation": "Sections are clear and parseable.",
            },
        ],
        "recommendations": [
            "Add one recruiter-facing impact bullet.",
            "Keep the ATS template for strict systems.",
        ],
    }
    request_json(
        api_url,
        "/api/v1/drafts/ats-report",
        api_key=api_key,
        method="PUT",
        payload={"data": {"report": report}},
    )


def seed_workflow_with_missing_tracker(
    api_url: str,
    api_key: str,
    *,
    resume_id: str,
    unique: str,
) -> int:
    """Create a degraded workflow with a missing tracker link for UI recovery E2E."""
    created = request_json(
        api_url,
        "/api/v1/workflows/opportunities",
        api_key=api_key,
        method="POST",
        payload={
            "company": f"Workflow Co {unique}",
            "role": f"Workflow Role {unique}",
            "source_url": f"https://example.com/workflow/{unique}",
            "notes": "Degraded workflow fixture for browser E2E.",
        },
    )["item"]
    opportunity_id = int(created["id"])

    request_json(
        api_url,
        f"/api/v1/workflows/opportunities/{opportunity_id}/resume-link",
        api_key=api_key,
        method="POST",
        payload={"resume_id": int(resume_id), "locale": "fr"},
    )
    tracker = request_json(
        api_url,
        f"/api/v1/workflows/opportunities/{opportunity_id}/tracker-link",
        api_key=api_key,
        method="POST",
        payload={"create": True, "status": "wishlist"},
    )["item"]
    application_id = int(tracker["application_id"])
    request_json(
        api_url,
        f"/api/v1/tracker/applications/{application_id}",
        api_key=api_key,
        method="DELETE",
    )
    for _ in range(20):
        item = request_json(
            api_url,
            f"/api/v1/workflows/opportunities/{opportunity_id}",
            api_key=api_key,
        )["item"]
        if item.get("integrity", {}).get("status") == "degraded":
            return opportunity_id
        time.sleep(0.25)
    raise AssertionError(
        "Seeded workflow did not become degraded after tracker deletion"
    )


def assert_download(page: Page, menu_name: str, item_name: str, suffix: str) -> None:
    """Open a grouped download menu and assert a non-empty download."""
    with page.expect_download(timeout=60_000) as download_info:
        menu = page.get_by_role("menu", name=f"{menu_name} menu")
        if not menu.is_visible():
            page.get_by_role("button", name=menu_name).click()
        page.get_by_role("menuitem", name=item_name).click()
    download = download_info.value
    suggested = download.suggested_filename
    path = download.path()
    if path is None:
        raise AssertionError(
            f"{menu_name} > {item_name} did not produce a local download path"
        )
    size = Path(path).stat().st_size
    if not suggested.lower().endswith(suffix):
        raise AssertionError(f"Expected {suffix} download, got {suggested}")
    if size <= 0:
        raise AssertionError(f"{suggested} is empty")


def assert_pdf_download(page: Page) -> None:
    """Assert the asynchronous renderer-backed PDF action with diagnostics."""
    downloads = []
    page.on("download", lambda download: downloads.append(download))
    if not page.get_by_role("menu", name="Exporter menu").is_visible():
        export_button = page.get_by_role("button", name="Exporter")
        export_button.click()
        expect(export_button).to_have_attribute("aria-expanded", "true", timeout=5_000)
    page.get_by_role("menuitem", name="PDF").click()
    expect(page.get_by_text("Génération du PDF...", exact=True)).to_be_visible()
    for _ in range(240):
        if downloads:
            break
        page.wait_for_timeout(250)
    if not downloads:
        toasts = page.locator(".fixed.z-\\[100\\]").all_inner_texts()
        raise AssertionError(f"PDF download did not start; visible toasts: {toasts}")
    download = downloads[0]
    path = download.path()
    if path is None or Path(path).stat().st_size <= 0:
        raise AssertionError("Exporter > PDF produced an empty file")
    if not download.suggested_filename.lower().endswith(".pdf"):
        raise AssertionError("Exporter > PDF produced an unexpected filename")


def run(args: argparse.Namespace) -> None:
    """Execute all MVP1 browser flows."""
    unique = str(int(time.time()))
    resume_id = seed_resume(args.api_url, args.api_key, unique)
    seed_ats_draft(args.api_url, args.api_key)
    degraded_workflow_id = seed_workflow_with_missing_tracker(
        args.api_url,
        args.api_key,
        resume_id=resume_id,
        unique=unique,
    )

    console_errors: list[str] = []
    page_errors: list[str] = []
    response_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        context = browser.new_context(
            accept_downloads=True,
            viewport={"width": 1440, "height": 1000},
        )
        page = context.new_page()
        page.on(
            "console",
            lambda message: (
                console_errors.append(message.text) if message.type == "error" else None
            ),
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "response",
            lambda response: (
                response_errors.append(
                    f"{response.status} {response.request.method} {response.url}"
                )
                if response.status >= 400
                else None
            ),
        )

        page.goto(f"{args.base_url.rstrip('/')}/dashboard")
        page.get_by_test_id("template-package-input").set_input_files(
            {
                "name": "community-open-source.mindris-template",
                "mimeType": "application/zip",
                "buffer": community_template_package(),
            }
        )
        expect(
            page.get_by_test_id("template-card-mindris-community-open-source")
        ).to_be_visible(timeout=15_000)
        preview = page.locator(
            '[data-testid="template-card-mindris-community-open-source"] img'
        )
        expect(preview).to_be_visible(timeout=15_000)
        expect(preview).to_have_js_property("naturalWidth", 1, timeout=15_000)
        with page.expect_download(timeout=30_000) as template_download_info:
            page.get_by_test_id("template-export-mindris-community-open-source").click()
        template_download = template_download_info.value
        template_path = template_download.path()
        if template_path is None or Path(template_path).stat().st_size <= 0:
            raise AssertionError("Community template export is empty")
        page.get_by_test_id("template-use-mindris-community-open-source").click()
        expect(page).to_have_url(
            f"{args.base_url.rstrip('/')}/tools/cv-creator", timeout=15_000
        )

        page.goto(f"{args.base_url.rstrip('/')}/tools/cv-creator")
        resume_name = f"E2E Resume {unique}"
        page.get_by_role("button", name="Choisir le CV").click()
        page.get_by_role("menuitem", name=resume_name).click()
        expect(page.get_by_role("button", name="Choisir le CV")).to_contain_text(
            resume_name,
            timeout=20_000,
        )
        page.get_by_role("button", name="Ajouter une langue").click()
        page.get_by_role("menuitem", name="EN", exact=True).click()
        page.get_by_role("button", name="Ajouter", exact=True).click()
        expect(page.get_by_role("button", name="EN", exact=True)).to_be_visible(
            timeout=10_000
        )
        page.get_by_role("button", name="EN", exact=True).click()
        expect(page.get_by_role("button", name="EN", exact=True)).to_have_class(
            re.compile(r"bg-primary")
        )
        expect(page.get_by_role("tab", name="Style", exact=True)).to_be_visible()
        page.get_by_role("tab", name="Style", exact=True).click()
        expect(page.get_by_label("Style panel")).to_be_visible()
        page.get_by_role("button", name="Template ATS Strict").click()
        page.get_by_role("tab", name="Document").click()
        page.get_by_label("Toggle one page challenge").check()
        page.get_by_role("tab", name="Sections").click()
        page.get_by_role(
            "button", name=re.compile(r"^(Expériences|Experience)")
        ).click()
        page.get_by_label("Libellé section experience").fill("Parcours professionnel")
        page.get_by_label("Affichage section experience").click()
        page.get_by_role("menuitem", name="timeline", exact=True).click()
        page.get_by_label(re.compile(r"Masquer la section (Languages|Langues)")).click()
        project_button = page.get_by_role(
            "button", name=re.compile(r"^(Projets|Projects)")
        )
        project_button.click()
        project_card = project_button.locator("..").locator("..")
        project_card.get_by_role("button", name="Monter", exact=True).click()
        expect(page.get_by_label("Libellé section experience")).to_have_value(
            "Parcours professionnel"
        )
        expect(page.get_by_text("Sauvegardé", exact=True)).to_be_visible(timeout=20_000)

        assert_pdf_download(page)
        assert_download(page, "Exporter", "DOCX", ".docx")
        assert_download(page, "Exporter", "LaTeX", ".tex")
        assert_download(page, "Exporter", "Typst", ".typ")

        resume = request_json(
            args.api_url,
            f"/api/v1/resumes/{resume_id}",
            api_key=args.api_key,
        )["item"]
        settings = resume["cvData"]["global_settings"]
        assert settings["template_id"] == "ats"
        assert settings["layout"]["columns"] == 1
        assert settings["layout"]["sidebar_position"] == "none"
        assert settings["colors"]["monochrome"] is True
        assert settings["page"]["one_page_challenge"] is True
        assert sorted(resume["multilingual"]["availableLocales"]) == ["en", "fr"]
        assert resume["multilingual"]["activeLocale"] == "en"

        markdown = request_text(
            args.api_url,
            f"/api/v1/resumes/{resume_id}/export-markdown",
            api_key=args.api_key,
        )
        html = request_text(
            args.api_url,
            f"/api/v1/resumes/{resume_id}/export-html",
            api_key=args.api_key,
        )
        docx = request_bytes(
            args.api_url,
            f"/api/v1/resumes/{resume_id}/export-docx",
            api_key=args.api_key,
        )
        with ZipFile(BytesIO(docx)) as package:
            document = package.read("word/document.xml").decode()

        assert "## Parcours professionnel" in markdown
        assert "## Projets" in markdown
        assert "## Languages" not in markdown
        assert markdown.index("## Projets") < markdown.index(
            "## Parcours professionnel"
        )

        assert "<h2>Parcours professionnel</h2>" in html
        assert "<h2>Projets</h2>" in html
        assert "Languages" not in html
        assert html.index("<h2>Projets</h2>") < html.index(
            "<h2>Parcours professionnel</h2>"
        )

        assert "Parcours professionnel" in document
        assert "Languages" not in document
        assert document.index("Projets") < document.index("Parcours professionnel")

        page.goto(f"{args.base_url.rstrip('/')}/tools/ats-score")
        expect(page.get_by_role("heading", name="Score ATS")).to_be_visible(
            timeout=15_000
        )
        expect(page.get_by_text("E2E fixture: strong match")).to_be_visible(
            timeout=15_000
        )
        expect(page.get_by_text("82")).to_be_visible()

        page.goto(f"{args.base_url.rstrip('/')}/tools/workflow")
        workflow_card = page.get_by_test_id(f"workflow-card-{degraded_workflow_id}")
        expect(workflow_card).to_be_visible(timeout=15_000)
        workflow_card.click()
        expect(
            page.get_by_test_id(f"workflow-selected-{degraded_workflow_id}")
        ).to_be_visible(timeout=15_000)

        request_json(
            args.api_url,
            f"/api/v1/workflows/opportunities/{degraded_workflow_id}/repair",
            api_key=args.api_key,
            method="POST",
            payload={"action": "detach_missing_application"},
        )

        repaired = request_json(
            args.api_url,
            f"/api/v1/workflows/opportunities/{degraded_workflow_id}",
            api_key=args.api_key,
        )["item"]
        if repaired["application_id"] is not None:
            raise AssertionError(
                "Workflow repair did not detach the missing tracker link"
            )
        if repaired["integrity"]["status"] != "healthy":
            raise AssertionError("Workflow repair did not restore healthy integrity")

        page.goto(f"{args.base_url.rstrip('/')}/tools/tracker")
        company = f"E2E Co {unique}"
        role = f"E2E Role {unique}"
        page.get_by_test_id("tracker-company-input").fill(company)
        page.get_by_test_id("tracker-role-input").fill(role)
        page.get_by_test_id("tracker-url-input").fill("https://example.com/jobs/e2e")
        page.get_by_test_id("tracker-add-button").click()
        card = page.locator("article", has_text=company).first
        expect(card).to_be_visible(timeout=15_000)
        card.get_by_role("button", name="Détails").click()
        card.get_by_role("button", name="Candidaté").click()
        applied_column = page.locator("section", has_text="Candidaté").first
        expect(applied_column.get_by_text(company)).to_be_visible(timeout=15_000)

        if console_errors or page_errors or response_errors:
            details = "\n".join(console_errors + page_errors + response_errors)
            raise AssertionError(f"Browser errors detected:\n{details}")

        context.close()
        browser.close()

    output = json.dumps(
        {
            "status": "ok",
            "resume_id": resume_id,
            "flows": [
                "community-template-import-export",
                "cv-builder",
                "docx",
                "pdf",
                "ats-draft",
                "tracker",
                "workflow-repair",
            ],
        },
        indent=2,
    )
    sys.stdout.write(f"{output}\n")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--api-key", default="dev-mindris-api-key")
    parser.add_argument("--headed", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
