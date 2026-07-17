"""Application tracker routes."""

from datetime import datetime
from typing import Annotated

from database.records import (
    ApplicationRecord,
    ApplicationReminderRecord,
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
    ApplicationReminderCreateRequest,
    ApplicationReminderUpdateRequest,
    ApplicationUpdateRequest,
)
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/tracker", tags=["tracker"])
STATUSES = ("wishlist", "applied", "interview", "offer", "rejected")
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _parse_iso_datetime(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail=f"Invalid ISO datetime value: {value}"
        ) from exc


def serialize_reminder(row: ApplicationReminderRecord) -> dict:
    """Convert an application reminder to JSON-safe output."""
    return {
        "id": row.id,
        "application_id": row.application_id,
        "title": row.title,
        "due_at": row.due_at.isoformat(),
        "status": row.status,
        "notes": row.notes,
        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def _reminder_counts(reminders: list[ApplicationReminderRecord]) -> dict[str, int]:
    counts = {"pending": 0, "completed": 0, "dismissed": 0}
    for reminder in reminders:
        counts.setdefault(reminder.status, 0)
        counts[reminder.status] += 1
    return counts


def serialize_application(
    row: ApplicationRecord,
    reminders: list[ApplicationReminderRecord] | None = None,
) -> dict:
    """Convert an application row to JSON-safe output."""
    reminder_rows = reminders or []
    pending = sorted(
        [reminder for reminder in reminder_rows if reminder.status == "pending"],
        key=lambda reminder: reminder.due_at,
    )
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
        "reminder_counts": _reminder_counts(reminder_rows),
        "next_reminder": serialize_reminder(pending[0]) if pending else None,
        "reminders": [serialize_reminder(reminder) for reminder in reminder_rows],
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


def _application_reminders_map(
    session: Session,
) -> dict[int, list[ApplicationReminderRecord]]:
    reminders = session.exec(
        select(ApplicationReminderRecord).order_by(ApplicationReminderRecord.due_at.asc())
    ).all()
    grouped: dict[int, list[ApplicationReminderRecord]] = {}
    for reminder in reminders:
        grouped.setdefault(reminder.application_id, []).append(reminder)
    return grouped


def _get_application(session: Session, application_id: int) -> ApplicationRecord:
    row = session.get(ApplicationRecord, application_id)
    if not row:
        logger.warning("Application %s not found", application_id)
        raise HTTPException(status_code=404, detail="Application not found.")
    return row


def _get_reminder(
    session: Session,
    application_id: int,
    reminder_id: int,
) -> ApplicationReminderRecord:
    reminder = session.get(ApplicationReminderRecord, reminder_id)
    if not reminder or reminder.application_id != application_id:
        logger.warning(
            "Reminder %s not found for application %s", reminder_id, application_id
        )
        raise HTTPException(status_code=404, detail="Reminder not found.")
    return reminder


@router.get("/applications")
async def list_applications(session: SessionDep) -> dict:
    """Return applications grouped by status."""
    reminder_map = _application_reminders_map(session)
    rows = session.exec(
        select(ApplicationRecord).order_by(
            ApplicationRecord.status,
            ApplicationRecord.position,
        )
    ).all()
    grouped = {status: [] for status in STATUSES}
    for row in rows:
        grouped.setdefault(row.status, []).append(
            serialize_application(row, reminder_map.get(row.id or 0, []))
        )
    return {
        "status": "success",
        "items": [
            serialize_application(row, reminder_map.get(row.id or 0, []))
            for row in rows
        ],
        "columns": grouped,
    }


@router.post("/applications")
async def create_application(
    request: ApplicationCreateRequest, session: SessionDep
) -> dict:
    """Create an application tracker item."""
    logger.info(
        "Creating application for company=%s role=%s", request.company, request.role
    )
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
    return {"status": "success", "item": serialize_application(row, [])}


@router.patch("/applications/{application_id}")
async def update_application(
    application_id: int,
    request: ApplicationUpdateRequest,
    session: SessionDep,
) -> dict:
    """Patch an application tracker item."""
    row = _get_application(session, application_id)
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
    reminders = _application_reminders_map(session).get(row.id or 0, [])
    return {"status": "success", "item": serialize_application(row, reminders)}


@router.patch("/applications/{application_id}/move")
async def move_application(
    application_id: int,
    request: ApplicationMoveRequest,
    session: SessionDep,
) -> dict:
    """Move an application between Kanban columns."""
    _ensure_status(request.status)
    row = _get_application(session, application_id)
    logger.info(
        "Moving application %s to %s/%s",
        application_id,
        request.status,
        request.position,
    )
    row.status = request.status
    row.position = request.position
    if request.status == "applied" and not row.applied_at:
        row.applied_at = datetime.now()
    row.updated_at = datetime.now()
    session.add(row)
    session.commit()
    session.refresh(row)
    reminders = _application_reminders_map(session).get(row.id or 0, [])
    return {"status": "success", "item": serialize_application(row, reminders)}


@router.delete("/applications/{application_id}")
async def delete_application(application_id: int, session: SessionDep) -> dict:
    """Delete an application tracker item."""
    row = _get_application(session, application_id)
    logger.info("Deleting application %s", application_id)
    reminder_rows = session.exec(
        select(ApplicationReminderRecord).where(
            ApplicationReminderRecord.application_id == application_id
        )
    ).all()
    for reminder in reminder_rows:
        session.delete(reminder)
    session.delete(row)
    session.commit()
    return {"status": "success", "message": "Application deleted."}


@router.get("/applications/{application_id}/full")
async def get_application_full(application_id: int, session: SessionDep) -> dict:
    """Return an application with linked job, ATS report, and cover letter."""
    row = _get_application(session, application_id)
    reminders = session.exec(
        select(ApplicationReminderRecord)
        .where(ApplicationReminderRecord.application_id == application_id)
        .order_by(ApplicationReminderRecord.due_at.asc())
    ).all()
    job = session.get(ScrapedJobRecord, row.job_id) if row.job_id else None
    ats = session.get(AtsReportRecord, row.ats_report_id) if row.ats_report_id else None
    letter = (
        session.get(CoverLetterRecord, row.cover_letter_id)
        if row.cover_letter_id
        else None
    )
    return {
        "status": "success",
        "application": serialize_application(row, reminders),
        "job": serialize_job(job) if job else None,
        "ats_report": serialize_ats(ats) if ats else None,
        "cover_letter": serialize_cover_letter(letter) if letter else None,
        "reminders": [serialize_reminder(reminder) for reminder in reminders],
    }


@router.get("/applications/{application_id}/reminders")
async def list_application_reminders(application_id: int, session: SessionDep) -> dict:
    """List follow-up reminders for one application."""
    _get_application(session, application_id)
    rows = session.exec(
        select(ApplicationReminderRecord)
        .where(ApplicationReminderRecord.application_id == application_id)
        .order_by(ApplicationReminderRecord.due_at.asc())
    ).all()
    return {"status": "success", "items": [serialize_reminder(row) for row in rows]}


@router.post("/applications/{application_id}/reminders")
async def create_application_reminder(
    application_id: int,
    request: ApplicationReminderCreateRequest,
    session: SessionDep,
) -> dict:
    """Create a follow-up reminder for one application."""
    _get_application(session, application_id)
    row = ApplicationReminderRecord(
        application_id=application_id,
        title=request.title,
        due_at=_parse_iso_datetime(request.due_at),
        notes=request.notes,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"status": "success", "item": serialize_reminder(row)}


@router.patch("/applications/{application_id}/reminders/{reminder_id}")
async def update_application_reminder(
    application_id: int,
    reminder_id: int,
    request: ApplicationReminderUpdateRequest,
    session: SessionDep,
) -> dict:
    """Patch one follow-up reminder."""
    row = _get_reminder(session, application_id, reminder_id)
    data = request.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        row.title = data["title"]
    if "due_at" in data and data["due_at"] is not None:
        row.due_at = _parse_iso_datetime(data["due_at"])
    if "notes" in data and data["notes"] is not None:
        row.notes = data["notes"]
    if "status" in data and data["status"] is not None:
        row.status = data["status"]
        row.completed_at = (
            datetime.now() if data["status"] == "completed" else None
        )
    row.updated_at = datetime.now()
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"status": "success", "item": serialize_reminder(row)}


@router.delete("/applications/{application_id}/reminders/{reminder_id}")
async def delete_application_reminder(
    application_id: int,
    reminder_id: int,
    session: SessionDep,
) -> dict:
    """Delete one follow-up reminder."""
    row = _get_reminder(session, application_id, reminder_id)
    session.delete(row)
    session.commit()
    return {"status": "success", "message": "Reminder deleted."}
