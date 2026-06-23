"""Persistence helpers shared by API routers."""

import json
from datetime import datetime
from typing import Any

from database.records import (
    AtsReportRecord,
    CoverLetterRecord,
    CVDocumentRecord,
    ScrapedJobRecord,
)
from database.session import Session
from sqlalchemy import select


def dump_json(value: Any) -> str:
    """Serialize JSON safely for SQLite text columns."""
    return json.dumps(value, ensure_ascii=False)


def load_json(value: str | None, fallback: Any) -> Any:
    """Deserialize JSON from SQLite text columns."""
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def save_current_cv(
    session: Session, cv_data: dict, source: str = "json"
) -> CVDocumentRecord:
    """Upsert the current CV document."""
    record = session.exec(
        select(CVDocumentRecord).where(CVDocumentRecord.name == "current")
    ).first()
    now = datetime.now()
    if record:
        record.data_json = dump_json(cv_data)
        record.source = source
        record.updated_at = now
    else:
        record = CVDocumentRecord(
            name="current",
            data_json=dump_json(cv_data),
            source=source,
            created_at=now,
            updated_at=now,
        )
        session.add(record)
    session.commit()
    session.refresh(record)
    return record


def get_current_cv(session: Session) -> dict | None:
    """Return the current CV data, if any."""
    record = session.exec(
        select(CVDocumentRecord).where(CVDocumentRecord.name == "current")
    ).first()
    return load_json(record.data_json, None) if record else None


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
        keyword_analysis=dump_json(report.get("keyword_analysis", [])),
        scoring_breakdown=dump_json(report.get("scoring_breakdown", [])),
        recommendations=dump_json(report.get("recommendations", [])),
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
        "keyword_analysis": load_json(record.keyword_analysis, []),
        "scoring_breakdown": load_json(record.scoring_breakdown, []),
        "recommendations": load_json(record.recommendations, []),
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
