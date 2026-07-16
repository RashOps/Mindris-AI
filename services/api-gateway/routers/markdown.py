"""Markdown workspace routes."""

from auth import verify_api_key
from exporters import markdown_to_docx, safe_export_filename
from fastapi import APIRouter, Depends, Response
from schemas import MarkdownDocumentRequest

router = APIRouter(prefix="/api/v1/markdown", tags=["markdown"])


@router.post("/export-docx")
def export_markdown_docx(
    request: MarkdownDocumentRequest,
    _: None = Depends(verify_api_key),
) -> Response:
    """Return a DOCX export for the Markdown workspace."""
    title = request.title.strip() or "Document"
    return Response(
        content=markdown_to_docx(request.markdown, title=title),
        media_type=(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(title, "docx")}"'
            )
        },
    )
