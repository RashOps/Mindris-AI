"""Human-gated resume agent tools and proposal history."""

from datetime import datetime
from typing import Annotated

from database.records import ResumeAgentProposalRecord
from database.session import Session, get_session
from fastapi import APIRouter, Depends, HTTPException
from persistence_lib.json import dump_json, load_json
from pydantic import BaseModel, ConfigDict
from resume_agent_tools import (
    TOOL_SPECS,
    ToolInvocationRequest,
    invoke_agent_tool,
    list_agent_tools,
)
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/resume-agents", tags=["resume-agents"])
SessionDep = Annotated[Session, Depends(get_session)]
ALL_TOOL_PERMISSIONS = {spec.permission for spec in TOOL_SPECS}


class RejectProposalRequest(BaseModel):
    """Explicit human rejection, kept in the audit history."""

    model_config = ConfigDict(extra="forbid")

    reason: str = "user_rejected"


@router.get("/tools")
def get_agent_tools() -> dict:
    """Discover the only backend tools available to resume agents."""
    return {"status": "success", "items": list_agent_tools()}


@router.post("/tools/{tool_name}")
async def invoke_tool(
    tool_name: str,
    request: ToolInvocationRequest,
    session: SessionDep,
) -> dict:
    """Invoke one schema-validated tool under API user permissions."""
    try:
        return await invoke_agent_tool(
            session,
            tool_name=tool_name,
            request=request,
            granted_permissions=ALL_TOOL_PERMISSIONS,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail={"message_id": str(exc)},
        ) from exc
    except KeyError as exc:
        raise HTTPException(
            status_code=404,
            detail={"message_id": str(exc).strip("'")},
        ) from exc
    except ValueError as exc:
        message_id = str(exc)
        status_code = 409 if "revision" in message_id else 422
        raise HTTPException(
            status_code=status_code,
            detail={"message_id": message_id},
        ) from exc


@router.get("/resumes/{resume_id}/proposals")
def list_resume_proposals(resume_id: int, session: SessionDep) -> dict:
    """List auditable proposals and their human-validation state."""
    records = session.exec(
        select(ResumeAgentProposalRecord)
        .where(ResumeAgentProposalRecord.resume_id == resume_id)
        .order_by(ResumeAgentProposalRecord.created_at.desc())
    ).all()
    return {
        "status": "success",
        "items": [
            {
                "id": record.id,
                "resume_id": record.resume_id,
                "source_revision": record.source_revision,
                "created_revision": record.created_revision,
                "agent": record.agent,
                "provider": record.provider,
                "model_name": record.model_name,
                "proposal": load_json(record.proposal_json, {}),
                "evidence": load_json(record.evidence_json, []),
                "manifest_before": load_json(record.manifest_before_json, {}),
                "manifest_after": load_json(record.manifest_after_json, {}),
                "privacy_policy": load_json(record.privacy_policy_json, {}),
                "validation": load_json(record.validation_json, {}),
                "status": record.status,
                "created_at": record.created_at.isoformat(),
                "validated_at": (
                    record.validated_at.isoformat()
                    if record.validated_at
                    else None
                ),
            }
            for record in records
        ],
    }


@router.post("/proposals/{proposal_id}/reject")
def reject_resume_proposal(
    proposal_id: int,
    request: RejectProposalRequest,
    session: SessionDep,
) -> dict:
    """Reject a pending proposal without changing the resume."""
    record = session.get(ResumeAgentProposalRecord, proposal_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"message_id": "agent.proposal_not_found"},
        )
    if record.status != "pending":
        raise HTTPException(
            status_code=409,
            detail={"message_id": "agent.proposal_not_pending"},
        )
    record.status = "rejected"
    record.validated_at = datetime.now()
    record.validation_json = dump_json(
        {"human_approved": False, "reason": request.reason}
    )
    session.add(record)
    session.commit()
    return {
        "status": "success",
        "message_id": "agent.proposal.rejected",
        "item": {"id": record.id, "status": record.status},
    }
