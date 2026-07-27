"""Opportunity tracker persistence helpers."""

from datetime import datetime
from typing import Any

from database.records import (
    ApplicationRecord,
    AtsReportRecord,
    CoverLetterRecord,
    OpportunityRecord,
    OpportunityTransitionRecord,
    ResumeRecord,
    ScrapedJobRecord,
)
from database.session import Session
from persistence_lib.json import dump_json, load_json
from sqlalchemy import select
from utils.logger import get_logger

from .artifacts import serialize_ats, serialize_cover_letter, serialize_job
from .opportunity_repairs import apply_opportunity_repair
from .resumes import (
    _latest_resume_revision,
    _persist_lazy_resume_migration,
    resolve_resume_variant,
)

logger = get_logger(__name__, service_name="api-gateway")


def list_opportunity_transitions(
    session: Session,
    opportunity_id: int,
) -> list[OpportunityTransitionRecord]:
    """Return workflow transitions in chronological order."""
    return session.exec(
        select(OpportunityTransitionRecord)
        .where(OpportunityTransitionRecord.opportunity_id == opportunity_id)
        .order_by(
            OpportunityTransitionRecord.created_at.asc(),
            OpportunityTransitionRecord.id.asc(),
        )
    ).all()


def serialize_opportunity_transition(record: OpportunityTransitionRecord) -> dict:
    """Convert an opportunity transition to JSON-safe output."""
    return {
        "id": record.id,
        "state": record.state,
        "action": record.action,
        "metadata": load_json(record.metadata_json, {}),
        "created_at": record.created_at.isoformat(),
    }


def _opportunity_next_actions(record: OpportunityRecord) -> list[str]:
    actions: list[str] = []
    if record.resume_id is None:
        actions.append("link_resume")
    if record.ats_report_id is None:
        actions.append("link_ats_report")
    if record.cover_letter_id is None:
        actions.append("link_cover_letter")
    if record.application_id is None:
        actions.append("create_or_attach_tracker_entry")
    if (
        record.resume_id is not None
        and record.ats_report_id is not None
        and record.cover_letter_id is not None
        and record.application_id is not None
        and record.current_state != "ready_to_apply"
    ):
        actions.append("mark_ready_to_apply")
    return actions


def _opportunity_integrity(
    session: Session,
    record: OpportunityRecord,
) -> dict[str, Any]:
    """Return backend-owned integrity health for one workflow opportunity."""
    issues: list[dict[str, Any]] = []
    repair_actions: list[str] = []

    job = session.get(ScrapedJobRecord, record.job_id) if record.job_id else None
    if record.job_id and job is None:
        issues.append(
            {
                "code": "missing_job_link",
                "severity": "warning",
                "artifact": "job",
                "message": "The linked job no longer exists.",
                "metadata": {"job_id": record.job_id},
            }
        )
        repair_actions.append("detach_missing_job")

    resume = session.get(ResumeRecord, record.resume_id) if record.resume_id else None
    if record.resume_id and resume is None:
        issues.append(
            {
                "code": "missing_resume_link",
                "severity": "error",
                "artifact": "resume",
                "message": "The linked resume no longer exists.",
                "metadata": {"resume_id": record.resume_id},
            }
        )
        repair_actions.append("detach_missing_resume")
    elif resume is not None:
        normalized = _persist_lazy_resume_migration(session, resume)
        variants = normalized.get("multilingual", {}).get("variants", {})
        if record.resume_locale and record.resume_locale not in variants:
            issues.append(
                {
                    "code": "invalid_resume_locale",
                    "severity": "warning",
                    "artifact": "resume_locale",
                    "message": "The linked resume locale is no longer available.",
                    "metadata": {
                        "resume_id": resume.id,
                        "resume_locale": record.resume_locale,
                        "available_locales": list(variants.keys())
                        if isinstance(variants, dict)
                        else [],
                    },
                }
            )
            repair_actions.append("reset_resume_locale")

    ats_report = (
        session.get(AtsReportRecord, record.ats_report_id)
        if record.ats_report_id
        else None
    )
    if record.ats_report_id and ats_report is None:
        issues.append(
            {
                "code": "missing_ats_report_link",
                "severity": "error",
                "artifact": "ats_report",
                "message": "The linked ATS report no longer exists.",
                "metadata": {"ats_report_id": record.ats_report_id},
            }
        )
        repair_actions.append("detach_missing_ats_report")
    elif (
        ats_report is not None
        and record.job_id is not None
        and ats_report.job_id is not None
        and ats_report.job_id != record.job_id
    ):
        issues.append(
            {
                "code": "mismatched_ats_report_job",
                "severity": "warning",
                "artifact": "ats_report",
                "message": "The linked ATS report belongs to another job.",
                "metadata": {
                    "ats_report_id": ats_report.id,
                    "opportunity_job_id": record.job_id,
                    "ats_job_id": ats_report.job_id,
                },
            }
        )
        repair_actions.append("relink_ats_report")
    elif ats_report is not None and resume is not None:
        ats_context = load_json(ats_report.context_json, {})
        ats_resume_id = ats_context.get("resume_id")
        ats_resume_locale = ats_context.get("resume_locale")
        ats_resume_revision = ats_context.get("resume_revision")
        current_revision = _latest_resume_revision(session, resume.id)
        if ats_resume_id is not None and ats_resume_id != resume.id:
            issues.append(
                {
                    "code": "mismatched_ats_resume",
                    "severity": "warning",
                    "artifact": "ats_report",
                    "message": "The linked ATS report evaluates another resume.",
                    "metadata": {
                        "ats_report_id": ats_report.id,
                        "opportunity_resume_id": resume.id,
                        "ats_resume_id": ats_resume_id,
                    },
                }
            )
            repair_actions.append("relink_ats_report")
        elif (
            ats_resume_locale is not None
            and record.resume_locale is not None
            and ats_resume_locale != record.resume_locale
        ):
            issues.append(
                {
                    "code": "mismatched_ats_resume_locale",
                    "severity": "warning",
                    "artifact": "ats_report",
                    "message": "The linked ATS report evaluates another resume locale.",
                    "metadata": {
                        "ats_report_id": ats_report.id,
                        "opportunity_resume_locale": record.resume_locale,
                        "ats_resume_locale": ats_resume_locale,
                    },
                }
            )
            repair_actions.append("relink_ats_report")
        elif (
            isinstance(ats_resume_revision, int)
            and ats_resume_revision < current_revision
        ):
            issues.append(
                {
                    "code": "stale_ats_resume_revision",
                    "severity": "warning",
                    "artifact": "ats_report",
                    "message": (
                        "The linked ATS report evaluates an older resume revision."
                    ),
                    "metadata": {
                        "ats_report_id": ats_report.id,
                        "resume_id": resume.id,
                        "ats_resume_revision": ats_resume_revision,
                        "current_resume_revision": current_revision,
                    },
                }
            )
            repair_actions.append("relink_ats_report")

    cover_letter = (
        session.get(CoverLetterRecord, record.cover_letter_id)
        if record.cover_letter_id
        else None
    )
    if record.cover_letter_id and cover_letter is None:
        issues.append(
            {
                "code": "missing_cover_letter_link",
                "severity": "error",
                "artifact": "cover_letter",
                "message": "The linked cover letter no longer exists.",
                "metadata": {"cover_letter_id": record.cover_letter_id},
            }
        )
        repair_actions.append("detach_missing_cover_letter")
    elif (
        cover_letter is not None
        and record.job_id is not None
        and cover_letter.job_id is not None
        and cover_letter.job_id != record.job_id
    ):
        issues.append(
            {
                "code": "mismatched_cover_letter_job",
                "severity": "warning",
                "artifact": "cover_letter",
                "message": "The linked cover letter belongs to another job.",
                "metadata": {
                    "cover_letter_id": cover_letter.id,
                    "opportunity_job_id": record.job_id,
                    "cover_letter_job_id": cover_letter.job_id,
                },
            }
        )
        repair_actions.append("relink_cover_letter")

    application = (
        session.get(ApplicationRecord, record.application_id)
        if record.application_id
        else None
    )
    if record.application_id and application is None:
        issues.append(
            {
                "code": "missing_application_link",
                "severity": "error",
                "artifact": "application",
                "message": "The linked tracker entry no longer exists.",
                "metadata": {"application_id": record.application_id},
            }
        )
        repair_actions.append("detach_missing_application")
    elif application is not None:
        if (
            record.job_id is not None
            and application.job_id is not None
            and application.job_id != record.job_id
        ):
            issues.append(
                {
                    "code": "mismatched_application_job",
                    "severity": "warning",
                    "artifact": "application",
                    "message": "The linked tracker entry belongs to another job.",
                    "metadata": {
                        "application_id": application.id,
                        "opportunity_job_id": record.job_id,
                        "application_job_id": application.job_id,
                    },
                }
            )
            repair_actions.append("relink_application")
        if (
            record.ats_report_id is not None
            and application.ats_report_id is not None
            and application.ats_report_id != record.ats_report_id
        ):
            issues.append(
                {
                    "code": "application_ats_mismatch",
                    "severity": "warning",
                    "artifact": "application",
                    "message": "The tracker entry references another ATS report.",
                    "metadata": {
                        "application_id": application.id,
                        "opportunity_ats_report_id": record.ats_report_id,
                        "application_ats_report_id": application.ats_report_id,
                    },
                }
            )
            repair_actions.append("sync_application_links")
        if (
            record.cover_letter_id is not None
            and application.cover_letter_id is not None
            and application.cover_letter_id != record.cover_letter_id
        ):
            issues.append(
                {
                    "code": "application_cover_letter_mismatch",
                    "severity": "warning",
                    "artifact": "application",
                    "message": "The tracker entry references another cover letter.",
                    "metadata": {
                        "application_id": application.id,
                        "opportunity_cover_letter_id": record.cover_letter_id,
                        "application_cover_letter_id": application.cover_letter_id,
                    },
                }
            )
            repair_actions.append("sync_application_links")

    return {
        "status": "degraded" if issues else "healthy",
        "issues": issues,
        "repair_actions": list(dict.fromkeys(repair_actions)),
    }


def serialize_opportunity(session: Session, record: OpportunityRecord) -> dict:
    """Convert an opportunity workflow aggregate to JSON-safe output."""
    transitions = [
        serialize_opportunity_transition(row)
        for row in list_opportunity_transitions(session, record.id or 0)
    ]
    linked_artifacts: dict[str, Any] = {}
    if record.job_id:
        job = session.get(ScrapedJobRecord, record.job_id)
        if job:
            linked_artifacts["job"] = serialize_job(job)
    if record.resume_id:
        resume = session.get(ResumeRecord, record.resume_id)
        if resume:
            linked_artifacts["resume"] = {
                "id": resume.id,
                "name": resume.name,
                "template_id": resume.template_id,
                "locale": record.resume_locale or resume.locale,
                "revision": _latest_resume_revision(session, resume.id),
                "updated_at": resume.updated_at.isoformat(),
            }
    if record.ats_report_id:
        ats = session.get(AtsReportRecord, record.ats_report_id)
        if ats:
            linked_artifacts["ats_report"] = serialize_ats(ats)
    if record.cover_letter_id:
        letter = session.get(CoverLetterRecord, record.cover_letter_id)
        if letter:
            linked_artifacts["cover_letter"] = serialize_cover_letter(letter)
    if record.application_id:
        application = session.get(ApplicationRecord, record.application_id)
        if application:
            linked_artifacts["application"] = {
                "id": application.id,
                "status": application.status,
                "company": application.company,
                "role": application.role,
                "url": application.url,
                "updated_at": application.updated_at.isoformat(),
            }
    return {
        "id": record.id,
        "job_id": record.job_id,
        "source_url": record.source_url,
        "company": record.company,
        "role": record.role,
        "current_state": record.current_state,
        "resume_id": record.resume_id,
        "resume_locale": record.resume_locale,
        "ats_report_id": record.ats_report_id,
        "cover_letter_id": record.cover_letter_id,
        "application_id": record.application_id,
        "notes": record.notes,
        "metadata": load_json(record.metadata_json, {}),
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
        "last_transition_at": record.last_transition_at.isoformat(),
        "transitions": transitions,
        "linked_artifacts": linked_artifacts,
        "next_actions": _opportunity_next_actions(record),
        "integrity": _opportunity_integrity(session, record),
    }


def append_opportunity_transition(
    session: Session,
    record: OpportunityRecord,
    *,
    state: str,
    action: str,
    metadata: dict[str, Any] | None = None,
) -> OpportunityTransitionRecord:
    """Append a workflow transition and update the current state."""
    now = datetime.now()
    record.current_state = state
    record.updated_at = now
    record.last_transition_at = now
    session.add(record)
    transition = OpportunityTransitionRecord(
        opportunity_id=record.id or 0,
        state=state,
        action=action,
        metadata_json=dump_json(metadata or {}),
        created_at=now,
    )
    session.add(transition)
    session.commit()
    session.refresh(record)
    session.refresh(transition)
    return transition


def _recompute_opportunity_state(record: OpportunityRecord) -> str:
    """Return the most advanced valid workflow state for current links."""
    if (
        record.resume_id is not None
        and record.ats_report_id is not None
        and record.cover_letter_id is not None
        and record.application_id is not None
    ):
        return "ready_to_apply"
    if record.application_id is not None:
        return "tracker_entry_created"
    if record.cover_letter_id is not None:
        return "cover_letter_linked"
    if record.ats_report_id is not None:
        return "ats_report_linked"
    if record.resume_id is not None:
        return "resume_linked"
    if record.job_id is not None:
        return "scrape_completed"
    return "opportunity_created"


def create_opportunity(
    session: Session,
    *,
    company: str,
    role: str,
    job_id: int | None = None,
    source_url: str | None = None,
    notes: str = "",
    metadata: dict[str, Any] | None = None,
) -> OpportunityRecord:
    """Create an opportunity workflow anchor."""
    now = datetime.now()
    record = OpportunityRecord(
        job_id=job_id,
        source_url=source_url,
        company=company,
        role=role,
        notes=notes,
        metadata_json=dump_json(metadata or {}),
        created_at=now,
        updated_at=now,
        last_transition_at=now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    if job_id is not None:
        append_opportunity_transition(
            session,
            record,
            state="scrape_completed",
            action="seed_from_job",
            metadata={"job_id": job_id},
        )
    append_opportunity_transition(
        session,
        record,
        state="opportunity_created",
        action="create_opportunity",
        metadata={"job_id": job_id, "source_url": source_url},
    )
    return record


def link_opportunity_resume(
    session: Session,
    record: OpportunityRecord,
    *,
    resume: ResumeRecord,
    locale: str | None = None,
) -> OpportunityRecord:
    """Link a resume variant to an opportunity."""
    _, target_locale = resolve_resume_variant(resume, locale=locale)
    replaced = record.resume_id is not None and record.resume_id != resume.id
    record.resume_id = resume.id
    record.resume_locale = target_locale
    append_opportunity_transition(
        session,
        record,
        state="resume_linked",
        action="link_resume",
        metadata={
            "resume_id": resume.id,
            "resume_locale": target_locale,
            "replaced": replaced,
        },
    )
    return record


def link_opportunity_ats_report(
    session: Session,
    record: OpportunityRecord,
    *,
    ats_report: AtsReportRecord,
) -> OpportunityRecord:
    """Link an ATS report to an opportunity."""
    replaced = (
        record.ats_report_id is not None and record.ats_report_id != ats_report.id
    )
    record.ats_report_id = ats_report.id
    append_opportunity_transition(
        session,
        record,
        state="ats_report_linked",
        action="link_ats_report",
        metadata={
            "ats_report_id": ats_report.id,
            "job_id": ats_report.job_id,
            "replaced": replaced,
        },
    )
    return record


def link_opportunity_cover_letter(
    session: Session,
    record: OpportunityRecord,
    *,
    cover_letter: CoverLetterRecord,
) -> OpportunityRecord:
    """Link a cover letter to an opportunity."""
    replaced = (
        record.cover_letter_id is not None and record.cover_letter_id != cover_letter.id
    )
    record.cover_letter_id = cover_letter.id
    append_opportunity_transition(
        session,
        record,
        state="cover_letter_linked",
        action="link_cover_letter",
        metadata={
            "cover_letter_id": cover_letter.id,
            "job_id": cover_letter.job_id,
            "replaced": replaced,
        },
    )
    return record


def create_or_attach_opportunity_application(
    session: Session,
    record: OpportunityRecord,
    *,
    application: ApplicationRecord | None = None,
    create: bool = False,
    status: str = "wishlist",
    notes: str = "",
) -> tuple[OpportunityRecord, ApplicationRecord]:
    """Create or attach a tracker application for an opportunity."""
    if application is None and not create:
        raise ValueError("Provide application or set create=True.")

    if application is None:
        position = len(
            session.exec(
                select(ApplicationRecord).where(ApplicationRecord.status == status)
            ).all()
        )
        application = ApplicationRecord(
            job_id=record.job_id,
            status=status,
            position=position,
            company=record.company,
            role=record.role,
            url=record.source_url,
            notes=notes or record.notes,
            ats_report_id=record.ats_report_id,
            cover_letter_id=record.cover_letter_id,
        )
        session.add(application)
        session.commit()
        session.refresh(application)
    else:
        application.job_id = application.job_id or record.job_id
        application.ats_report_id = record.ats_report_id or application.ats_report_id
        application.cover_letter_id = (
            record.cover_letter_id or application.cover_letter_id
        )
        if notes:
            application.notes = notes
        application.updated_at = datetime.now()
        session.add(application)
        session.commit()
        session.refresh(application)

    replaced = (
        record.application_id is not None and record.application_id != application.id
    )
    record.application_id = application.id
    append_opportunity_transition(
        session,
        record,
        state="tracker_entry_created",
        action="attach_tracker_entry" if not create else "create_tracker_entry",
        metadata={
            "application_id": application.id,
            "status": application.status,
            "replaced": replaced,
        },
    )
    return record, application


def mark_opportunity_ready_to_apply(
    session: Session,
    record: OpportunityRecord,
) -> OpportunityRecord:
    """Mark an opportunity as ready once required artifacts are linked."""
    missing: list[str] = []
    if record.resume_id is None:
        missing.append("resume")
    if record.ats_report_id is None:
        missing.append("ats_report")
    if record.cover_letter_id is None:
        missing.append("cover_letter")
    if record.application_id is None:
        missing.append("application")
    if missing:
        raise ValueError(
            f"Opportunity is missing required artifacts: {', '.join(missing)}."
        )
    integrity = _opportunity_integrity(session, record)
    if integrity["status"] != "healthy":
        codes = ", ".join(issue["code"] for issue in integrity["issues"])
        raise ValueError(f"Opportunity has degraded artifact integrity: {codes}.")
    append_opportunity_transition(
        session,
        record,
        state="ready_to_apply",
        action="mark_ready_to_apply",
        metadata={"application_id": record.application_id},
    )
    return record


def repair_opportunity_integrity(
    session: Session,
    record: OpportunityRecord,
    *,
    action: str,
) -> OpportunityRecord:
    """Execute one bounded repair action for a degraded workflow opportunity."""
    return apply_opportunity_repair(
        session,
        record,
        action=action,
        integrity_resolver=_opportunity_integrity,
        state_resolver=_recompute_opportunity_state,
        transition_appender=append_opportunity_transition,
    )
