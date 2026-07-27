"""Single backend construction path for resume-aware agent snapshots."""

from __future__ import annotations

from typing import Any

from database.records import ResumeRecord, ScrapedJobRecord
from database.session import Session
from fastapi import HTTPException
from intelligence.resume_context import (
    ResumeContextSnapshot,
    build_resume_context_snapshot,
)
from persistence_domain.resumes import (
    _latest_resume_revision,
    get_resume_revision,
    resolve_resume_variant,
)
from persistence_lib.json import load_json
from routers.templates import _catalog_template_item, resolve_resume_render_state


def _job_context(record: ScrapedJobRecord | None) -> dict[str, Any] | None:
    if record is None:
        return None
    return {
        "id": record.id,
        "title": record.title,
        "company": record.company,
        "source_url": record.url,
        "hard_skills": load_json(record.hard_skills, []),
        "soft_skills": load_json(record.soft_skills, []),
        "description": record.description_markdown,
    }


def _normalize_job_context(value: dict[str, Any] | None) -> dict[str, Any] | None:
    if not value:
        return None
    return {
        **value,
        "id": value.get("id") or value.get("job_id"),
        "title": value.get("title") or value.get("job_title") or "",
        "company": value.get("company") or "",
        "source_url": value.get("source_url") or value.get("url"),
        "description": (
            value.get("description")
            or value.get("description_markdown")
            or ""
        ),
    }


def build_persisted_resume_snapshot(
    session: Session,
    *,
    resume_id: int,
    revision: int | None = None,
    locale: str | None = None,
    job_id: int | None = None,
    render_manifest: dict[str, Any] | None = None,
) -> ResumeContextSnapshot:
    """Build the canonical snapshot from a persisted revision and optional job."""
    resume = session.get(ResumeRecord, resume_id)
    if resume is None:
        raise HTTPException(
            status_code=404,
            detail={"message_id": "agent.resume_not_found"},
        )
    source_revision = revision or _latest_resume_revision(session, resume_id)
    revision_record = get_resume_revision(session, resume_id, source_revision)
    if revision_record is None:
        raise HTTPException(
            status_code=404,
            detail={"message_id": "agent.resume_revision_not_found"},
        )
    revision_view = ResumeRecord(
        id=resume.id,
        name=revision_record.name,
        data_json=revision_record.data_json,
        template_id=revision_record.template_id,
        locale=revision_record.locale,
        source=revision_record.source,
        created_at=resume.created_at,
        updated_at=resume.updated_at,
    )
    cv_data, resolved_locale = resolve_resume_variant(
        revision_view,
        locale=locale or revision_record.locale,
    )
    render_state = resolve_resume_render_state(
        cv_data,
        revision_record.template_id,
        session=session,
        locale=resolved_locale,
    )
    template = _catalog_template_item(revision_record.template_id)
    settings = render_state["cv_data"].get("global_settings", {})
    job = session.get(ScrapedJobRecord, job_id) if job_id is not None else None
    return build_resume_context_snapshot(
        resume_id=resume_id,
        revision=source_revision,
        cv_data=render_state["cv_data"],
        locale=resolved_locale,
        template_id=render_state["template_id"],
        normalized_settings=settings if isinstance(settings, dict) else {},
        template_capabilities=template.capabilities if template else {},
        render_manifest=render_manifest,
        job_context=_job_context(job),
    )


def build_request_resume_snapshot(
    session: Session,
    *,
    cv_data: dict[str, Any],
    resume_id: int | None,
    revision: int | None,
    locale: str | None,
    template_id: str | None,
    job_id: int | None,
    job_context: dict[str, Any] | None,
) -> ResumeContextSnapshot:
    """Canonicalize legacy request payloads and persisted resumes identically."""
    if (
        resume_id is not None
        and session.get(ResumeRecord, resume_id) is not None
        and _latest_resume_revision(session, resume_id) > 0
    ):
        snapshot = build_persisted_resume_snapshot(
            session,
            resume_id=resume_id,
            revision=revision,
            locale=locale,
            job_id=job_id,
        )
        if snapshot.job_context is not None or not job_context:
            return snapshot
        replacement = build_resume_context_snapshot(
            cv_data=snapshot.semantic_content,
            revision=snapshot.revision,
            resume_id=snapshot.resume_id,
            locale=snapshot.locale,
            template_id=snapshot.template.id,
            normalized_settings=snapshot.normalized_settings,
            template_capabilities=snapshot.template.capabilities,
            render_manifest=snapshot.render_manifest,
            job_context=_normalize_job_context(job_context),
        )
        return snapshot.model_copy(
            update={"job_context": replacement.job_context},
            deep=True,
        )
    requested_template = template_id
    if requested_template is None:
        settings_payload = cv_data.get("global_settings", {})
        requested_template = (
            settings_payload.get("template_id")
            if isinstance(settings_payload, dict)
            else None
        )
    requested_template = str(requested_template or "modern")
    render_state = resolve_resume_render_state(
        cv_data,
        requested_template,
        session=session,
        locale=locale,
    )
    template = _catalog_template_item(requested_template)
    normalized = render_state["cv_data"]
    return build_resume_context_snapshot(
        cv_data=normalized,
        revision=revision or 0,
        resume_id=resume_id,
        locale=locale or "fr",
        template_id=render_state["template_id"],
        normalized_settings=normalized.get("global_settings", {}),
        template_capabilities=template.capabilities if template else {},
        job_context=_normalize_job_context(job_context),
    )
