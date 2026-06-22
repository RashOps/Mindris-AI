"""History routes."""

from database.records import AtsReportRecord, CoverLetterRecord, ScrapedJobRecord
from database.session import get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import serialize_ats, serialize_cover_letter, serialize_job
from sqlalchemy import select
from database.session import Session

router = APIRouter(prefix="/api/v1/history", tags=["history"])


@router.get("/jobs")
def list_jobs(
    limit: int = 50, offset: int = 0, session: Session = Depends(get_session)
) -> dict:
    """List scraped jobs."""
    rows = session.exec(
        select(ScrapedJobRecord)
        .order_by(ScrapedJobRecord.scraped_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return {"status": "success", "items": [serialize_job(row) for row in rows]}


@router.get("/jobs/{job_id}")
def get_job(job_id: int, session: Session = Depends(get_session)) -> dict:
    """Return one job with linked reports and letters."""
    job = session.get(ScrapedJobRecord, job_id)
    if not job:
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
def list_cover_letters(session: Session = Depends(get_session)) -> dict:
    """List generated cover letters."""
    rows = session.exec(
        select(CoverLetterRecord).order_by(CoverLetterRecord.generated_at.desc())
    ).all()
    return {"status": "success", "items": [serialize_cover_letter(row) for row in rows]}


@router.get("/ats-reports")
def list_ats_reports(session: Session = Depends(get_session)) -> dict:
    """List ATS reports."""
    rows = session.exec(
        select(AtsReportRecord).order_by(AtsReportRecord.generated_at.desc())
    ).all()
    return {"status": "success", "items": [serialize_ats(row) for row in rows]}


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, session: Session = Depends(get_session)) -> dict:
    """Delete a job and dependent records."""
    job = session.get(ScrapedJobRecord, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    for row in session.exec(select(AtsReportRecord).where(AtsReportRecord.job_id == job_id)).all():
        session.delete(row)
    for row in session.exec(select(CoverLetterRecord).where(CoverLetterRecord.job_id == job_id)).all():
        session.delete(row)
    session.delete(job)
    session.commit()
    return {"status": "success", "message": "Job deleted."}
