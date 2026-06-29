"""History routes."""

from typing import Annotated

from database.records import AtsReportRecord, CoverLetterRecord, ScrapedJobRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import serialize_ats, serialize_cover_letter, serialize_job
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/history", tags=["history"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


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
