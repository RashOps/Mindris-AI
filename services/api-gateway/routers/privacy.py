"""Privacy modes, provider transparency, consent and activity routes."""

from __future__ import annotations

import json
from typing import Annotated, Any, Literal

from auth import verify_api_key
from database.records import ExternalActivityRecord, ExternalConsentRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException, Query, status
from intelligence.privacy import (
    TASK_PRIVACY_POLICIES,
    ConsentStatus,
    OutboundPrivacyGateway,
    PrivacyMode,
    PrivacyTask,
    classification_registry_payload,
)
from intelligence.provider_privacy import provider_privacy_catalogue
from privacy_runtime import set_consent
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from utils.runtime_config import load_runtime_configuration

router = APIRouter(
    prefix="/api/v1/privacy",
    tags=["privacy"],
    dependencies=[Depends(verify_api_key)],
)
SessionDep = Annotated[Session, Depends(get_session)]


class PrivacyPreviewRequest(BaseModel):
    """Bounded request for the pre-flight transparency screen."""

    provider: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=200)
    task: PrivacyTask
    payload: dict[str, Any]
    mode: PrivacyMode | None = None


class ConsentRequest(BaseModel):
    """Explicit grant or revocation for one provider/task/mode tuple."""

    provider: str = Field(min_length=1, max_length=80)
    task: PrivacyTask
    mode: Literal["private_cloud", "full_context_cloud"]
    granted: bool
    acknowledge_full_context: bool = False


def _activity_payload(record: ExternalActivityRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "provider": record.provider,
        "model": record.model_name,
        "task": record.task_key,
        "privacy_mode": record.privacy_mode,
        "policy_version": record.policy_version,
        "classification_version": record.classification_version,
        "categories": json.loads(record.categories_json),
        "character_count": record.character_count,
        "approximate_tokens": record.approximate_tokens,
        "payload_hash": record.payload_hash,
        "consent_status": record.consent_status,
        "status": record.status,
        "created_at": record.created_at.isoformat(),
    }


@router.get("/contract")
def privacy_contract() -> dict[str, Any]:
    """Return the complete backend-owned privacy contract."""
    config = load_runtime_configuration()
    return {
        "status": "success",
        "item": {
            "mode": config["privacy_mode"],
            "telemetry_enabled": config["telemetry_enabled"],
            "classification": classification_registry_payload(),
            "policies": {
                task.value: {
                    "allowed_categories": sorted(
                        category.value for category in policy.allowed_categories
                    ),
                    "pseudonymized_categories": sorted(
                        category.value for category in policy.pseudonymized_categories
                    ),
                    "max_characters": policy.max_characters,
                    "requires_job_offer": policy.requires_job_offer,
                    "targeted_excerpt": policy.targeted_excerpt,
                }
                for task, policy in TASK_PRIVACY_POLICIES.items()
            },
            "providers": provider_privacy_catalogue(),
        },
    }


@router.post("/preview")
def preview_outbound_request(request: PrivacyPreviewRequest) -> dict[str, Any]:
    """Produce the safe content summary shown before first cloud use."""
    mode = request.mode or PrivacyMode(load_runtime_configuration()["privacy_mode"])
    gateway = OutboundPrivacyGateway(
        mode=mode,
        consent_resolver=lambda *_: ConsentStatus.GRANTED,
    )
    try:
        prepared = gateway.prepare(
            provider=request.provider,
            model=request.model,
            task=request.task,
            payload=request.payload,
        )
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        provider_meta = provider_privacy_catalogue().get(request.provider)
        manifest = prepared.manifest
        return {
            "status": "success",
            "item": {
                "manifest": {
                    **manifest.__dict__,
                    "task": manifest.task.value,
                    "mode": manifest.mode.value,
                    "consent_status": manifest.consent_status.value,
                },
                "examples": prepared.payload,
                "provider": provider_meta,
            },
        }
    finally:
        prepared.close()


@router.put("/consents")
def update_consent(request: ConsentRequest, session: SessionDep) -> dict[str, Any]:
    """Persist an explicit grant or revocation."""
    if (
        request.granted
        and request.mode == "full_context_cloud"
        and not request.acknowledge_full_context
    ):
        raise HTTPException(
            status_code=422,
            detail="privacy.consent.full_context_acknowledgement_required",
        )
    record = set_consent(
        session,
        provider=request.provider,
        task=request.task,
        mode=PrivacyMode(request.mode),
        granted=request.granted,
    )
    return {
        "status": "success",
        "item": {
            "id": record.id,
            "provider": record.provider,
            "task": record.task_key,
            "mode": record.privacy_mode,
            "policy_version": record.policy_version,
            "consent_status": record.status,
        },
    }


@router.get("/consents")
def list_consents(session: SessionDep) -> dict[str, Any]:
    """List only the latest decision for each exact consent scope."""
    records = session.exec(
        select(ExternalConsentRecord).order_by(ExternalConsentRecord.id.desc())
    ).all()
    latest: list[ExternalConsentRecord] = []
    scopes: set[tuple[str, str, str, str]] = set()
    for item in records:
        scope = (
            item.provider,
            item.task_key,
            item.privacy_mode,
            item.policy_version,
        )
        if scope not in scopes:
            scopes.add(scope)
            latest.append(item)
    return {
        "status": "success",
        "items": [
            {
                "id": item.id,
                "provider": item.provider,
                "task": item.task_key,
                "mode": item.privacy_mode,
                "policy_version": item.policy_version,
                "consent_status": item.status,
                "granted_at": item.granted_at.isoformat(),
                "revoked_at": (
                    item.revoked_at.isoformat() if item.revoked_at else None
                ),
            }
            for item in latest
        ],
    }


@router.get("/activity")
def list_external_activity(
    session: SessionDep,
    limit: int = Query(default=100, ge=1, le=500),
) -> dict[str, Any]:
    """Return the local content-free external activity ledger."""
    records = session.exec(
        select(ExternalActivityRecord)
        .order_by(ExternalActivityRecord.id.desc())
        .limit(limit)
    ).all()
    return {
        "status": "success",
        "items": [_activity_payload(record) for record in records],
    }


@router.get("/activity/export")
def export_external_activity(session: SessionDep) -> dict[str, Any]:
    """Export the complete safe ledger as JSON."""
    records = session.exec(
        select(ExternalActivityRecord).order_by(ExternalActivityRecord.id)
    ).all()
    return {
        "status": "success",
        "schema_version": "1",
        "items": [_activity_payload(record) for record in records],
    }


@router.delete("/activity", status_code=status.HTTP_204_NO_CONTENT)
def clear_external_activity(session: SessionDep) -> None:
    """Delete the activity ledger while preserving consent decisions."""
    session.execute(delete(ExternalActivityRecord))
    session.commit()
