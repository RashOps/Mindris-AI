"""Resume library routes."""

from typing import Annotated, Any

from database.records import ResumeRecord
from database.session import Session, get_session
from exporters import (
    resume_to_docx,
    resume_to_html,
    resume_to_latex,
    resume_to_markdown,
    resume_to_typst,
    safe_export_filename,
)
from fastapi import APIRouter, Depends, HTTPException, Response
from persistence import (
    activate_resume_locale_variant,
    compare_resume_revisions,
    create_resume,
    create_resume_locale_variant,
    create_resume_revision,
    delete_resume_locale_variant,
    dump_json,
    get_resume_revision,
    list_resume_revisions,
    load_json,
    localized_resume_record,
    serialize_resume,
    serialize_resume_revision,
    update_resume,
)
from routers.templates import apply_template_defaults
from schemas import (
    CVDataModel,
    ResumeCreateRequest,
    ResumeImportRequest,
    ResumeLocaleCreateRequest,
    ResumeUpdateRequest,
)
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/resumes", tags=["resumes"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _template_id(cv_data: dict[str, Any], fallback: str = "modern") -> str:
    settings = cv_data.get("global_settings", {})
    if isinstance(settings, dict) and isinstance(settings.get("template_id"), str):
        return settings["template_id"]
    return fallback


def _get_resume(session: Session, resume_id: int) -> ResumeRecord:
    record = session.get(ResumeRecord, resume_id)
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return record


def _payload_from_import(request: ResumeImportRequest) -> tuple[str, dict[str, Any]]:
    if request.resume:
        resume = request.resume
        cv_data = resume.get("cvData") or resume.get("cv_data")
        if not isinstance(cv_data, dict):
            raise HTTPException(status_code=422, detail="Invalid resume JSON.")
        cv_data = CVDataModel.model_validate(cv_data).model_dump(mode="json")
        name = request.name or str(resume.get("name") or "Imported CV")
        return name, cv_data

    if request.cv_data:
        return request.name or "Imported CV", request.cv_data.model_dump(mode="json")

    raise HTTPException(status_code=422, detail="Missing cv_data or resume.")


@router.get("")
def list_resumes(session: SessionDep) -> dict:
    """List all persisted resumes."""
    rows = session.exec(
        select(ResumeRecord).order_by(ResumeRecord.updated_at.desc())
    ).all()
    return {
        "status": "success",
        "items": [serialize_resume(session, row) for row in rows],
    }


@router.post("")
def create_resume_route(request: ResumeCreateRequest, session: SessionDep) -> dict:
    """Create a new persisted resume."""
    logger.info("Creating resume '%s'", request.name)
    cv_data = request.cv_data.model_dump(mode="json")
    cv_data = apply_template_defaults(
        cv_data,
        request.template_id or _template_id(cv_data),
        session=session,
    )
    record = create_resume(
        session,
        name=request.name,
        cv_data=cv_data,
        template_id=request.template_id or _template_id(cv_data),
        locale=request.locale,
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(session, record)}


@router.get("/{resume_id}")
def get_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Return one persisted resume."""
    return {
        "status": "success",
        "item": serialize_resume(session, _get_resume(session, resume_id)),
    }


@router.patch("/{resume_id}")
def update_resume_route(
    resume_id: int,
    request: ResumeUpdateRequest,
    session: SessionDep,
) -> dict:
    """Patch a persisted resume."""
    logger.info("Updating resume %s", resume_id)
    cv_data = request.cv_data.model_dump(mode="json") if request.cv_data else None
    if cv_data is not None and request.template_id:
        cv_data = apply_template_defaults(
            cv_data,
            request.template_id,
            session=session,
        )
    record = update_resume(
        session,
        _get_resume(session, resume_id),
        name=request.name,
        cv_data=cv_data,
        target_locale=request.target_locale,
        template_id=request.template_id,
        locale=request.locale,
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(session, record)}


@router.delete("/{resume_id}")
def delete_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Delete a persisted resume."""
    logger.info("Deleting resume %s", resume_id)
    record = _get_resume(session, resume_id)
    session.delete(record)
    session.commit()
    return {"status": "success", "message": "Resume deleted."}


@router.post("/{resume_id}/duplicate")
def duplicate_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Duplicate a persisted resume."""
    logger.info("Duplicating resume %s", resume_id)
    source = _get_resume(session, resume_id)
    cv_data = load_json(source.data_json, {})
    record = create_resume(
        session,
        name=f"{source.name} copy",
        cv_data=cv_data,
        template_id=source.template_id,
        locale=source.locale,
        source="duplicate",
    )
    return {"status": "success", "item": serialize_resume(session, record)}


@router.post("/{resume_id}/locales")
def create_resume_locale_route(
    resume_id: int,
    request: ResumeLocaleCreateRequest,
    session: SessionDep,
) -> dict:
    """Create a locale variant for an existing resume."""
    logger.info("Creating locale '%s' for resume %s", request.locale, resume_id)
    try:
        record = create_resume_locale_variant(
            session,
            _get_resume(session, resume_id),
            locale=request.locale,
            source_locale=request.source_locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_resume(session, record)}


@router.post("/{resume_id}/locales/{locale}/activate")
def activate_resume_locale_route(
    resume_id: int,
    locale: str,
    session: SessionDep,
) -> dict:
    """Switch the active locale variant for an existing resume."""
    logger.info("Activating locale '%s' for resume %s", locale, resume_id)
    try:
        record = activate_resume_locale_variant(
            session,
            _get_resume(session, resume_id),
            locale=locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_resume(session, record)}


@router.delete("/{resume_id}/locales/{locale}")
def delete_resume_locale_route(
    resume_id: int,
    locale: str,
    session: SessionDep,
) -> dict:
    """Delete a locale variant from an existing resume."""
    logger.info("Deleting locale '%s' for resume %s", locale, resume_id)
    try:
        record = delete_resume_locale_variant(
            session,
            _get_resume(session, resume_id),
            locale=locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_resume(session, record)}


@router.post("/import-json")
def import_resume_json(request: ResumeImportRequest, session: SessionDep) -> dict:
    """Import raw CV data or a ResumeDocument-like JSON object."""
    logger.info("Importing resume JSON source=%s", request.source)
    name, cv_data = _payload_from_import(request)
    record = create_resume(
        session,
        name=name,
        cv_data=cv_data,
        template_id=_template_id(cv_data),
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(session, record)}


@router.get("/{resume_id}/export-json")
def export_resume_json(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a resume document JSON export."""
    record = _get_resume(session, resume_id)
    item = serialize_resume(session, record)
    if locale is not None:
        localized = localized_resume_record(record, locale=locale)
        item["cvData"] = load_json(localized.data_json, {})
        item["locale"] = localized.locale
        item["multilingual"]["activeLocale"] = localized.locale
    return Response(
        content=dump_json(item),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "json")}"'
            )
        },
    )


@router.get("/{resume_id}/revisions")
def list_resume_revisions_route(resume_id: int, session: SessionDep) -> dict:
    """Return all stored revisions for a resume."""
    _get_resume(session, resume_id)
    rows = list_resume_revisions(session, resume_id)
    return {
        "status": "success",
        "items": [serialize_resume_revision(row) for row in rows],
    }


@router.post("/{resume_id}/revisions")
def create_resume_revision_route(resume_id: int, session: SessionDep) -> dict:
    """Create a manual snapshot for a resume."""
    logger.info("Creating manual revision for resume %s", resume_id)
    record = _get_resume(session, resume_id)
    revision = create_resume_revision(session, record, label="manual snapshot")
    return {"status": "success", "item": serialize_resume_revision(revision)}


@router.post("/{resume_id}/revisions/{revision}/restore")
def restore_resume_revision_route(
    resume_id: int, revision: int, session: SessionDep
) -> dict:
    """Restore a previous resume snapshot."""
    logger.info("Restoring revision %s for resume %s", revision, resume_id)
    record = _get_resume(session, resume_id)
    snapshot = get_resume_revision(session, resume_id, revision)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Revision not found.")
    restored = update_resume(
        session,
        record,
        name=snapshot.name,
        cv_data=load_json(snapshot.data_json, {}),
        template_id=snapshot.template_id,
        locale=snapshot.locale,
        source="restore",
    )
    return {"status": "success", "item": serialize_resume(session, restored)}


@router.get("/{resume_id}/revisions/compare")
def compare_resume_revisions_route(
    resume_id: int,
    base_revision: int,
    target_revision: int,
    session: SessionDep,
    locale: str | None = None,
) -> dict:
    """Compare two snapshots for the same resume."""
    _get_resume(session, resume_id)
    payload = compare_resume_revisions(
        session, resume_id, base_revision, target_revision, locale=locale
    )
    if not payload:
        raise HTTPException(status_code=404, detail="Revision not found.")
    return {"status": "success", "item": payload}


@router.get("/{resume_id}/export-markdown")
def export_resume_markdown(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a resume document Markdown export."""
    record = localized_resume_record(_get_resume(session, resume_id), locale=locale)
    return Response(
        content=resume_to_markdown(record),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "md")}"'
            )
        },
    )


@router.get("/{resume_id}/export-latex")
def export_resume_latex(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a resume document LaTeX export."""
    record = localized_resume_record(_get_resume(session, resume_id), locale=locale)
    return Response(
        content=resume_to_latex(record),
        media_type="application/x-latex; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "tex")}"'
            )
        },
    )


@router.get("/{resume_id}/export-typst")
def export_resume_typst(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a resume document Typst export."""
    record = localized_resume_record(_get_resume(session, resume_id), locale=locale)
    return Response(
        content=resume_to_typst(record),
        media_type="text/typst; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "typ")}"'
            )
        },
    )


@router.get("/{resume_id}/export-html")
def export_resume_html(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a standalone resume document HTML export."""
    record = localized_resume_record(_get_resume(session, resume_id), locale=locale)
    return Response(
        content=resume_to_html(record),
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "html")}"'
            )
        },
    )


@router.get("/{resume_id}/export-docx")
def export_resume_docx(
    resume_id: int, session: SessionDep, locale: str | None = None
) -> Response:
    """Return a recruiter-friendly DOCX resume export."""
    record = localized_resume_record(_get_resume(session, resume_id), locale=locale)
    return Response(
        content=resume_to_docx(record),
        media_type=(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{safe_export_filename(record.name, "docx")}"'
            )
        },
    )
