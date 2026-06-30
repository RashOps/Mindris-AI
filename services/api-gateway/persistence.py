"""Persistence helpers shared by API routers."""

import json
from copy import deepcopy
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
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")
SUPPORTED_RESUME_LOCALES = ("fr", "en", "de", "es")


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
        logger.warning(
            "Invalid JSON payload encountered in persistence layer; using fallback"
        )
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


def _normalize_resume_locale(value: Any, fallback: str = "fr") -> str:
    locale = value if isinstance(value, str) else fallback
    return locale if locale in SUPPORTED_RESUME_LOCALES else fallback


def _strip_multilingual_block(cv_data: dict | None) -> dict[str, Any]:
    payload = deepcopy(cv_data) if isinstance(cv_data, dict) else {}
    payload.pop("multilingual", None)
    return payload


def _sync_variant_locale(cv_data: dict[str, Any], locale: str) -> dict[str, Any]:
    payload = deepcopy(cv_data)
    global_settings = payload.setdefault("global_settings", {})
    if not isinstance(global_settings, dict):
        global_settings = {}
        payload["global_settings"] = global_settings
    locale_settings = global_settings.setdefault("locale", {})
    if not isinstance(locale_settings, dict):
        locale_settings = {}
        global_settings["locale"] = locale_settings
    locale_settings["label_language"] = locale
    return payload


def _active_resume_payload(
    cv_data: dict[str, Any],
    fallback_locale: str = "fr",
) -> tuple[dict[str, Any], bool]:
    fallback = _normalize_resume_locale(fallback_locale, "fr")
    root_payload = _strip_multilingual_block(cv_data)
    multilingual = cv_data.get("multilingual") if isinstance(cv_data, dict) else None

    variants: dict[str, dict[str, Any]] = {}
    changed = False

    if isinstance(multilingual, dict):
        raw_variants = multilingual.get("variants")
        if isinstance(raw_variants, dict):
            for locale_key, variant_payload in raw_variants.items():
                locale = _normalize_resume_locale(locale_key, fallback)
                if locale != locale_key:
                    changed = True
                variants[locale] = _sync_variant_locale(
                    _strip_multilingual_block(variant_payload),
                    locale,
                )

    if not variants:
        locale = _normalize_resume_locale(_locale_from_cv_data(root_payload, fallback))
        variants[locale] = _sync_variant_locale(root_payload, locale)
        changed = True

    default_locale = fallback
    if isinstance(multilingual, dict):
        default_locale = _normalize_resume_locale(
            multilingual.get("default_locale"),
            fallback,
        )
    if default_locale not in variants:
        default_locale = next(iter(variants))
        changed = True

    active_locale = default_locale
    if isinstance(multilingual, dict):
        active_locale = _normalize_resume_locale(
            multilingual.get("active_locale"),
            default_locale,
        )
    if active_locale not in variants:
        active_locale = default_locale
        changed = True

    active_payload = _sync_variant_locale(variants[active_locale], active_locale)
    variants = {
        locale: _sync_variant_locale(variant_payload, locale)
        for locale, variant_payload in variants.items()
    }

    normalized = deepcopy(active_payload)
    normalized["multilingual"] = {
        "default_locale": default_locale,
        "active_locale": active_locale,
        "variants": deepcopy(variants),
    }

    if normalized != cv_data:
        changed = True

    return normalized, changed


def _public_multilingual_metadata(cv_data: dict[str, Any]) -> dict[str, Any]:
    multilingual = cv_data.get("multilingual", {})
    variants = multilingual.get("variants", {})
    available_locales = list(variants.keys()) if isinstance(variants, dict) else []
    return {
        "defaultLocale": multilingual.get("default_locale", "fr"),
        "activeLocale": multilingual.get("active_locale", "fr"),
        "availableLocales": available_locales,
    }


def _compose_multilingual_resume(
    variants: dict[str, dict[str, Any]],
    *,
    default_locale: str,
    active_locale: str,
) -> dict[str, Any]:
    normalized_variants = {
        locale: _sync_variant_locale(variant_payload, locale)
        for locale, variant_payload in variants.items()
    }
    active_payload = deepcopy(normalized_variants[active_locale])
    active_payload["multilingual"] = {
        "default_locale": default_locale,
        "active_locale": active_locale,
        "variants": deepcopy(normalized_variants),
    }
    return active_payload


def _persist_lazy_resume_migration(session: Session, record: ResumeRecord) -> dict[str, Any]:
    normalized, changed = _active_resume_payload(
        load_json(record.data_json, {}),
        record.locale or "fr",
    )
    if changed:
        record.data_json = dump_json(normalized)
        record.locale = normalized["multilingual"]["default_locale"]
        session.add(record)
        session.commit()
        session.refresh(record)
    return normalized


def create_resume_locale_variant(
    session: Session,
    record: ResumeRecord,
    *,
    locale: str,
    source_locale: str | None = None,
) -> ResumeRecord:
    """Create a new locale variant from an existing variant."""
    normalized = _persist_lazy_resume_migration(session, record)
    multilingual = normalized["multilingual"]
    variants = deepcopy(multilingual["variants"])
    target_locale = _normalize_resume_locale(locale, record.locale or "fr")
    source = _normalize_resume_locale(
        source_locale or multilingual["active_locale"],
        multilingual["default_locale"],
    )
    if target_locale in variants:
        raise ValueError(f"Locale variant '{target_locale}' already exists.")
    if source not in variants:
        raise ValueError(f"Unknown source locale '{source}'.")

    variants[target_locale] = _sync_variant_locale(variants[source], target_locale)
    record.data_json = dump_json(
        _compose_multilingual_resume(
            variants,
            default_locale=multilingual["default_locale"],
            active_locale=target_locale,
        )
    )
    record.updated_at = datetime.now()
    session.add(record)
    session.commit()
    session.refresh(record)
    create_resume_revision(session, record, label=f"locale:{target_locale}:create")
    return record


def activate_resume_locale_variant(
    session: Session,
    record: ResumeRecord,
    *,
    locale: str,
) -> ResumeRecord:
    """Switch the active locale variant for a resume."""
    normalized = _persist_lazy_resume_migration(session, record)
    multilingual = normalized["multilingual"]
    variants = deepcopy(multilingual["variants"])
    target_locale = _normalize_resume_locale(locale, multilingual["default_locale"])
    if target_locale not in variants:
        raise ValueError(f"Unknown locale variant '{target_locale}'.")

    record.data_json = dump_json(
        _compose_multilingual_resume(
            variants,
            default_locale=multilingual["default_locale"],
            active_locale=target_locale,
        )
    )
    record.updated_at = datetime.now()
    session.add(record)
    session.commit()
    session.refresh(record)
    create_resume_revision(session, record, label=f"locale:{target_locale}:activate")
    return record


def delete_resume_locale_variant(
    session: Session,
    record: ResumeRecord,
    *,
    locale: str,
) -> ResumeRecord:
    """Delete a non-default locale variant from a resume."""
    normalized = _persist_lazy_resume_migration(session, record)
    multilingual = normalized["multilingual"]
    variants = deepcopy(multilingual["variants"])
    target_locale = _normalize_resume_locale(locale, multilingual["default_locale"])
    if target_locale not in variants:
        raise ValueError(f"Unknown locale variant '{target_locale}'.")
    if len(variants) == 1:
        raise ValueError("Cannot delete the last locale variant.")
    if target_locale == multilingual["default_locale"]:
        raise ValueError("Cannot delete the default locale variant.")

    del variants[target_locale]
    active_locale = multilingual["active_locale"]
    if active_locale == target_locale:
        active_locale = multilingual["default_locale"]

    record.data_json = dump_json(
        _compose_multilingual_resume(
            variants,
            default_locale=multilingual["default_locale"],
            active_locale=active_locale,
        )
    )
    record.updated_at = datetime.now()
    session.add(record)
    session.commit()
    session.refresh(record)
    create_resume_revision(session, record, label=f"locale:{target_locale}:delete")
    return record


def save_current_cv(
    session: Session, cv_data: dict, source: str = "json"
) -> CVDocumentRecord:
    """Upsert the current CV document."""
    logger.info("Saving current CV document (source=%s)", source)
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
    if not record:
        logger.debug("No current CV document found")
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
    stored = _persist_lazy_resume_migration(session, record)
    cv_data = _strip_multilingual_block(stored)
    return {
        "id": str(record.id),
        "name": record.name,
        "cvData": cv_data,
        "multilingual": _public_multilingual_metadata(stored),
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
    logger.info(
        "Creating persisted resume '%s' (template=%s, source=%s)",
        name,
        template_id,
        source,
    )
    now = datetime.now()
    normalized, _ = _active_resume_payload(cv_data, locale or "fr")
    locale = normalized["multilingual"]["default_locale"]
    record = ResumeRecord(
        name=name,
        data_json=dump_json(normalized),
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
    target_locale: str | None = None,
    template_id: str | None = None,
    locale: str | None = None,
    source: str | None = None,
) -> ResumeRecord:
    """Patch a persisted resume document."""
    logger.info("Updating persisted resume %s", record.id)
    if name is not None:
        record.name = name
    if cv_data is not None:
        existing = _persist_lazy_resume_migration(session, record)
        existing_multilingual = existing["multilingual"]
        target = _normalize_resume_locale(
            target_locale or existing_multilingual["active_locale"],
            existing_multilingual["default_locale"],
        )
        variants = deepcopy(existing_multilingual["variants"])
        if target_locale is not None and target not in variants:
            raise ValueError(f"Unknown locale variant '{target}'.")
        normalized, _ = _active_resume_payload(cv_data, target)
        variants[target] = _strip_multilingual_block(normalized)
        active_locale = target if target_locale is not None else existing_multilingual[
            "active_locale"
        ]
        default_locale = existing_multilingual["default_locale"]
        if target_locale is None and locale is not None and locale in variants:
            active_locale = locale
        composed = _compose_multilingual_resume(
            variants,
            default_locale=default_locale,
            active_locale=active_locale,
        )
        record.data_json = dump_json(composed)
        record.template_id = template_id or composed.get("global_settings", {}).get(
            "template_id",
            record.template_id,
        )
        locale = default_locale
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
    logger.info(
        "Creating revision %s for resume %s (label=%s)", next_revision, record.id, label
    )
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
    logger.debug("Listing revisions for resume %s", resume_id)
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
    logger.debug("Loading revision %s for resume %s", revision, resume_id)
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


def compare_resume_revisions(
    session: Session,
    resume_id: int,
    base_revision: int,
    target_revision: int,
) -> dict[str, Any]:
    """Return a semantic diff between two resume revisions."""
    base = get_resume_revision(session, resume_id, base_revision)
    target = get_resume_revision(session, resume_id, target_revision)
    if not base or not target:
        logger.warning(
            "Cannot compare revisions for resume %s (base=%s target=%s)",
            resume_id,
            base_revision,
            target_revision,
        )
        return {}
    logger.info(
        "Comparing revisions for resume %s (base=%s target=%s)",
        resume_id,
        base_revision,
        target_revision,
    )

    base_data = load_json(base.data_json, {})
    target_data = load_json(target.data_json, {})
    changes: list[dict[str, Any]] = []
    _diff_revision_metadata(base, target, changes)
    _diff_values("", base_data, target_data, changes)
    section_summaries = _section_diff_summary(base_data, target_data)
    return {
        "resumeId": str(resume_id),
        "baseRevision": serialize_resume_revision(base),
        "targetRevision": serialize_resume_revision(target),
        "changeCount": len(changes),
        "sectionSummaries": section_summaries,
        "changes": changes,
    }


def _diff_revision_metadata(
    base: ResumeRevisionRecord,
    target: ResumeRevisionRecord,
    changes: list[dict[str, Any]],
) -> None:
    pairs = [
        ("name", base.name, target.name),
        ("templateId", base.template_id, target.template_id),
        ("locale", base.locale, target.locale),
        ("source", base.source, target.source),
        ("label", base.label, target.label),
    ]
    for path, before, after in pairs:
        if before == after:
            continue
        kind = "changed"
        if before in (None, "") and after not in (None, ""):
            kind = "added"
        elif before not in (None, "") and after in (None, ""):
            kind = "removed"
        changes.append(
            {
                "path": path,
                "kind": kind,
                "before": before,
                "after": after,
            }
        )


def _diff_values(
    path: str, before: Any, after: Any, changes: list[dict[str, Any]]
) -> None:
    if before == after:
        return
    if isinstance(before, dict) and isinstance(after, dict):
        keys = sorted(set(before) | set(after))
        for key in keys:
            nested_path = f"{path}.{key}" if path else key
            if key not in before:
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "added",
                        "before": None,
                        "after": after[key],
                    }
                )
                continue
            if key not in after:
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "removed",
                        "before": before[key],
                        "after": None,
                    }
                )
                continue
            _diff_values(nested_path, before[key], after[key], changes)
        return

    if isinstance(before, list) and isinstance(after, list):
        if all(isinstance(item, dict) and item.get("id") for item in before + after):
            before_map = {
                str(item["id"]): item
                for item in before
                if isinstance(item, dict) and item.get("id")
            }
            after_map = {
                str(item["id"]): item
                for item in after
                if isinstance(item, dict) and item.get("id")
            }
            keys = sorted(set(before_map) | set(after_map))
            for key in keys:
                nested_path = f"{path}[{key}]" if path else f"[{key}]"
                if key not in before_map:
                    changes.append(
                        {
                            "path": nested_path,
                            "kind": "added",
                            "before": None,
                            "after": after_map[key],
                        }
                    )
                    continue
                if key not in after_map:
                    changes.append(
                        {
                            "path": nested_path,
                            "kind": "removed",
                            "before": before_map[key],
                            "after": None,
                        }
                    )
                    continue
                _diff_values(nested_path, before_map[key], after_map[key], changes)
            return

        max_length = max(len(before), len(after))
        for index in range(max_length):
            nested_path = f"{path}[{index}]"
            if index >= len(before):
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "added",
                        "before": None,
                        "after": after[index],
                    }
                )
                continue
            if index >= len(after):
                changes.append(
                    {
                        "path": nested_path,
                        "kind": "removed",
                        "before": before[index],
                        "after": None,
                    }
                )
                continue
            _diff_values(nested_path, before[index], after[index], changes)
        return

    changes.append(
        {"path": path or "root", "kind": "changed", "before": before, "after": after}
    )


def _section_diff_summary(
    before: dict[str, Any], after: dict[str, Any]
) -> list[dict[str, Any]]:
    sections = [
        ("profile", "Profile"),
        ("experience", "Experience"),
        ("projects", "Projects"),
        ("certifications", "Certifications"),
        ("volunteering", "Volunteering"),
        ("publications", "Publications"),
        ("references", "References"),
        ("custom_sections", "Custom sections"),
        ("skills", "Skills"),
        ("education", "Education"),
        ("languages", "Languages"),
        ("hobbies", "Interests"),
    ]
    summaries: list[dict[str, Any]] = []
    for key, label in sections:
        before_value = before.get(key)
        after_value = after.get(key)
        before_count = _section_count(before_value)
        after_count = _section_count(after_value)
        status = "unchanged"
        if before_value != after_value:
            if before_count == 0 and after_count > 0:
                status = "added"
            elif before_count > 0 and after_count == 0:
                status = "removed"
            else:
                status = "changed"
        summaries.append(
            {
                "section": key,
                "label": label,
                "status": status,
                "beforeCount": before_count,
                "afterCount": after_count,
            }
        )
    return summaries


def _section_count(value: Any) -> int:
    if isinstance(value, list):
        return len(value)
    if isinstance(value, dict):
        return len(value)
    if isinstance(value, str):
        return 1 if value.strip() else 0
    return 0


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
        select(WorkspaceDraftRecord).where(WorkspaceDraftRecord.draft_key == draft_key)
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
