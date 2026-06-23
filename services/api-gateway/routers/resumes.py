"""Resume library routes."""

from typing import Annotated, Any

from database.records import ResumeRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException, Response
from persistence import (
    create_resume,
    dump_json,
    load_json,
    serialize_resume,
    update_resume,
)
from schemas import (
    CVDataModel,
    ResumeCreateRequest,
    ResumeImportRequest,
    ResumeUpdateRequest,
)
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/resumes", tags=["resumes"])
SessionDep = Annotated[Session, Depends(get_session)]


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
    return {"status": "success", "items": [serialize_resume(row) for row in rows]}


@router.post("")
def create_resume_route(request: ResumeCreateRequest, session: SessionDep) -> dict:
    """Create a new persisted resume."""
    cv_data = request.cv_data.model_dump(mode="json")
    record = create_resume(
        session,
        name=request.name,
        cv_data=cv_data,
        template_id=request.template_id or _template_id(cv_data),
        locale=request.locale,
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(record)}


@router.get("/{resume_id}")
def get_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Return one persisted resume."""
    return {
        "status": "success",
        "item": serialize_resume(_get_resume(session, resume_id)),
    }


@router.patch("/{resume_id}")
def update_resume_route(
    resume_id: int,
    request: ResumeUpdateRequest,
    session: SessionDep,
) -> dict:
    """Patch a persisted resume."""
    cv_data = request.cv_data.model_dump(mode="json") if request.cv_data else None
    record = update_resume(
        session,
        _get_resume(session, resume_id),
        name=request.name,
        cv_data=cv_data,
        template_id=request.template_id,
        locale=request.locale,
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(record)}


@router.delete("/{resume_id}")
def delete_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Delete a persisted resume."""
    record = _get_resume(session, resume_id)
    session.delete(record)
    session.commit()
    return {"status": "success", "message": "Resume deleted."}


@router.post("/{resume_id}/duplicate")
def duplicate_resume_route(resume_id: int, session: SessionDep) -> dict:
    """Duplicate a persisted resume."""
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
    return {"status": "success", "item": serialize_resume(record)}


@router.post("/import-json")
def import_resume_json(request: ResumeImportRequest, session: SessionDep) -> dict:
    """Import raw CV data or a ResumeDocument-like JSON object."""
    name, cv_data = _payload_from_import(request)
    record = create_resume(
        session,
        name=name,
        cv_data=cv_data,
        template_id=_template_id(cv_data),
        source=request.source,
    )
    return {"status": "success", "item": serialize_resume(record)}


@router.get("/{resume_id}/export-json")
def export_resume_json(resume_id: int, session: SessionDep) -> Response:
    """Return a resume document JSON export."""
    record = _get_resume(session, resume_id)
    return Response(
        content=dump_json(serialize_resume(record)),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{record.name.replace(" ", "_")}.json"'
            )
        },
    )
