"""Provider-neutral metrics for Scope B resume-agent evaluations."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ResumeAgentEvaluationOutcome(BaseModel):
    """Measured outcome for one fixed evaluation case."""

    model_config = ConfigDict(extra="forbid")

    factual_claims: int = Field(ge=0)
    factual_errors: int = Field(ge=0)
    required_evidence: int = Field(ge=0)
    cited_evidence: int = Field(ge=0)
    patch_valid: bool
    ats_score_before: int | None = Field(default=None, ge=0, le=100)
    ats_score_after: int | None = Field(default=None, ge=0, le=100)
    meaning_preservation: float = Field(ge=0, le=1)
    visual_regression: bool
    renderer_iterations: int = Field(ge=0, le=3)


class ResumeAgentEvaluationMetrics(BaseModel):
    """Aggregate quality gates requested by the Scope B contract."""

    model_config = ConfigDict(extra="forbid")

    factual_accuracy: float
    evidence_coverage: float
    valid_patch_rate: float
    average_ats_improvement: float | None
    meaning_preservation: float
    visual_regression_rate: float
    average_renderer_iterations: float


def aggregate_resume_agent_metrics(
    outcomes: list[ResumeAgentEvaluationOutcome],
) -> ResumeAgentEvaluationMetrics:
    """Aggregate deterministic metrics without provider-specific scoring."""
    if not outcomes:
        raise ValueError("At least one evaluation outcome is required.")
    claims = sum(outcome.factual_claims for outcome in outcomes)
    errors = sum(outcome.factual_errors for outcome in outcomes)
    required_evidence = sum(outcome.required_evidence for outcome in outcomes)
    cited_evidence = sum(outcome.cited_evidence for outcome in outcomes)
    improvements = [
        outcome.ats_score_after - outcome.ats_score_before
        for outcome in outcomes
        if outcome.ats_score_before is not None
        and outcome.ats_score_after is not None
    ]
    count = len(outcomes)
    return ResumeAgentEvaluationMetrics(
        factual_accuracy=(claims - errors) / claims if claims else 1,
        evidence_coverage=(
            cited_evidence / required_evidence if required_evidence else 1
        ),
        valid_patch_rate=sum(outcome.patch_valid for outcome in outcomes) / count,
        average_ats_improvement=(
            sum(improvements) / len(improvements) if improvements else None
        ),
        meaning_preservation=(
            sum(outcome.meaning_preservation for outcome in outcomes) / count
        ),
        visual_regression_rate=(
            sum(outcome.visual_regression for outcome in outcomes) / count
        ),
        average_renderer_iterations=(
            sum(outcome.renderer_iterations for outcome in outcomes) / count
        ),
    )

