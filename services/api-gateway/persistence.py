"""Persistence helpers shared by API routers."""

import json
from datetime import datetime
from typing import Any

from database.records import (
    AtsReportRecord,
    CoverLetterRecord,
    CVDocumentRecord,
    ResumeRecord,
    ResumeRevisionRecord,
    ScrapedJobRecord,
    WorkspaceDraftRecord,
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


def _locale_from_cv_data(cv_data: dict | None, fallback: str = "fr") -> str:
    if not isinstance(cv_data, dict):
        return fallback
    global_settings = cv_data.get("global_settings")
    if isinstance(global_settings, dict):
        locale = global_settings.get("locale")
        if isinstance(locale, dict):
            label_language = locale.get("label_language")
            if label_language == "en":
                return "en"
            if label_language == "fr":
                return "fr"
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


def _latest_resume_revision(session: Session, resume_id: int | None) -> int:
    if resume_id is None:
        return 0
    row = session.exec(
        select(ResumeRevisionRecord.revision)
        .where(ResumeRevisionRecord.resume_id == resume_id)
        .order_by(ResumeRevisionRecord.revision.desc())
    ).first()
    return int(row or 0)


def serialize_resume(session: Session, record: ResumeRecord) -> dict:
    """Convert a resume record to the public API shape."""
    cv_data = load_json(record.data_json, {})
    return {
        "id": str(record.id),
        "name": record.name,
        "cvData": cv_data,
        "templateId": record.template_id,
        "locale": record.locale,
        "source": record.source,
        "revision": _latest_resume_revision(session, record.id),
        "createdAt": record.created_at.isoformat(),
        "updatedAt": record.updated_at.isoformat(),
    }


def create_resume(
    session: Session,
    *,
    name: str,
    cv_data: dict,
    template_id: str = "modern",
    locale: str = "fr",
    source: str = "manual",
) -> ResumeRecord:
    """Create a persisted resume document."""
    now = datetime.now()
    locale = _locale_from_cv_data(cv_data, locale or "fr")
    record = ResumeRecord(
        name=name,
        data_json=dump_json(cv_data),
        template_id=template_id,
        locale=locale,
        source=source,
        created_at=now,
        updated_at=now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    create_resume_revision(session, record, label="initial")
    return record


def update_resume(
    session: Session,
    record: ResumeRecord,
    *,
    name: str | None = None,
    cv_data: dict | None = None,
    template_id: str | None = None,
    locale: str | None = None,
    source: str | None = None,
) -> ResumeRecord:
    """Patch a persisted resume document."""
    if name is not None:
        record.name = name
    if cv_data is not None:
        record.data_json = dump_json(cv_data)
        record.template_id = template_id or cv_data.get("global_settings", {}).get(
            "template_id", record.template_id
        )
        locale = _locale_from_cv_data(cv_data, locale or record.locale)
    elif template_id is not None:
        record.template_id = template_id
    if locale is not None:
        record.locale = locale
    if source is not None:
        record.source = source
    record.updated_at = datetime.now()
    session.add(record)
    session.commit()
    session.refresh(record)
    create_resume_revision(session, record, label=source or "update")
    return record


def create_resume_revision(
    session: Session,
    record: ResumeRecord,
    *,
    label: str | None = None,
) -> ResumeRevisionRecord:
    """Store a snapshot for a resume version."""
    next_revision = _latest_resume_revision(session, record.id) + 1
    revision = ResumeRevisionRecord(
        resume_id=int(record.id or 0),
        revision=next_revision,
        name=record.name,
        data_json=record.data_json,
        template_id=record.template_id,
        locale=record.locale,
        source=record.source,
        label=label,
        created_at=datetime.now(),
    )
    session.add(revision)
    session.commit()
    session.refresh(revision)
    return revision


def list_resume_revisions(
    session: Session,
    resume_id: int,
) -> list[ResumeRevisionRecord]:
    """Return all snapshots for a resume."""
    return session.exec(
        select(ResumeRevisionRecord)
        .where(ResumeRevisionRecord.resume_id == resume_id)
        .order_by(ResumeRevisionRecord.revision.desc())
    ).all()


def get_resume_revision(
    session: Session,
    resume_id: int,
    revision: int,
) -> ResumeRevisionRecord | None:
    """Return one resume snapshot by revision number."""
    return session.exec(
        select(ResumeRevisionRecord).where(
            ResumeRevisionRecord.resume_id == resume_id,
            ResumeRevisionRecord.revision == revision,
        )
    ).first()


def serialize_resume_revision(record: ResumeRevisionRecord) -> dict:
    """Convert a resume revision to a public API payload."""
    return {
        "id": str(record.id),
        "resumeId": str(record.resume_id),
        "revision": record.revision,
        "name": record.name,
        "templateId": record.template_id,
        "locale": record.locale,
        "source": record.source,
        "label": record.label,
        "createdAt": record.created_at.isoformat(),
    }


def serialize_draft(record: WorkspaceDraftRecord) -> dict:
    """Convert a workspace draft to its API representation."""
    return {
        "key": record.draft_key,
        "data": load_json(record.data_json, {}),
        "createdAt": record.created_at.isoformat(),
        "updatedAt": record.updated_at.isoformat(),
    }


def upsert_workspace_draft(
    session: Session,
    *,
    draft_key: str,
    data: dict,
) -> WorkspaceDraftRecord:
    """Create or replace a cross-page UI draft in the backend."""
    now = datetime.now()
    record = session.exec(
        select(WorkspaceDraftRecord).where(
            WorkspaceDraftRecord.draft_key == draft_key
        )
    ).first()
    if record:
        record.data_json = dump_json(data)
        record.updated_at = now
    else:
        record = WorkspaceDraftRecord(
            draft_key=draft_key,
            data_json=dump_json(data),
            created_at=now,
            updated_at=now,
        )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


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
