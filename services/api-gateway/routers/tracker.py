"""Application tracker routes."""

from datetime import datetime
from typing import Annotated

from database.records import (
    ApplicationRecord,
    AtsReportRecord,
    CoverLetterRecord,
    ScrapedJobRecord,
)
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import serialize_ats, serialize_cover_letter, serialize_job
from schemas import (
    ApplicationCreateRequest,
    ApplicationMoveRequest,
    ApplicationUpdateRequest,
)
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/tracker", tags=["tracker"])
STATUSES = ("wishlist", "applied", "interview", "offer", "rejected")
SessionDep = Annotated[Session, Depends(get_session)]


def serialize_application(row: ApplicationRecord) -> dict:
    """Convert an application row to JSON-safe output."""
    return {
        "id": row.id,
        "job_id": row.job_id,
        "status": row.status,
        "position": row.position,
        "company": row.company,
        "role": row.role,
        "url": row.url,
        "notes": row.notes,
        "applied_at": row.applied_at.isoformat() if row.applied_at else None,
        "cover_letter_id": row.cover_letter_id,
        "ats_report_id": row.ats_report_id,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def _ensure_status(status: str) -> None:
    if status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {status}")


def _application_payload(request: ApplicationCreateRequest) -> dict:
    payload = request.model_dump()
    if payload.get("url") is not None:
        payload["url"] = str(payload["url"])
    return payload


@router.get("/applications")
def list_applications(session: SessionDep) -> dict:
    """Return applications grouped by status."""
    rows = session.exec(
        select(ApplicationRecord).order_by(
            ApplicationRecord.status,
            ApplicationRecord.position,
        )
    ).all()
    grouped = {status: [] for status in STATUSES}
    for row in rows:
        grouped.setdefault(row.status, []).append(serialize_application(row))
    return {
        "status": "success",
        "items": [serialize_application(row) for row in rows],
        "columns": grouped,
    }


@router.post("/applications")
def create_application(request: ApplicationCreateRequest, session: SessionDep) -> dict:
    """Create an application tracker item."""
    _ensure_status(request.status)
    max_pos = len(
        session.exec(
            select(ApplicationRecord).where(ApplicationRecord.status == request.status)
        ).all()
    )
    row = ApplicationRecord(
        **_application_payload(request),
        position=max_pos,
        applied_at=datetime.now() if request.status == "applied" else None,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"status": "success", "item": serialize_application(row)}


@router.patch("/applications/{application_id}")
def update_application(
    application_id: int,
    request: ApplicationUpdateRequest,
    session: SessionDep,
) -> dict:
    """Patch an application tracker item."""
    row = session.get(ApplicationRecord, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")
    data = request.model_dump(exclude_unset=True)
    if data.get("url") is not None:
        data["url"] = str(data["url"])
    if "status" in data and data["status"] is not None:
        _ensure_status(data["status"])
        if (
            row.status != data["status"]
            and data["status"] == "applied"
            and not row.applied_at
        ):
            row.applied_at = datetime.now()
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.now()
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"status": "success", "item": serialize_application(row)}


@router.patch("/applications/{application_id}/move")
def move_application(
    application_id: int,
    request: ApplicationMoveRequest,
    session: SessionDep,
) -> dict:
    """Move an application between Kanban columns."""
    _ensure_status(request.status)
    row = session.get(ApplicationRecord, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")
    row.status = request.status
    row.position = request.position
    if request.status == "applied" and not row.applied_at:
        row.applied_at = datetime.now()
    row.updated_at = datetime.now()
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"status": "success", "item": serialize_application(row)}


@router.delete("/applications/{application_id}")
def delete_application(application_id: int, session: SessionDep) -> dict:
    """Delete an application tracker item."""
    row = session.get(ApplicationRecord, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")
    session.delete(row)
    session.commit()
    return {"status": "success", "message": "Application deleted."}


@router.get("/applications/{application_id}/full")
def get_application_full(application_id: int, session: SessionDep) -> dict:
    """Return an application with linked job, ATS report, and cover letter."""
    row = session.get(ApplicationRecord, application_id)
    if not row:
        raise HTTPException(status_code=404, detail="Application not found.")
    job = session.get(ScrapedJobRecord, row.job_id) if row.job_id else None
    ats = session.get(AtsReportRecord, row.ats_report_id) if row.ats_report_id else None
    letter = (
        session.get(CoverLetterRecord, row.cover_letter_id)
        if row.cover_letter_id
        else None
    )
    return {
        "status": "success",
        "application": serialize_application(row),
        "job": serialize_job(job) if job else None,
        "ats_report": serialize_ats(ats) if ats else None,
        "cover_letter": serialize_cover_letter(letter) if letter else None,
    }
