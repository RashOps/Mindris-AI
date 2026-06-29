"""PDF ingestion mode tests."""

from __future__ import annotations

from io import BytesIO

import pytest
from conftest import auth_headers, client
from intelligence import pdf_parser


def _parsed_cv_payload() -> dict:
    return {
        "global_settings": {"template_id": "modern"},
        "profile": {
            "full_name": "Ada Lovelace",
            "title": "Engineer",
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


def test_upload_pdf_rejects_unknown_ingestion_mode() -> None:
    api = client()
    response = api.post(
        "/api/v1/cv/upload-pdf",
        headers=auth_headers(),
        params={
            "provider": "groq",
            "model_name": "llama-3.3-70b-versatile",
            "ingestion_mode": "bad-mode",
        },
        files={
            "file": ("cv.pdf", BytesIO(b"%PDF-1.4 fake pdf"), "application/pdf"),
        },
    )
    assert response.status_code == 422
    assert response.json()["status"] == "error"


def test_upload_pdf_forwards_explicit_ingestion_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, str] = {}

    async def fake_parse_pdf_cv(
        pdf_bytes: bytes,
        filename: str = "cv.pdf",
        provider: str = "groq",
        model_name: str = "llama-3.3-70b-versatile",
        ingestion_mode: str = "auto",
    ) -> dict:
        seen["filename"] = filename
        seen["provider"] = provider
        seen["model_name"] = model_name
        seen["ingestion_mode"] = ingestion_mode
        assert pdf_bytes.startswith(b"%PDF")
        return _parsed_cv_payload()

    monkeypatch.setattr("intelligence.pdf_parser.parse_pdf_cv", fake_parse_pdf_cv)
    monkeypatch.setattr("intelligence.ingest_cv.ingest_cv_data", lambda cv_data: None)

    api = client()
    response = api.post(
        "/api/v1/cv/upload-pdf",
        headers=auth_headers(),
        data={
            "provider": "groq",
            "model_name": "llama-3.3-70b-versatile",
            "ingestion_mode": "local_text",
        },
        files={
            "file": ("candidate.pdf", BytesIO(b"%PDF-1.4 fake pdf"), "application/pdf"),
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert seen == {
        "filename": "candidate.pdf",
        "provider": "groq",
        "model_name": "llama-3.3-70b-versatile",
        "ingestion_mode": "local_text",
    }


@pytest.mark.asyncio
async def test_parse_pdf_cv_auto_falls_back_to_local_text_without_llama_cloud_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def fake_llama_parse(pdf_bytes: bytes, filename: str = "cv.pdf") -> str:
        calls.append("llama_parse")
        return "# Parsed with llama"

    async def fake_local_parse(pdf_bytes: bytes, filename: str = "cv.pdf") -> str:
        calls.append("local_text")
        return "# Parsed locally"

    monkeypatch.setattr(pdf_parser.settings, "llama_cloud_api_key", None)
    monkeypatch.setattr(pdf_parser, "pdf_to_markdown_llama_parse", fake_llama_parse)
    monkeypatch.setattr(pdf_parser, "pdf_to_markdown_local_text", fake_local_parse)
    monkeypatch.setattr(
        pdf_parser,
        "markdown_to_cv_json",
        lambda markdown, provider="groq", model_name="llama-3.3-70b-versatile": _parsed_cv_payload(),
    )

    result = await pdf_parser.parse_pdf_cv(
        b"%PDF-1.4 fake pdf",
        filename="cv.pdf",
        ingestion_mode="auto",
    )

    assert result["profile"]["full_name"] == "Ada Lovelace"
    assert calls == ["local_text"]
