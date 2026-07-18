"""CV upload hardening tests."""

from __future__ import annotations

from io import BytesIO

from conftest import auth_headers, client

PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
)


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


def test_upload_profile_photo_returns_renderer_safe_data_url(
    tmp_path, monkeypatch
) -> None:
    from utils.config import settings

    monkeypatch.setattr(settings, "storage_dir", tmp_path)
    response = client().post(
        "/api/v1/cv/photo",
        headers=auth_headers(),
        files={"file": ("portrait.png", BytesIO(PNG_1X1), "image/png")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["photo_url"].startswith("data:image/png;base64,")
    assert payload["asset_id"].endswith(".png")
    assert (tmp_path / "cv-assets" / payload["asset_id"]).is_file()


def test_upload_profile_photo_rejects_unsafe_content() -> None:
    response = client().post(
        "/api/v1/cv/photo",
        headers=auth_headers(),
        files={"file": ("portrait.svg", BytesIO(b"<svg></svg>"), "image/svg+xml")},
    )

    assert response.status_code == 400
