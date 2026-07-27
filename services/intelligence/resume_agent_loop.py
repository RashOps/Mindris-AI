"""Bounded inspection-proposal-render loop with mandatory human handoff."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from time import monotonic
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from intelligence.composition_agent import propose_composition_patch
from intelligence.resume_context import ResumeContextSnapshot
from intelligence.resume_patches import (
    ResumePatchProposal,
    apply_resume_patch,
    validate_resume_patch,
)

RenderCallback = Callable[
    [dict[str, Any], ResumeContextSnapshot],
    Awaitable[dict[str, Any]],
]


class AgentRunLimits(BaseModel):
    """Hard limits preventing unbounded autonomous renderer loops."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    max_iterations: int = Field(default=2, ge=1, le=3)
    max_renderer_corrections: int = Field(default=1, ge=0, le=1)
    timeout_seconds: float = Field(default=45, gt=0, le=180)
    token_budget: int = Field(default=8000, ge=500, le=100_000)


class ResumeAgentRunResult(BaseModel):
    """Preview-only result presented for human validation."""

    model_config = ConfigDict(extra="forbid")

    source_revision: int
    proposal: ResumePatchProposal
    cv_data: dict[str, Any]
    manifest_before: dict[str, Any] | None = None
    manifest_after: dict[str, Any]
    iterations: int
    elapsed_ms: int
    renderer_correction_applied: bool
    requires_user_review: bool = True
    committed: bool = False


async def run_resume_patch_inspection(
    snapshot: ResumeContextSnapshot,
    proposal: ResumePatchProposal,
    *,
    render: RenderCallback,
    limits: AgentRunLimits | None = None,
) -> ResumeAgentRunResult:
    """Validate and preview at most one renderer-driven correction."""
    policy = limits or AgentRunLimits()
    started = monotonic()
    validation = validate_resume_patch(snapshot, proposal)
    if not validation.valid:
        raise ValueError("agent.patch.invalid")

    current_proposal = proposal
    cv_data = apply_resume_patch(snapshot, current_proposal)
    correction_applied = False
    iterations = 1
    async with asyncio.timeout(policy.timeout_seconds):
        rendered = await render(cv_data, snapshot)
        manifest = rendered.get("manifest", rendered)
        document = manifest.get("document", {})
        needs_correction = bool(document.get("overflow")) or int(
            document.get("pageCount") or 1
        ) > 2
        if (
            needs_correction
            and policy.max_renderer_corrections
            and policy.max_iterations > 1
        ):
            correction = propose_composition_patch(snapshot, manifest)
            if correction is not None:
                combined = ResumePatchProposal.model_validate(
                    {
                        **current_proposal.model_dump(mode="json"),
                        "operations": [
                            *current_proposal.operations,
                            *correction.operations,
                        ],
                        "reason": (
                            f"{current_proposal.reason}; {correction.reason}"
                        ),
                    }
                )
                validation = validate_resume_patch(snapshot, combined)
                if validation.valid:
                    current_proposal = combined
                    cv_data = apply_resume_patch(snapshot, current_proposal)
                    rendered = await render(cv_data, snapshot)
                    manifest = rendered.get("manifest", rendered)
                    correction_applied = True
                    iterations = 2

    return ResumeAgentRunResult(
        source_revision=snapshot.revision,
        proposal=current_proposal,
        cv_data=cv_data,
        manifest_before=snapshot.render_manifest,
        manifest_after=manifest,
        iterations=iterations,
        elapsed_ms=int((monotonic() - started) * 1000),
        renderer_correction_applied=correction_applied,
    )
