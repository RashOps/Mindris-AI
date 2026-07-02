"""Markdown workspace API tests."""

from zipfile import ZipFile
from io import BytesIO

from routers.markdown import export_markdown_docx
from schemas import MarkdownDocumentRequest


def test_markdown_docx_export_returns_docx_package() -> None:
    response = export_markdown_docx(
        MarkdownDocumentRequest(
            title="Hiring Notes",
            markdown="# Hello\n\nThis is a markdown export.",
        ),
        None,
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

    with ZipFile(BytesIO(response.body)) as docx:
        document_xml = docx.read("word/document.xml").decode("utf-8")

    assert "Hiring Notes" in document_xml
    assert "This is a markdown export." in document_xml
