"""Workflow automation routes."""

from typing import Annotated

from database.records import (
    ApplicationRecord,
    AtsReportRecord,
    CoverLetterRecord,
    OpportunityRecord,
    ResumeRecord,
    ScrapedJobRecord,
)
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import (
    create_opportunity,
    create_or_attach_opportunity_application,
    link_opportunity_ats_report,
    link_opportunity_cover_letter,
    link_opportunity_resume,
    mark_opportunity_ready_to_apply,
    repair_opportunity_integrity,
    serialize_opportunity,
)
from schemas import (
    OpportunityAtsLinkRequest,
    OpportunityCoverLetterLinkRequest,
    OpportunityCreateRequest,
    OpportunityRepairRequest,
    OpportunityResumeLinkRequest,
    OpportunityTrackerLinkRequest,
)
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _get_opportunity(session: Session, opportunity_id: int) -> OpportunityRecord:
    record = session.get(OpportunityRecord, opportunity_id)
    if not record:
        raise HTTPException(status_code=404, detail="Opportunity not found.")
    return record


def _get_job(session: Session, job_id: int) -> ScrapedJobRecord:
    job = session.get(ScrapedJobRecord, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def _validate_job_alignment(
    opportunity: OpportunityRecord,
    artifact_job_id: int | None,
    artifact_name: str,
) -> None:
    if (
        opportunity.job_id is not None
        and artifact_job_id is not None
        and opportunity.job_id != artifact_job_id
    ):
        raise HTTPException(
            status_code=422,
            detail=f"{artifact_name} does not belong to the linked job.",
        )


@router.get("/opportunities")
def list_opportunities(
    session: SessionDep,
    state: str | None = None,
    job_id: int | None = None,
) -> dict:
    """List persisted workflow opportunities."""
    query = select(OpportunityRecord).order_by(OpportunityRecord.updated_at.desc())
    rows = session.exec(query).all()
    if state is not None:
        rows = [row for row in rows if row.current_state == state]
    if job_id is not None:
        rows = [row for row in rows if row.job_id == job_id]
    return {
        "status": "success",
        "items": [serialize_opportunity(session, row) for row in rows],
    }


@router.post("/opportunities")
def create_opportunity_route(
    request: OpportunityCreateRequest,
    session: SessionDep,
) -> dict:
    """Create a new workflow opportunity."""
    company = request.company
    role = request.role
    source_url = str(request.source_url) if request.source_url else None
    job_id = request.job_id
    if job_id is not None:
        job = _get_job(session, job_id)
        company = job.company
        role = job.title
        source_url = job.url
    logger.info("Creating opportunity for company=%s role=%s", company, role)
    record = create_opportunity(
        session,
        company=company or "",
        role=role or "",
        job_id=job_id,
        source_url=source_url,
        notes=request.notes,
        metadata=request.metadata,
    )
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.get("/opportunities/{opportunity_id}")
def get_opportunity_route(opportunity_id: int, session: SessionDep) -> dict:
    """Return one workflow opportunity."""
    return {
        "status": "success",
        "item": serialize_opportunity(
            session,
            _get_opportunity(session, opportunity_id),
        ),
    }


@router.post("/opportunities/{opportunity_id}/resume-link")
def link_resume_route(
    opportunity_id: int,
    request: OpportunityResumeLinkRequest,
    session: SessionDep,
) -> dict:
    """Link a resume variant to an opportunity."""
    record = _get_opportunity(session, opportunity_id)
    resume = session.get(ResumeRecord, request.resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    logger.info("Linking resume %s to opportunity %s", resume.id, opportunity_id)
    try:
        link_opportunity_resume(
            session,
            record,
            resume=resume,
            locale=request.locale,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.post("/opportunities/{opportunity_id}/ats-link")
def link_ats_route(
    opportunity_id: int,
    request: OpportunityAtsLinkRequest,
    session: SessionDep,
) -> dict:
    """Link an ATS report to an opportunity."""
    record = _get_opportunity(session, opportunity_id)
    ats_report = session.get(AtsReportRecord, request.ats_report_id)
    if not ats_report:
        raise HTTPException(status_code=404, detail="ATS report not found.")
    _validate_job_alignment(record, ats_report.job_id, "ATS report")
    logger.info(
        "Linking ATS report %s to opportunity %s",
        ats_report.id,
        opportunity_id,
    )
    link_opportunity_ats_report(session, record, ats_report=ats_report)
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.post("/opportunities/{opportunity_id}/cover-letter-link")
def link_cover_letter_route(
    opportunity_id: int,
    request: OpportunityCoverLetterLinkRequest,
    session: SessionDep,
) -> dict:
    """Link a cover letter to an opportunity."""
    record = _get_opportunity(session, opportunity_id)
    cover_letter = session.get(CoverLetterRecord, request.cover_letter_id)
    if not cover_letter:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    _validate_job_alignment(record, cover_letter.job_id, "Cover letter")
    logger.info(
        "Linking cover letter %s to opportunity %s",
        cover_letter.id,
        opportunity_id,
    )
    link_opportunity_cover_letter(session, record, cover_letter=cover_letter)
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.post("/opportunities/{opportunity_id}/tracker-link")
def link_tracker_route(
    opportunity_id: int,
    request: OpportunityTrackerLinkRequest,
    session: SessionDep,
) -> dict:
    """Create or attach a tracker entry from workflow context."""
    record = _get_opportunity(session, opportunity_id)
    application = None
    if request.application_id is not None:
        application = session.get(ApplicationRecord, request.application_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")
    logger.info("Linking tracker entry to opportunity %s", opportunity_id)
    try:
        create_or_attach_opportunity_application(
            session,
            record,
            application=application,
            create=request.create,
            status=request.status,
            notes=request.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.post("/opportunities/{opportunity_id}/ready")
def mark_ready_route(opportunity_id: int, session: SessionDep) -> dict:
    """Mark an opportunity ready to apply once required artifacts are linked."""
    record = _get_opportunity(session, opportunity_id)
    logger.info("Marking opportunity %s ready to apply", opportunity_id)
    try:
        mark_opportunity_ready_to_apply(session, record)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_opportunity(session, record)}


@router.post("/opportunities/{opportunity_id}/repair")
def repair_opportunity_route(
    opportunity_id: int,
    request: OpportunityRepairRequest,
    session: SessionDep,
) -> dict:
    """Execute one bounded integrity repair action on an opportunity."""
    record = _get_opportunity(session, opportunity_id)
    logger.info(
        "Repairing opportunity %s with action=%s",
        opportunity_id,
        request.action,
    )
    try:
        repair_opportunity_integrity(session, record, action=request.action)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status": "success", "item": serialize_opportunity(session, record)}
