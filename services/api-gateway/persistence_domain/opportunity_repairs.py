"""Bounded repair operations for degraded workflow opportunities."""

from collections.abc import Callable
from datetime import datetime
from typing import Any

from database.records import (
    ApplicationRecord,
    AtsReportRecord,
    CoverLetterRecord,
    OpportunityRecord,
    ResumeRecord,
)
from database.session import Session

from .resumes import _normalize_resume_locale, _persist_lazy_resume_migration

IntegrityResolver = Callable[[Session, OpportunityRecord], dict[str, Any]]
StateResolver = Callable[[OpportunityRecord], str]
TransitionAppender = Callable[..., Any]


def apply_opportunity_repair(
    session: Session,
    record: OpportunityRecord,
    *,
    action: str,
    integrity_resolver: IntegrityResolver,
    state_resolver: StateResolver,
    transition_appender: TransitionAppender,
) -> OpportunityRecord:
    """Execute one bounded repair action using aggregate-owned callbacks."""
    normalized_action = action.strip()
    metadata: dict[str, Any] = {"action": normalized_action}

    if normalized_action == "detach_missing_application":
        if (
            record.application_id is None
            or session.get(ApplicationRecord, record.application_id) is not None
        ):
            raise ValueError(
                "Tracker entry is still present; detach repair not allowed."
            )
        metadata["previous_application_id"] = record.application_id
        record.application_id = None
    elif normalized_action == "detach_missing_resume":
        if (
            record.resume_id is None
            or session.get(ResumeRecord, record.resume_id) is not None
        ):
            raise ValueError("Resume is still present; detach repair not allowed.")
        metadata["previous_resume_id"] = record.resume_id
        metadata["previous_resume_locale"] = record.resume_locale
        record.resume_id = None
        record.resume_locale = None
    elif normalized_action == "detach_missing_ats_report":
        if (
            record.ats_report_id is None
            or session.get(AtsReportRecord, record.ats_report_id) is not None
        ):
            raise ValueError("ATS report is still present; detach repair not allowed.")
        metadata["previous_ats_report_id"] = record.ats_report_id
        record.ats_report_id = None
    elif normalized_action == "detach_missing_cover_letter":
        if (
            record.cover_letter_id is None
            or session.get(CoverLetterRecord, record.cover_letter_id) is not None
        ):
            raise ValueError(
                "Cover letter is still present; detach repair not allowed."
            )
        metadata["previous_cover_letter_id"] = record.cover_letter_id
        record.cover_letter_id = None
    elif normalized_action == "reset_resume_locale":
        if record.resume_id is None:
            raise ValueError("No linked resume to repair.")
        resume = session.get(ResumeRecord, record.resume_id)
        if resume is None:
            raise ValueError("Linked resume is missing; detach it instead.")
        normalized = _persist_lazy_resume_migration(session, resume)
        multilingual = normalized.get("multilingual", {})
        variants = multilingual.get("variants", {})
        if not isinstance(variants, dict) or not variants:
            raise ValueError("Linked resume has no valid locale variants.")
        if record.resume_locale in variants:
            raise ValueError("Resume locale is already valid.")
        previous_locale = record.resume_locale
        record.resume_locale = _normalize_resume_locale(
            multilingual.get("active_locale"),
            multilingual.get("default_locale", resume.locale or "fr"),
        )
        metadata["previous_resume_locale"] = previous_locale
        metadata["new_resume_locale"] = record.resume_locale
    elif normalized_action == "sync_application_links":
        if record.application_id is None:
            raise ValueError("No linked tracker entry to sync.")
        application = session.get(ApplicationRecord, record.application_id)
        if application is None:
            raise ValueError("Linked tracker entry is missing; detach it instead.")
        application.job_id = record.job_id or application.job_id
        application.ats_report_id = record.ats_report_id
        application.cover_letter_id = record.cover_letter_id
        application.updated_at = datetime.now()
        session.add(application)
        metadata["application_id"] = application.id
    elif normalized_action in {
        "relink_ats_report",
        "relink_cover_letter",
        "relink_application",
    }:
        artifact = {
            "relink_ats_report": "ats_report",
            "relink_cover_letter": "cover_letter",
            "relink_application": "application",
        }[normalized_action]
        integrity = integrity_resolver(session, record)
        if not any(issue["artifact"] == artifact for issue in integrity["issues"]):
            raise ValueError(f"The linked {artifact.replace('_', ' ')} is healthy.")
        attribute = {
            "ats_report": "ats_report_id",
            "cover_letter": "cover_letter_id",
            "application": "application_id",
        }[artifact]
        metadata[f"previous_{attribute}"] = getattr(record, attribute)
        setattr(record, attribute, None)
    else:
        raise ValueError(f"Unsupported repair action '{normalized_action}'.")

    transition_appender(
        session,
        record,
        state=state_resolver(record),
        action=f"repair:{normalized_action}",
        metadata=metadata,
    )
    return record

