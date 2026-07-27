"""Permissioned backend tool registry for resume-aware agents."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import Any, Literal

import httpx
from database.records import (
    AgentToolAuditRecord,
    ResumeAgentProposalRecord,
    ResumeRecord,
)
from database.session import Session
from intelligence.resume_context import AgentTask, ResumeContextSnapshot
from intelligence.resume_patches import (
    ResumePatchProposal,
    ResumeRevisionConflictError,
    apply_resume_patch,
    validate_resume_patch,
)
from persistence_domain.resume_diff import diff_values
from persistence_domain.resumes import (
    _latest_resume_revision,
    compare_resume_revisions,
    serialize_resume,
    update_resume,
)
from persistence_lib.json import dump_json, load_json
from pydantic import BaseModel, ConfigDict, Field
from resume_agent_runtime import build_persisted_resume_snapshot
from utils.config import settings

MAX_TOOL_INPUT_BYTES = 256 * 1024
MAX_TOOL_OUTPUT_BYTES = 2 * 1024 * 1024
DEFAULT_TOOL_TIMEOUT_SECONDS = 30.0
SECRET_KEYS = frozenset(
    {"api_key", "apikey", "authorization", "token", "secret", "password"}
)


class ToolArguments(BaseModel):
    """Base arguments accepted by every registered tool."""

    model_config = ConfigDict(extra="forbid")


class SnapshotArguments(ToolArguments):
    """Load one immutable persisted snapshot."""

    resume_id: int
    revision: int | None = None
    locale: str | None = None
    job_id: int | None = None
    task: AgentTask = AgentTask.STRATEGY
    external_provider: str | None = None


class ResumeSectionArguments(SnapshotArguments):
    """Read one semantic section from a snapshot."""

    section: str = Field(min_length=1, max_length=80)


class JobContextArguments(SnapshotArguments):
    """Read only the job context attached to a snapshot."""


class SearchEvidenceArguments(SnapshotArguments):
    """Search bounded, addressable facts."""

    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)


class ProposalArguments(SnapshotArguments):
    """Persist a typed proposal without applying it."""

    proposal: ResumePatchProposal
    agent: str = Field(default="resume_strategist", max_length=80)
    provider: str = Field(default="", max_length=80)
    model_name: str = Field(default="", max_length=160)


class ValidatePatchArguments(SnapshotArguments):
    """Validate a typed proposal against the current revision."""

    proposal: ResumePatchProposal


class PreviewPatchArguments(ValidatePatchArguments):
    """Render selected proposal operations without persistence."""

    proposal_id: int | None = None
    accepted_operation_ids: set[str] | None = None


class InspectRenderArguments(SnapshotArguments):
    """Inspect the persisted source revision through the renderer."""


class CompareRevisionArguments(ToolArguments):
    """Compare two persisted resume revisions."""

    resume_id: int
    base_revision: int = Field(ge=1)
    target_revision: int = Field(ge=1)
    locale: str | None = None


class CommitRevisionArguments(ToolArguments):
    """Apply a persisted proposal after explicit human approval."""

    resume_id: int
    proposal_id: int
    base_revision: int = Field(ge=1)
    accepted_operation_ids: set[str] | None = None
    human_approved: Literal[True]


class ToolInvocationRequest(BaseModel):
    """HTTP-neutral invocation envelope."""

    model_config = ConfigDict(extra="forbid")

    arguments: dict[str, Any] = Field(default_factory=dict)
    actor: str = Field(default="user", max_length=80)


class ToolDefinition(BaseModel):
    """Public contract exposed to orchestrators and clients."""

    model_config = ConfigDict(extra="forbid")

    name: str
    description: str
    permission: str
    timeout_seconds: float
    input_schema: dict[str, Any]


class ToolSpec:
    """Internal executable tool definition."""

    def __init__(
        self,
        *,
        name: str,
        description: str,
        permission: str,
        arguments_model: type[ToolArguments],
        handler: Callable[[Session, ToolArguments], Awaitable[dict[str, Any]]],
        timeout_seconds: float = DEFAULT_TOOL_TIMEOUT_SECONDS,
    ) -> None:
        self.name = name
        self.description = description
        self.permission = permission
        self.arguments_model = arguments_model
        self.handler = handler
        self.timeout_seconds = timeout_seconds

    def public_definition(self) -> ToolDefinition:
        """Return a secret-free Pydantic schema for discovery."""
        return ToolDefinition(
            name=self.name,
            description=self.description,
            permission=self.permission,
            timeout_seconds=self.timeout_seconds,
            input_schema=self.arguments_model.model_json_schema(),
        )


def _masked(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: ("[REDACTED]" if key.lower() in SECRET_KEYS else _masked(item))
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_masked(item) for item in value]
    return value


def _json_size(value: Any) -> int:
    return len(json.dumps(value, ensure_ascii=False, default=str).encode())


def _snapshot(
    arguments: SnapshotArguments,
    session: Session,
) -> ResumeContextSnapshot:
    snapshot = build_persisted_resume_snapshot(
        session,
        resume_id=arguments.resume_id,
        revision=arguments.revision,
        locale=arguments.locale,
        job_id=arguments.job_id,
    )
    return snapshot.for_task(
        arguments.task,
        external_provider=arguments.external_provider,
    )


async def _get_snapshot(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = SnapshotArguments.model_validate(raw)
    return {"item": _snapshot(arguments, session).model_dump(mode="json")}


async def _get_section(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = ResumeSectionArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    if arguments.section not in snapshot.semantic_content:
        raise KeyError("agent.resume_section_not_found")
    return {
        "item": {
            "resume_id": snapshot.resume_id,
            "revision": snapshot.revision,
            "section": arguments.section,
            "content": snapshot.semantic_content[arguments.section],
        }
    }


async def _get_job_context(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = JobContextArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    return {
        "item": (
            snapshot.job_context.model_dump(mode="json")
            if snapshot.job_context
            else None
        ),
        "revision": snapshot.revision,
    }


async def _search_evidence(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = SearchEvidenceArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    terms = {term.casefold() for term in arguments.query.split() if term.strip()}
    matches = [
        fact
        for fact in snapshot.evidence_registry
        if terms
        and any(
            term in f"{fact.path} {fact.value}".casefold()
            for term in terms
        )
    ][: arguments.limit]
    return {
        "items": [fact.model_dump(mode="json") for fact in matches],
        "revision": snapshot.revision,
    }


def save_agent_proposal(
    session: Session,
    arguments: ProposalArguments,
) -> ResumeAgentProposalRecord:
    """Validate and persist a reviewable proposal without applying it."""
    snapshot = _snapshot(arguments, session)
    validation = validate_resume_patch(
        snapshot,
        arguments.proposal,
        current_revision=_latest_resume_revision(session, arguments.resume_id),
    )
    evidence_ids = set(arguments.proposal.evidence_ids)
    for operation in arguments.proposal.operations:
        evidence_ids.update(operation.evidence_ids)
    evidence = [
        fact.model_dump(mode="json")
        for fact in snapshot.evidence_registry
        if fact.id in evidence_ids
    ]
    record = ResumeAgentProposalRecord(
        resume_id=arguments.resume_id,
        source_revision=snapshot.revision,
        agent=arguments.agent,
        provider=arguments.provider,
        model_name=arguments.model_name,
        proposal_json=arguments.proposal.model_dump_json(),
        evidence_json=dump_json(evidence),
        manifest_before_json=dump_json(snapshot.render_manifest or {}),
        privacy_policy_json=snapshot.privacy_policy.model_dump_json(),
        validation_json=validation.model_dump_json(),
        status="pending" if validation.valid else "invalid",
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


async def _propose_patch(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = ProposalArguments.model_validate(raw)
    record = save_agent_proposal(session, arguments)
    return {
        "item": {
            "id": record.id,
            "resume_id": record.resume_id,
            "source_revision": record.source_revision,
            "status": record.status,
            "validation": load_json(record.validation_json, {}),
        }
    }


async def _validate_patch(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = ValidatePatchArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    result = validate_resume_patch(
        snapshot,
        arguments.proposal,
        current_revision=_latest_resume_revision(session, arguments.resume_id),
    )
    return {
        "item": result.model_dump(mode="json"),
        "revision": snapshot.revision,
    }


async def _renderer_manifest(
    snapshot: ResumeContextSnapshot,
    cv_data: dict[str, Any],
    *,
    return_html: bool = False,
) -> dict[str, Any]:
    endpoint = "/render/pdf" if return_html else "/render/manifest"
    payload = {
        "cv_data": cv_data,
        "template_id": snapshot.template.id,
        "resume_id": snapshot.resume_id,
        "resume_revision": snapshot.revision,
        "content_hash": snapshot.content_hash,
    }
    if return_html:
        payload.update({"return_html": True, "return_manifest": True})
    async with httpx.AsyncClient(timeout=DEFAULT_TOOL_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{settings.renderer_url.rstrip('/')}{endpoint}",
            json=payload,
        )
        response.raise_for_status()
        return response.json()


async def _preview_patch(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = PreviewPatchArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    patched = apply_resume_patch(
        snapshot,
        arguments.proposal,
        accepted_operation_ids=arguments.accepted_operation_ids,
        current_revision=_latest_resume_revision(session, arguments.resume_id),
    )
    rendered_before = await _renderer_manifest(
        snapshot,
        snapshot.semantic_content,
    )
    rendered = await _renderer_manifest(snapshot, patched, return_html=True)
    manifest_before = rendered_before.get("item", rendered_before)
    manifest_after = rendered.get("item", {}).get("manifest", {})
    if arguments.proposal_id is not None:
        record = session.get(ResumeAgentProposalRecord, arguments.proposal_id)
        if record is not None and record.resume_id == arguments.resume_id:
            record.manifest_before_json = dump_json(manifest_before)
            record.manifest_after_json = dump_json(manifest_after)
            session.add(record)
            session.commit()
    changes: list[dict[str, Any]] = []
    diff_values("", snapshot.semantic_content, patched, changes)
    return {
        "item": {
            "source_revision": snapshot.revision,
            "cv_data": patched,
            "diff": changes,
            "html": rendered.get("item", {}).get("html", ""),
            "manifest_before": manifest_before,
            "manifest": manifest_after,
        }
    }


async def _inspect_render(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = InspectRenderArguments.model_validate(raw)
    snapshot = _snapshot(arguments, session)
    rendered = await _renderer_manifest(
        snapshot,
        snapshot.semantic_content,
    )
    return {
        "item": rendered.get("item", rendered),
        "revision": snapshot.revision,
    }


async def _compare_revisions(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = CompareRevisionArguments.model_validate(raw)
    return {
        "item": compare_resume_revisions(
            session,
            arguments.resume_id,
            arguments.base_revision,
            arguments.target_revision,
            arguments.locale,
        )
    }


async def _commit_revision(session: Session, raw: ToolArguments) -> dict[str, Any]:
    arguments = CommitRevisionArguments.model_validate(raw)
    record = session.get(ResumeAgentProposalRecord, arguments.proposal_id)
    if record is None or record.resume_id != arguments.resume_id:
        raise KeyError("agent.proposal_not_found")
    if record.status != "pending":
        raise ValueError("agent.proposal_not_pending")
    current_revision = _latest_resume_revision(session, arguments.resume_id)
    if (
        record.source_revision != arguments.base_revision
        or current_revision != arguments.base_revision
    ):
        raise ResumeRevisionConflictError("agent.patch.revision_conflict")
    proposal = ResumePatchProposal.model_validate_json(record.proposal_json)
    known_operation_ids = {
        operation.operation_id for operation in proposal.operations
    }
    if (
        arguments.accepted_operation_ids is not None
        and arguments.accepted_operation_ids - known_operation_ids
    ):
        raise ValueError("agent.patch.invalid_operation_selection")
    snapshot = build_persisted_resume_snapshot(
        session,
        resume_id=arguments.resume_id,
        revision=arguments.base_revision,
    )
    patched = apply_resume_patch(
        snapshot,
        proposal,
        accepted_operation_ids=arguments.accepted_operation_ids,
        current_revision=current_revision,
    )
    resume = session.get(ResumeRecord, arguments.resume_id)
    if resume is None:
        raise KeyError("agent.resume_not_found")
    updated = update_resume(
        session,
        resume,
        cv_data=patched,
        target_locale=snapshot.locale,
        template_id=patched.get("global_settings", {}).get(
            "template_id",
            resume.template_id,
        ),
        source="agent_approved",
    )
    created_revision = _latest_resume_revision(session, arguments.resume_id)
    record.created_revision = created_revision
    record.status = "accepted"
    record.validated_at = datetime.now()
    record.validation_json = dump_json(
        {
            "human_approved": True,
            "accepted_operation_ids": sorted(
                known_operation_ids
                if arguments.accepted_operation_ids is None
                else arguments.accepted_operation_ids
            ),
        }
    )
    session.add(record)
    session.commit()
    return {
        "item": serialize_resume(session, updated),
        "proposal_id": record.id,
        "source_revision": arguments.base_revision,
        "created_revision": created_revision,
    }


TOOL_SPECS = (
    ToolSpec(
        name="get_resume_snapshot",
        description="Read one immutable, task-filtered resume snapshot.",
        permission="resume:read",
        arguments_model=SnapshotArguments,
        handler=_get_snapshot,
    ),
    ToolSpec(
        name="get_resume_section",
        description="Read one known semantic resume section.",
        permission="resume:read",
        arguments_model=ResumeSectionArguments,
        handler=_get_section,
    ),
    ToolSpec(
        name="get_job_context",
        description="Read the persisted job context linked to a run.",
        permission="job:read",
        arguments_model=JobContextArguments,
        handler=_get_job_context,
    ),
    ToolSpec(
        name="search_resume_evidence",
        description="Search addressable source facts without direct storage access.",
        permission="resume:read",
        arguments_model=SearchEvidenceArguments,
        handler=_search_evidence,
    ),
    ToolSpec(
        name="propose_resume_patch",
        description="Persist a bounded typed proposal without applying it.",
        permission="resume:propose",
        arguments_model=ProposalArguments,
        handler=_propose_patch,
    ),
    ToolSpec(
        name="validate_resume_patch",
        description="Validate evidence, references and source revision.",
        permission="resume:propose",
        arguments_model=ValidatePatchArguments,
        handler=_validate_patch,
    ),
    ToolSpec(
        name="render_resume_preview",
        description="Render a temporary patch and semantic diff.",
        permission="resume:preview",
        arguments_model=PreviewPatchArguments,
        handler=_preview_patch,
    ),
    ToolSpec(
        name="inspect_resume_render",
        description="Inspect pages, sections and renderer warnings.",
        permission="resume:preview",
        arguments_model=InspectRenderArguments,
        handler=_inspect_render,
    ),
    ToolSpec(
        name="compare_resume_revisions",
        description="Compare two persisted resume revisions.",
        permission="resume:read",
        arguments_model=CompareRevisionArguments,
        handler=_compare_revisions,
    ),
    ToolSpec(
        name="commit_resume_revision",
        description="Commit an explicitly human-approved proposal.",
        permission="resume:commit",
        arguments_model=CommitRevisionArguments,
        handler=_commit_revision,
    ),
)
TOOL_REGISTRY = {spec.name: spec for spec in TOOL_SPECS}


def list_agent_tools() -> list[dict[str, Any]]:
    """Return every allowed tool and no implementation details."""
    return [
        spec.public_definition().model_dump(mode="json")
        for spec in TOOL_SPECS
    ]


async def invoke_agent_tool(
    session: Session,
    *,
    tool_name: str,
    request: ToolInvocationRequest,
    granted_permissions: set[str],
) -> dict[str, Any]:
    """Validate, authorize, bound, execute, mask and audit one invocation."""
    spec = TOOL_REGISTRY.get(tool_name)
    masked_input = _masked(request.arguments)
    input_size = _json_size(masked_input)
    status = "success"
    message_id = "agent.tool.completed"
    output: dict[str, Any] = {}
    try:
        if spec is None:
            raise KeyError("agent.tool.unknown")
        if spec.permission not in granted_permissions:
            raise PermissionError("agent.tool.permission_denied")
        if input_size > MAX_TOOL_INPUT_BYTES:
            raise ValueError("agent.tool.input_too_large")
        arguments = spec.arguments_model.model_validate(request.arguments)
        output = await asyncio.wait_for(
            spec.handler(session, arguments),
            timeout=spec.timeout_seconds,
        )
        output = _masked(output)
        if _json_size(output) > MAX_TOOL_OUTPUT_BYTES:
            raise ValueError("agent.tool.output_too_large")
        return {
            "status": "success",
            "message_id": message_id,
            **output,
        }
    except Exception:
        status = "error"
        message_id = "agent.tool.failed"
        raise
    finally:
        audit = AgentToolAuditRecord(
            tool_name=tool_name,
            resume_id=(
                request.arguments.get("resume_id")
                if isinstance(request.arguments.get("resume_id"), int)
                else None
            ),
            actor=request.actor,
            status=status,
            input_size=input_size,
            output_size=_json_size(output),
            message_id=message_id,
            metadata_json=dump_json(
                {"permission": spec.permission if spec is not None else None}
            ),
        )
        session.add(audit)
        session.commit()
