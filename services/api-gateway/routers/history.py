"""History routes."""

from datetime import datetime
from typing import Annotated, Any

from database.records import (
    ApplicationRecord,
    ApplicationReminderRecord,
    AtsReportRecord,
    CoverLetterRecord,
    OpportunityRecord,
    OpportunityTransitionRecord,
    ResumeRevisionRecord,
    ScrapedJobRecord,
)
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import (
    list_opportunity_transitions,
    serialize_ats,
    serialize_cover_letter,
    serialize_job,
    serialize_opportunity_transition,
    serialize_resume_revision,
)
from schemas import ActivityLedgerItem, ActivityLedgerLink
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/history", tags=["history"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _link(subject_type: str, subject_id: int | str, relation: str) -> dict:
    return ActivityLedgerLink(
        subject_type=subject_type,
        subject_id=str(subject_id),
        relation=relation,
    ).model_dump(mode="json")


def _ledger_item(
    *,
    id: str,
    subject_type: str,
    subject_id: int | str,
    title: str,
    summary: str,
    timestamp: datetime,
    provider: str | None = None,
    model_name: str | None = None,
    status: str | None = None,
    links: list[dict] | None = None,
    metadata: dict | None = None,
) -> dict:
    return ActivityLedgerItem(
        id=id,
        subject_type=subject_type,
        subject_id=str(subject_id),
        title=title,
        summary=summary,
        timestamp=timestamp.isoformat(),
        provider=provider,
        model_name=model_name,
        status=status,
        links=links or [],
        metadata=metadata or {},
    ).model_dump(mode="json")


def _job_ledger_item(row: ScrapedJobRecord) -> dict:
    return _ledger_item(
        id=f"job_scrape:{row.id}",
        subject_type="job_scrape",
        subject_id=row.id or 0,
        title=row.title,
        summary=row.company,
        timestamp=row.scraped_at,
        links=[],
        metadata={
            "job_id": row.id,
            "company": row.company,
            "location": row.location,
            "url": row.url,
        },
    )


def _ats_ledger_item(row: AtsReportRecord) -> dict:
    item = serialize_ats(row)
    context = item.get("context", {})
    links = []
    if row.job_id:
        links.append(_link("job_scrape", row.job_id, "evaluated_against"))
    if context.get("resume_id") is not None:
        links.append(_link("resume_revision", context["resume_id"], "evaluated_resume"))
    return _ledger_item(
        id=f"ats_report:{row.id}",
        subject_type="ats_report",
        subject_id=row.id or 0,
        title=context.get("job_title") or "ATS report",
        summary=item.get("summary", ""),
        timestamp=row.generated_at,
        provider=row.provider,
        model_name=row.model_name,
        status=item.get("mode"),
        links=links,
        metadata={
            "score": item.get("score", 0),
            "mode": item.get("mode", "standard"),
            "job_id": row.job_id,
            "resume_id": context.get("resume_id"),
            "resume_locale": context.get("resume_locale"),
        },
    )


def _cover_letter_ledger_item(row: CoverLetterRecord) -> dict:
    links = []
    if row.job_id:
        links.append(_link("job_scrape", row.job_id, "written_for"))
    return _ledger_item(
        id=f"cover_letter:{row.id}",
        subject_type="cover_letter",
        subject_id=row.id or 0,
        title="Cover letter",
        summary=row.markdown_content[:120],
        timestamp=row.generated_at,
        provider=row.provider,
        model_name=row.model_name,
        links=links,
        metadata={"job_id": row.job_id},
    )


def _resume_revision_ledger_item(row: ResumeRevisionRecord) -> dict:
    item = serialize_resume_revision(row)
    return _ledger_item(
        id=f"resume_revision:{row.id}",
        subject_type="resume_revision",
        subject_id=row.id or 0,
        title=item["name"],
        summary=item.get("label") or f"Revision {item['revision']}",
        timestamp=row.created_at,
        status=item.get("locale"),
        links=[_link("resume_document", row.resume_id, "snapshot_of")],
        metadata=item,
    )


def _tracker_ledger_item(row: ApplicationRecord) -> dict:
    links = []
    if row.job_id:
        links.append(_link("job_scrape", row.job_id, "tracks"))
    if row.ats_report_id:
        links.append(_link("ats_report", row.ats_report_id, "uses"))
    if row.cover_letter_id:
        links.append(_link("cover_letter", row.cover_letter_id, "uses"))
    return _ledger_item(
        id=f"tracker_event:{row.id}",
        subject_type="tracker_event",
        subject_id=row.id or 0,
        title=row.role,
        summary=row.company,
        timestamp=row.updated_at,
        status=row.status,
        links=links,
        metadata={
            "company": row.company,
            "role": row.role,
            "job_id": row.job_id,
            "ats_report_id": row.ats_report_id,
            "cover_letter_id": row.cover_letter_id,
            "url": row.url,
        },
    )


def _opportunity_ledger_item(session: Session, row: OpportunityRecord) -> dict:
    links = []
    if row.job_id:
        links.append(_link("job_scrape", row.job_id, "originates_from"))
    if row.resume_id:
        links.append(_link("resume_document", row.resume_id, "selected_resume"))
    if row.ats_report_id:
        links.append(_link("ats_report", row.ats_report_id, "evaluated_with"))
    if row.cover_letter_id:
        links.append(_link("cover_letter", row.cover_letter_id, "prepared_with"))
    if row.application_id:
        links.append(_link("tracker_event", row.application_id, "tracked_as"))
    transitions = [
        serialize_opportunity_transition(item)
        for item in list_opportunity_transitions(session, row.id or 0)
    ]
    latest = transitions[-1] if transitions else None
    return _ledger_item(
        id=f"opportunity:{row.id}",
        subject_type="opportunity",
        subject_id=row.id or 0,
        title=row.role,
        summary=row.company,
        timestamp=row.last_transition_at,
        status=row.current_state,
        links=links,
        metadata={
            "job_id": row.job_id,
            "resume_id": row.resume_id,
            "resume_locale": row.resume_locale,
            "ats_report_id": row.ats_report_id,
            "cover_letter_id": row.cover_letter_id,
            "application_id": row.application_id,
            "source_url": row.source_url,
            "transition_count": len(transitions),
            "last_action": latest["action"] if latest else None,
        },
    )


def _llm_run_items(
    ats_rows: list[AtsReportRecord],
    cover_rows: list[CoverLetterRecord],
) -> list[dict]:
    items: list[dict] = []
    for row in ats_rows:
        items.append(
            _ledger_item(
                id=f"llm_run:ats_report:{row.id}",
                subject_type="llm_run",
                subject_id=f"ats_report:{row.id}",
                title="ATS scoring run",
                summary=f"{row.provider}/{row.model_name}",
                timestamp=row.generated_at,
                provider=row.provider,
                model_name=row.model_name,
                links=[_link("ats_report", row.id or 0, "produced")],
                metadata={"artifact_type": "ats_report", "artifact_id": row.id},
            )
        )
    for row in cover_rows:
        items.append(
            _ledger_item(
                id=f"llm_run:cover_letter:{row.id}",
                subject_type="llm_run",
                subject_id=f"cover_letter:{row.id}",
                title="Cover letter run",
                summary=f"{row.provider}/{row.model_name}",
                timestamp=row.generated_at,
                provider=row.provider,
                model_name=row.model_name,
                links=[_link("cover_letter", row.id or 0, "produced")],
                metadata={"artifact_type": "cover_letter", "artifact_id": row.id},
            )
        )
    return items


def _build_history_ledger(session: Session) -> list[dict]:
    jobs = session.exec(
        select(ScrapedJobRecord).order_by(ScrapedJobRecord.scraped_at.desc())
    ).all()
    ats_reports = session.exec(
        select(AtsReportRecord).order_by(AtsReportRecord.generated_at.desc())
    ).all()
    cover_letters = session.exec(
        select(CoverLetterRecord).order_by(CoverLetterRecord.generated_at.desc())
    ).all()
    revisions = session.exec(
        select(ResumeRevisionRecord).order_by(ResumeRevisionRecord.created_at.desc())
    ).all()
    tracker_rows = session.exec(
        select(ApplicationRecord).order_by(ApplicationRecord.updated_at.desc())
    ).all()
    opportunities = session.exec(
        select(OpportunityRecord).order_by(OpportunityRecord.last_transition_at.desc())
    ).all()

    items = [
        *[_job_ledger_item(row) for row in jobs],
        *[_ats_ledger_item(row) for row in ats_reports],
        *[_cover_letter_ledger_item(row) for row in cover_letters],
        *[_resume_revision_ledger_item(row) for row in revisions],
        *[_tracker_ledger_item(row) for row in tracker_rows],
        *[_opportunity_ledger_item(session, row) for row in opportunities],
        *_llm_run_items(ats_reports, cover_letters),
    ]
    return sorted(items, key=lambda item: item["timestamp"], reverse=True)


def _purge_records(session: Session, model: type[Any]) -> int:
    rows = session.exec(select(model)).all()
    for row in rows:
        session.delete(row)
    return len(rows)


@router.get("/jobs")
async def list_jobs(session: SessionDep, limit: int = 50, offset: int = 0) -> dict:
    """List scraped jobs."""
    rows = session.exec(
        select(ScrapedJobRecord)
        .order_by(ScrapedJobRecord.scraped_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {"status": "success", "items": [serialize_job(row) for row in rows]}


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, session: SessionDep) -> dict:
    """Return one job with linked reports and letters."""
    job = session.get(ScrapedJobRecord, job_id)
    if not job:
        logger.warning("Job %s not found", job_id)
        raise HTTPException(status_code=404, detail="Job not found.")
    ats_reports = session.exec(
        select(AtsReportRecord).where(AtsReportRecord.job_id == job_id)
    ).all()
    letters = session.exec(
        select(CoverLetterRecord).where(CoverLetterRecord.job_id == job_id)
    ).all()
    return {
        "status": "success",
        "job": serialize_job(job),
        "ats_reports": [serialize_ats(row) for row in ats_reports],
        "cover_letters": [serialize_cover_letter(row) for row in letters],
    }


@router.get("/cover-letters")
async def list_cover_letters(session: SessionDep) -> dict:
    """List generated cover letters."""
    rows = session.exec(
        select(CoverLetterRecord).order_by(CoverLetterRecord.generated_at.desc())
    ).all()
    return {"status": "success", "items": [serialize_cover_letter(row) for row in rows]}


@router.get("/ats-reports")
async def list_ats_reports(session: SessionDep) -> dict:
    """List ATS reports."""
    rows = session.exec(
        select(AtsReportRecord).order_by(AtsReportRecord.generated_at.desc())
    ).all()
    return {"status": "success", "items": [serialize_ats(row) for row in rows]}


@router.get("/ledger")
async def list_history_ledger(
    session: SessionDep,
    subject_type: str | None = None,
    job_id: int | None = None,
    resume_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """Return a unified chronological history ledger."""
    items = _build_history_ledger(session)
    if subject_type:
        items = [item for item in items if item["subject_type"] == subject_type]
    if job_id is not None:
        items = [
            item
            for item in items
            if item["metadata"].get("job_id") == job_id
            or any(
                link["subject_type"] == "job_scrape"
                and link["subject_id"] == str(job_id)
                for link in item["links"]
            )
        ]
    if resume_id is not None:
        items = [
            item
            for item in items
            if item["metadata"].get("resume_id") == resume_id
            or any(
                link["subject_type"] in {"resume_revision", "resume_document"}
                and link["subject_id"] == str(resume_id)
                for link in item["links"]
            )
        ]
    total = len(items)
    return {
        "status": "success",
        "items": items[offset : offset + limit],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.delete("/ledger")
async def clear_history_ledger(session: SessionDep) -> dict:
    """Delete persisted history artifacts without deleting source resumes."""
    logger.warning("Clearing unified history ledger and dependent artifacts")
    deleted: dict[str, int] = {}
    try:
        deleted["application_reminders"] = _purge_records(
            session, ApplicationReminderRecord
        )
        deleted["opportunity_transitions"] = _purge_records(
            session, OpportunityTransitionRecord
        )
        deleted["opportunities"] = _purge_records(session, OpportunityRecord)
        deleted["applications"] = _purge_records(session, ApplicationRecord)
        deleted["ats_reports"] = _purge_records(session, AtsReportRecord)
        deleted["cover_letters"] = _purge_records(session, CoverLetterRecord)
        deleted["jobs"] = _purge_records(session, ScrapedJobRecord)
        deleted["resume_revisions"] = _purge_records(session, ResumeRevisionRecord)
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to clear unified history ledger")
        raise

    return {
        "status": "success",
        "message": "Unified history cleared.",
        "deleted": deleted,
    }


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: int, session: SessionDep) -> dict:
    """Delete a job and dependent records."""
    job = session.get(ScrapedJobRecord, job_id)
    if not job:
        logger.warning("Delete requested for missing job %s", job_id)
        raise HTTPException(status_code=404, detail="Job not found.")
    logger.info("Deleting job %s and dependent records", job_id)
    ats_query = select(AtsReportRecord).where(AtsReportRecord.job_id == job_id)
    letter_query = select(CoverLetterRecord).where(CoverLetterRecord.job_id == job_id)
    for row in session.exec(ats_query).all():
        session.delete(row)
    for row in session.exec(letter_query).all():
        session.delete(row)
    session.delete(job)
    session.commit()
    return {"status": "success", "message": "Job deleted."}
