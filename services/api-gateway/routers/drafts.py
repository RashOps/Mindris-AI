"""Workspace draft routes."""

from typing import Annotated

from database.records import WorkspaceDraftRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence import serialize_draft, upsert_workspace_draft
from schemas import DraftUpsertRequest
from sqlalchemy import select
from utils.logger import get_logger

router = APIRouter(prefix="/api/v1/drafts", tags=["drafts"])
SessionDep = Annotated[Session, Depends(get_session)]
logger = get_logger(__name__, service_name="api-gateway")


def _get_draft(session: Session, draft_key: str) -> WorkspaceDraftRecord:
    record = session.exec(
        select(WorkspaceDraftRecord).where(
            WorkspaceDraftRecord.draft_key == draft_key
        )
    )
    record = record.first()
    if not record:
        raise HTTPException(status_code=404, detail="Draft not found.")
    return record


@router.put("/{draft_key}")
async def put_draft(
    draft_key: str,
    request: DraftUpsertRequest,
    session: SessionDep,
) -> dict:
    """Create or replace a backend-owned cross-page draft."""
    logger.info("Upserting draft '%s'", draft_key)
    record = upsert_workspace_draft(
        session,
        draft_key=draft_key,
        data=request.data,
    )
    return {"status": "success", "item": serialize_draft(record)}


@router.get("/{draft_key}")
async def get_draft(draft_key: str, session: SessionDep) -> dict:
    """Return a backend-owned cross-page draft."""
    return {
        "status": "success",
        "item": serialize_draft(_get_draft(session, draft_key)),
    }


@router.delete("/{draft_key}")
async def delete_draft(draft_key: str, session: SessionDep) -> dict:
    """Delete a backend-owned cross-page draft."""
    logger.info("Deleting draft '%s'", draft_key)
    record = _get_draft(session, draft_key)
    session.delete(record)
    session.commit()
    return {"status": "success", "message": "Draft deleted."}
