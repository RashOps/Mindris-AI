"""Resume and revision persistence helpers."""

from copy import copy, deepcopy
from datetime import datetime
from typing import Any

from database.records import (
    CVDocumentRecord,
    ResumeRecord,
    ResumeRevisionRecord,
)
from database.session import Session
from persistence_domain.resume_diff import (
    diff_revision_metadata,
    diff_values,
    section_diff_summary,
)
from persistence_lib.json import dump_json, load_json
from sqlalchemy import select
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")

SUPPORTED_RESUME_LOCALES = ("fr", "en", "de", "es")


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


def _persist_lazy_resume_migration(
    session: Session, record: ResumeRecord
) -> dict[str, Any]:
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


def resolve_resume_variant(
    record: ResumeRecord,
    *,
    locale: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Resolve one locale variant from a stored resume record."""
    normalized, _ = _active_resume_payload(
        load_json(record.data_json, {}),
        record.locale or "fr",
    )
    multilingual = normalized["multilingual"]
    variants = multilingual["variants"]
    target_locale = _normalize_resume_locale(
        locale or multilingual["active_locale"],
        multilingual["default_locale"],
    )
    if target_locale not in variants:
        raise ValueError(f"Unknown locale variant '{target_locale}'.")
    return deepcopy(variants[target_locale]), target_locale


def localized_resume_record(
    record: ResumeRecord,
    *,
    locale: str | None = None,
) -> ResumeRecord:
    """Return a lightweight localized record view for exports."""
    payload, target_locale = resolve_resume_variant(record, locale=locale)
    localized = copy(record)
    localized.data_json = dump_json(payload)
    localized.locale = target_locale
    return localized


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
        active_locale = (
            target
            if target_locale is not None
            else existing_multilingual["active_locale"]
        )
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
    _, active_locale = resolve_resume_variant(record)
    logger.info(
        "Creating revision %s for resume %s (label=%s)", next_revision, record.id, label
    )
    revision = ResumeRevisionRecord(
        resume_id=int(record.id or 0),
        revision=next_revision,
        name=record.name,
        data_json=record.data_json,
        template_id=record.template_id,
        locale=active_locale,
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
    locale: str | None = None,
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

    base_data, base_locale = resolve_resume_variant(base, locale=locale)
    target_data, target_locale = resolve_resume_variant(target, locale=locale)
    changes: list[dict[str, Any]] = []
    diff_revision_metadata(base, target, changes)
    diff_values("", base_data, target_data, changes)
    section_summaries = section_diff_summary(base_data, target_data)
    base_item = serialize_resume_revision(base)
    target_item = serialize_resume_revision(target)
    base_item["locale"] = base_locale
    target_item["locale"] = target_locale
    return {
        "resumeId": str(resume_id),
        "baseRevision": base_item,
        "targetRevision": target_item,
        "changeCount": len(changes),
        "sectionSummaries": section_summaries,
        "changes": changes,
    }
