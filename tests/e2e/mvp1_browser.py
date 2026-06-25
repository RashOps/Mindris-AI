"""Browser E2E smoke for MVP1 critical flows.

The test expects the three services to be running:
- web:      http://localhost:3000
- api:      http://localhost:8000
- renderer: http://localhost:4000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
from typing import Any

from playwright.sync_api import Page, expect, sync_playwright


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
            "locale": "en",
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


def assert_download(page: Page, button_name: str, suffix: str) -> None:
    """Click a button and assert a non-empty download with the expected suffix."""
    with page.expect_download(timeout=30_000) as download_info:
        page.get_by_role("button", name=button_name).click()
    download = download_info.value
    suggested = download.suggested_filename
    path = download.path()
    if path is None:
        raise AssertionError(f"{button_name} did not produce a local download path")
    size = Path(path).stat().st_size
    if not suggested.lower().endswith(suffix):
        raise AssertionError(f"Expected {suffix} download, got {suggested}")
    if size <= 0:
        raise AssertionError(f"{suggested} is empty")


def run(args: argparse.Namespace) -> None:
    """Execute all MVP1 browser flows."""
    unique = str(int(time.time()))
    resume_id = seed_resume(args.api_url, args.api_key, unique)
    seed_ats_draft(args.api_url, args.api_key)

    console_errors: list[str] = []
    page_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        context = browser.new_context(
            accept_downloads=True,
            viewport={"width": 1440, "height": 1000},
        )
        page = context.new_page()
        page.on(
            "console",
            lambda message: console_errors.append(message.text)
            if message.type == "error"
            else None,
        )
        page.on("pageerror", lambda error: page_errors.append(str(error)))

        page.goto(f"{args.base_url.rstrip('/')}/tools/cv-creator")
        expect(page.locator('select[title="Active resume"]')).to_have_value(
            resume_id,
            timeout=20_000,
        )
        expect(page.get_by_role("button", name="Style")).to_be_visible()
        page.get_by_role("button", name="Style").click()
        expect(page.get_by_label("Style panel")).to_be_visible()
        page.get_by_role("button", name="ATS Strict").click()
        page.get_by_role("button", name="Sections").click()
        page.get_by_label("Section label experience").fill("Parcours professionnel")
        page.get_by_label("Toggle section languages").uncheck()
        page.get_by_label("Move section projects up").click()
        page.get_by_label("Section placement experience").selectOption("main")
        page.get_by_label("Section display mode experience").selectOption("timeline")
        expect(page.get_by_label("Section label experience")).to_have_value(
            "Parcours professionnel"
        )
        page.get_by_label("Style panel").get_by_role("button", name="✕").click()
        page.locator(".fixed.inset-0.z-40").wait_for(state="detached", timeout=5_000)
        expect(page.get_by_role("button", name="Saved")).to_be_visible(timeout=20_000)

        assert_download(page, "↓ DOCX", ".docx")
        assert_download(page, "↓ Export", ".pdf")

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
        assert "## Projects" in markdown
        assert "## Languages" not in markdown
        assert markdown.index("## Projects") < markdown.index("## Parcours professionnel")

        assert "<h2>Parcours professionnel</h2>" in html
        assert "<h2>Projects</h2>" in html
        assert "Languages" not in html
        assert html.index("<h2>Projects</h2>") < html.index("<h2>Parcours professionnel</h2>")

        assert "Parcours professionnel" in document
        assert "Languages" not in document
        assert document.index("Projects") < document.index("Parcours professionnel")

        page.goto(f"{args.base_url.rstrip('/')}/tools/ats-score")
        expect(page.get_by_text("ATS Score Analyzer")).to_be_visible(timeout=15_000)
        expect(page.get_by_text("E2E fixture: strong match")).to_be_visible(
            timeout=15_000
        )
        expect(page.get_by_text("82")).to_be_visible()

        page.goto(f"{args.base_url.rstrip('/')}/tools/tracker")
        company = f"E2E Co {unique}"
        role = f"E2E Role {unique}"
        page.get_by_placeholder("Company").fill(company)
        page.get_by_placeholder("Role").fill(role)
        page.get_by_placeholder("Job URL").fill("https://example.com/jobs/e2e")
        page.get_by_role("button", name="Add application").click()
        card = page.locator("article", has_text=company).first
        expect(card).to_be_visible(timeout=15_000)
        card.get_by_role("button", name="Applied").click()
        applied_column = page.locator("section", has_text="Applied").first
        expect(applied_column.get_by_text(company)).to_be_visible(timeout=15_000)

        if console_errors or page_errors:
            details = "\n".join(console_errors + page_errors)
            raise AssertionError(f"Browser errors detected:\n{details}")

        context.close()
        browser.close()

    output = json.dumps(
        {
            "status": "ok",
            "resume_id": resume_id,
            "flows": ["cv-builder", "docx", "pdf", "ats-draft", "tracker"],
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
