"""CV upload hardening tests."""

from __future__ import annotations

from io import BytesIO

from conftest import auth_headers, client


def test_upload_pdf_rejects_empty_file() -> None:
    api = client()
    response = api.post(
        "/api/v1/cv/upload-pdf",
        headers=auth_headers(),
        files={
            "file": ("cv.pdf", BytesIO(b""), "application/pdf"),
        },
    )

    assert response.status_code == 400
    assert "empty" in str(response.json()["message"]).lower()


def test_upload_pdf_rejects_invalid_pdf_signature() -> None:
    api = client()
    response = api.post(
        "/api/v1/cv/upload-pdf",
        headers=auth_headers(),
        files={
            "file": ("cv.pdf", BytesIO(b"not-a-pdf"), "application/pdf"),
        },
    )

    assert response.status_code == 400
    assert "pdf" in str(response.json()["message"]).lower()
