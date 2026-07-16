"""Persistence helpers for backend-owned LLM execution traces."""

import hashlib
import json
from typing import Any

from database.records import LLMRunRecord
from database.session import Session


def stable_input_hash(value: Any) -> str:
    """Return a stable hash for a JSON-like LLM input payload."""
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def save_llm_run(
    session: Session,
    *,
    task_key: str,
    provider: str,
    model_name: str,
    status: str = "success",
    prompt_version: str | None = None,
    input_payload: Any | None = None,
    input_hash: str | None = None,
    output_artifact_type: str | None = None,
    output_artifact_id: int | None = None,
    error_message: str | None = None,
    duration_ms: int | None = None,
    fallback_used: bool = False,
    metadata: dict[str, Any] | None = None,
) -> LLMRunRecord:
    """Persist one LLM execution trace without leaking raw prompt content."""
    record = LLMRunRecord(
        task_key=task_key,
        provider=provider,
        model_name=model_name,
        prompt_version=prompt_version,
        input_hash=input_hash
        or (stable_input_hash(input_payload) if input_payload is not None else None),
        output_artifact_type=output_artifact_type,
        output_artifact_id=output_artifact_id,
        status=status,
        error_message=error_message,
        duration_ms=duration_ms,
        fallback_used=1 if fallback_used else 0,
        metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record
