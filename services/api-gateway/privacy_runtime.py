"""API-owned persistence adapters for the outbound privacy gateway."""

from __future__ import annotations

import json
from datetime import datetime

from database.records import ExternalActivityRecord, ExternalConsentRecord
from database.session import Session, SessionLocal
from intelligence.privacy import (
    PRIVACY_POLICY_VERSION,
    ConsentStatus,
    OutboundManifest,
    OutboundPrivacyGateway,
    PrivacyMode,
    PrivacyTask,
)
from sqlalchemy import select
from utils.runtime_config import load_runtime_configuration


def resolve_consent(
    provider: str,
    task: PrivacyTask,
    mode: PrivacyMode,
) -> ConsentStatus:
    """Resolve the latest consent without exposing persistence to agents."""
    with SessionLocal() as session:
        record = session.exec(
            select(ExternalConsentRecord)
            .where(ExternalConsentRecord.provider == provider)
            .where(ExternalConsentRecord.task_key == task.value)
            .where(ExternalConsentRecord.privacy_mode == mode.value)
            .where(ExternalConsentRecord.policy_version == PRIVACY_POLICY_VERSION)
            .order_by(ExternalConsentRecord.id.desc())
        ).first()
    if record is None:
        return ConsentStatus.REQUIRED
    return ConsentStatus(record.status)


def persist_outbound_manifest(manifest: OutboundManifest, status: str) -> None:
    """Store content-free outbound metadata in a short local transaction."""
    if manifest.provider == "ollama":
        return
    with SessionLocal() as session:
        session.add(
            ExternalActivityRecord(
                provider=manifest.provider,
                model_name=manifest.model,
                task_key=manifest.task.value,
                privacy_mode=manifest.mode.value,
                policy_version=manifest.policy_version,
                classification_version=manifest.classification_version,
                categories_json=json.dumps(list(manifest.categories)),
                character_count=manifest.character_count,
                approximate_tokens=manifest.approximate_tokens,
                payload_hash=manifest.payload_hash,
                consent_status=manifest.consent_status.value,
                status=status,
            )
        )
        session.commit()


def create_outbound_privacy_gateway() -> OutboundPrivacyGateway:
    """Build the gateway from backend-owned runtime configuration."""
    mode = PrivacyMode(load_runtime_configuration()["privacy_mode"])
    return OutboundPrivacyGateway(
        mode=mode,
        consent_resolver=resolve_consent,
        audit_sink=persist_outbound_manifest,
    )


def set_consent(
    session: Session,
    *,
    provider: str,
    task: PrivacyTask,
    mode: PrivacyMode,
    granted: bool,
) -> ExternalConsentRecord:
    """Append a revocable consent decision for an exact policy scope."""
    now = datetime.now()
    record = ExternalConsentRecord(
        provider=provider,
        task_key=task.value,
        privacy_mode=mode.value,
        policy_version=PRIVACY_POLICY_VERSION,
        status=ConsentStatus.GRANTED.value if granted else ConsentStatus.REVOKED.value,
        granted_at=now,
        revoked_at=None if granted else now,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record
