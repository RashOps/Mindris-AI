"""Job, ATS report and cover letter persistence helpers."""

from typing import Any

from database.records import (
    AtsReportRecord,
    CoverLetterRecord,
    ScrapedJobRecord,
)
from database.session import Session
from persistence_lib.json import dump_json, load_json
from sqlalchemy import select
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")


def save_job_offer(session: Session, job_offer: Any) -> ScrapedJobRecord:
    """Persist a JobOffer-like object."""
    existing = session.exec(
        select(ScrapedJobRecord).where(ScrapedJobRecord.url == str(job_offer.url))
    ).first()
    payload = {
        "url": str(job_offer.url or ""),
        "title": job_offer.title,
        "company": job_offer.company,
        "location": job_offer.location,
        "hard_skills": dump_json(job_offer.hard_skills),
        "soft_skills": dump_json(job_offer.soft_skills),
        "description_markdown": job_offer.description_markdown or "",
    }
    if existing:
        for key, value in payload.items():
            setattr(existing, key, value)
        record = existing
    else:
        record = ScrapedJobRecord(**payload)
        session.add(record)
    session.commit()
    session.refresh(record)
    return record


def save_ats_report(
    session: Session,
    report: dict,
    provider: str,
    model_name: str,
    job_id: int | None = None,
) -> AtsReportRecord:
    """Persist an ATS report."""
    record = AtsReportRecord(
        job_id=job_id,
        score=int(report.get("score", 0)),
        summary=report.get("summary", ""),
        mode=report.get("mode", "standard"),
        keyword_analysis=dump_json(report.get("keyword_analysis", [])),
        rubric_json=dump_json(report.get("rubric", {})),
        scoring_breakdown=dump_json(report.get("scoring_breakdown", [])),
        deductions_json=dump_json(report.get("deductions", [])),
        recommendations=dump_json(report.get("recommendations", [])),
        context_json=dump_json(report.get("context", {})),
        provider=provider,
        model_name=model_name,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def save_cover_letter(
    session: Session,
    markdown: str,
    provider: str,
    model_name: str,
    job_id: int | None = None,
) -> CoverLetterRecord:
    """Persist a generated cover letter."""
    record = CoverLetterRecord(
        job_id=job_id,
        markdown_content=markdown,
        provider=provider,
        model_name=model_name,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def serialize_job(record: ScrapedJobRecord) -> dict:
    """Convert a job record to JSON-safe output."""
    return {
        "id": record.id,
        "url": record.url,
        "title": record.title,
        "company": record.company,
        "location": record.location,
        "hard_skills": load_json(record.hard_skills, []),
        "soft_skills": load_json(record.soft_skills, []),
        "description_markdown": record.description_markdown,
        "company_insight": load_json(record.company_insight_json, None),
        "scraped_at": record.scraped_at.isoformat(),
    }


def serialize_ats(record: AtsReportRecord) -> dict:
    """Convert an ATS record to JSON-safe output."""
    return {
        "id": record.id,
        "job_id": record.job_id,
        "score": record.score,
        "summary": record.summary,
        "mode": record.mode,
        "rubric": load_json(record.rubric_json, {}),
        "keyword_analysis": load_json(record.keyword_analysis, []),
        "scoring_breakdown": load_json(record.scoring_breakdown, []),
        "deductions": load_json(record.deductions_json, []),
        "recommendations": load_json(record.recommendations, []),
        "context": load_json(record.context_json, {}),
        "provider": record.provider,
        "model_name": record.model_name,
        "generated_at": record.generated_at.isoformat(),
    }


def serialize_cover_letter(record: CoverLetterRecord) -> dict:
    """Convert a cover letter record to JSON-safe output."""
    return {
        "id": record.id,
        "job_id": record.job_id,
        "markdown_content": record.markdown_content,
        "provider": record.provider,
        "model_name": record.model_name,
        "generated_at": record.generated_at.isoformat(),
    }
