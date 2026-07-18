"""Workspace draft persistence helpers."""

from datetime import datetime

from database.records import (
    WorkspaceDraftRecord,
)
from database.session import Session
from persistence_lib.json import dump_json, load_json
from sqlalchemy import select
from utils.logger import get_logger

logger = get_logger(__name__, service_name="api-gateway")


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
