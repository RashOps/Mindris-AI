"""ATS Scoring Agent.

Uses a CrewAI agent to evaluate a CV against a job description
and returns a detailed enterprise-grade ATS report using Pydantic output.
"""

from __future__ import annotations

import asyncio

from crewai import Agent, Crew, Process, Task
from pydantic import BaseModel, Field
from utils.logger import get_logger

from intelligence.llm_config import get_llm
from intelligence.resume_context import ResumeContextSnapshot

logger = get_logger(__name__, service_name="intelligence")

ATS_RUBRIC_VERSION = "ats-v1"
ATS_MODE_WEIGHTS = {
    "standard": {
        "keyword_match": 30,
        "experience_relevance": 25,
        "formatting_structure": 15,
        "quantification": 10,
        "title_alignment": 10,
        "overall_coherence": 10,
    },
    "strict": {
        "keyword_match": 35,
        "experience_relevance": 25,
        "formatting_structure": 15,
        "quantification": 10,
        "title_alignment": 10,
        "overall_coherence": 5,
    },
}


# ── Pydantic models ───────────────────────────────────────────────────────────


class KeywordStatus(BaseModel):
    """Analysis of a single keyword from the job requirements."""

    keyword: str = Field(description="The keyword being analyzed")
    found: bool = Field(
        description="Whether the keyword or a close semantic match was found in the CV"
    )
    density: str = Field(description="How many times it was mentioned, or 'Not found'")
    severity: str = Field(
        description=(
            "Impact if missing: 'high' (blocking), "
            "'medium' (important), or 'low' (bonus)"
        )
    )


class ScoringCriteria(BaseModel):
    """Transparent scoring criterion exposed to the candidate."""

    criterion: str = Field(description="Criterion name")
    weight: int = Field(description="Criterion weight in total score")
    score: int = Field(description="Points earned for this criterion")
    max_score: int = Field(description="Maximum available points")
    explanation: str = Field(description="Why this score was assigned")


class AtsRubricDimension(BaseModel):
    """Published ATS rubric dimension."""

    key: str = Field(description="Stable rubric key")
    label: str = Field(description="User-facing rubric label")
    weight: int = Field(description="Weight used in the total score")
    description: str = Field(description="What the dimension evaluates")


class AtsRubric(BaseModel):
    """Published rubric metadata used for ATS scoring."""

    version: str = Field(description="Rubric version")
    mode: str = Field(description="Evaluation mode applied to this report")
    dimensions: list[AtsRubricDimension] = Field(
        description="Weighted rubric dimensions applied to this report"
    )


class AtsDeduction(BaseModel):
    """Structured deduction that explains a score reduction."""

    code: str = Field(description="Stable deduction code")
    title: str = Field(description="Short deduction title")
    severity: str = Field(description="Severity: high, medium, or low")
    points_lost: int = Field(description="Points lost because of this deduction")
    evidence: str = Field(description="Evidence behind the deduction")
    recommendation: str = Field(description="Recommended corrective action")


class AtsReportContext(BaseModel):
    """Traceability metadata for one ATS evaluation."""

    job_title: str = Field(default="", description="Job title used for the scoring")
    job_company: str = Field(
        default="", description="Company name used for the scoring"
    )
    job_id: int | None = Field(default=None, description="Linked scraped job id")
    resume_id: int | None = Field(default=None, description="Linked resume id")
    resume_locale: str | None = Field(
        default=None, description="Active locale or variant used for scoring"
    )
    resume_revision: int = Field(default=0, description="Scored source revision")
    resume_content_hash: str = Field(default="", description="Scored content hash")
    evidence_ids: list[str] = Field(
        default_factory=list,
        description="Source facts available to the scorer",
    )
    provider: str = Field(default="", description="LLM provider used")
    model_name: str = Field(default="", description="LLM model used")


class AtsReport(BaseModel):
    """Detailed ATS evaluation report."""

    score: int = Field(description="Overall ATS match score between 0 and 100")
    mode: str = Field(description="Evaluation mode: standard or strict")
    summary: str = Field(
        description="A 2-3 sentence executive summary of the candidate's fit"
    )
    rubric: AtsRubric = Field(description="Published scoring rubric metadata")
    scoring_breakdown: list[ScoringCriteria] = Field(
        description="Transparent weighted scoring breakdown"
    )
    deductions: list[AtsDeduction] = Field(
        default_factory=list,
        description="Structured deductions that reduced the final score",
    )
    keyword_analysis: list[KeywordStatus] = Field(
        description="Detailed analysis of required hard and soft skills"
    )
    recommendations: list[str] = Field(
        description="Actionable steps the candidate can take to improve the CV"
    )
    context: AtsReportContext = Field(
        description="Traceability metadata for the ATS evaluation"
    )


# ── Helpers ───────────────────────────────────────────────────────────────────


def build_ats_rubric(mode: str) -> AtsRubric:
    """Return the published rubric metadata for one ATS mode."""
    weights = ATS_MODE_WEIGHTS.get(mode, ATS_MODE_WEIGHTS["standard"])
    labels = {
        "keyword_match": (
            "Keyword Match Rate",
            "Coverage of required hard and soft skills from the target job.",
        ),
        "experience_relevance": (
            "Experience Relevance",
            "How directly the candidate experience maps to the target role.",
        ),
        "formatting_structure": (
            "Formatting & Structure",
            "Clarity, semantic structure, and ATS readability of the resume.",
        ),
        "quantification": (
            "Quantification",
            "Presence of metrics, outcomes, and measurable impact in bullets.",
        ),
        "title_alignment": (
            "Title & Role Alignment",
            "How well the resume title and role framing match the job target.",
        ),
        "overall_coherence": (
            "Overall Coherence",
            "Consistency and clarity of the resume for the specific application.",
        ),
    }
    return AtsRubric(
        version=ATS_RUBRIC_VERSION,
        mode=mode,
        dimensions=[
            AtsRubricDimension(
                key=key,
                label=labels[key][0],
                weight=weight,
                description=labels[key][1],
            )
            for key, weight in weights.items()
        ],
    )


def build_fallback_ats_report(
    *,
    mode: str,
    provider: str,
    model_name: str,
    reason: str,
    context: dict | None = None,
) -> dict:
    """Return a transparent fallback ATS report when structured output fails."""
    context_payload = dict(context or {})
    context_payload.setdefault("provider", provider)
    context_payload.setdefault("model_name", model_name)
    return AtsReport(
        score=50,
        mode=mode,
        summary="Error generating detailed ATS report.",
        rubric=build_ats_rubric(mode),
        scoring_breakdown=[
            ScoringCriteria(
                criterion="Fallback Score",
                weight=100,
                score=50,
                max_score=100,
                explanation=(
                    "The LLM provider did not return a valid structured ATS report."
                ),
            )
        ],
        deductions=[
            AtsDeduction(
                code="llm_output_invalid",
                title="Structured ATS output unavailable",
                severity="high",
                points_lost=0,
                evidence=reason,
                recommendation="Retry the ATS analysis or switch provider/model.",
            )
        ],
        keyword_analysis=[],
        recommendations=["Retry later or switch to another ATS provider/model."],
        context=AtsReportContext.model_validate(context_payload),
    ).model_dump(mode="json")


# ── Public API ────────────────────────────────────────────────────────────────


async def calculate_ats_score(
    snapshot: ResumeContextSnapshot,
    provider: str,
    model_name: str,
    mode: str = "standard",
) -> dict:
    """Calculate the detailed ATS report for a CV against a job offer.

    Args:
        snapshot:     Canonical identity-free ATS context.
        provider:     LLM provider identifier.
        model_name:   Model name for the selected provider.
        mode:         ATS evaluation mode (`standard` or `strict`).

    Returns:
        Dictionary matching :class:`AtsReport` schema.
    """
    logger.info("🎯 Calculating ATS score via %s/%s (%s)", provider, model_name, mode)
    cv_text = snapshot.evidence_text()
    job = snapshot.job_context
    job_title = job.title if job else "Unknown"
    job_company = job.company if job else ""
    hard_skills = list(job.hard_skills) if job else []
    soft_skills = list(job.soft_skills) if job else []

    job_text = (
        f"Job Title: {job_title}\n"
        f"Required Hard Skills: {', '.join(hard_skills)}\n"
        f"Required Soft Skills: {', '.join(soft_skills)}"
    )

    rubric = build_ats_rubric(mode)
    rubric_lines = "\n".join(
        f"- {dimension.label}: {dimension.weight} ({dimension.description})"
        for dimension in rubric.dimensions
    )

    llm = get_llm(provider=provider, model_name=model_name)

    ats_scorer = Agent(
        role="Senior ATS & Recruitment Scanner",
        goal=(
            "Audit the candidate's CV against the job requirements "
            "and generate a detailed report."
        ),
        backstory=(
            "You are a severe Enterprise-Grade Applicant Tracking System (ATS). "
            "You perform deep keyword density analysis, evaluate skill relevance, "
            "and provide actionable insights for candidates."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    task = Task(
        description=(
            f"=== JOB REQUIREMENTS ===\n{job_text}\n\n"
            f"=== CANDIDATE CV ===\n{cv_text}\n\n"
            "Task: Perform a deep ATS audit of the candidate's CV "
            "against the job requirements.\n"
            f"Evaluation mode: {mode}.\n"
            "Published rubric:\n"
            f"{rubric_lines}\n"
            "1. Calculate an overall match score (0-100).\n"
            "2. Write a brief executive summary.\n"
            "3. Analyze EACH required hard and soft skill. Determine if it was found, "
            "its density (e.g., 'Mentioned 2 times'), and the severity if missing.\n"
            "4. Build a scoring_breakdown using the published rubric weights above. "
            "The criterion scores must explain "
            "the final score.\n"
            "5. Return a structured deductions list. Each deduction must include "
            "a code, title, severity, points_lost, evidence, and recommendation.\n"
            "6. In strict mode, apply more conservative penalties for missing hard "
            "skills, weak title alignment, and poor ATS structure.\n"
            "7. Provide 3-5 specific, actionable recommendations to improve "
            "the CV for this specific job."
        ),
        expected_output="A structured JSON object containing the ATS report.",
        output_pydantic=AtsReport,
        agent=ats_scorer,
    )

    crew = Crew(agents=[ats_scorer], tasks=[task], process=Process.sequential)

    # CrewAI kickoff is synchronous — run in executor to avoid blocking FastAPI
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, crew.kickoff)

    try:
        # CrewAI with output_pydantic returns the model in result.pydantic
        if hasattr(result, "pydantic") and result.pydantic:
            logger.info("✅ ATS report generated (score=%s)", result.pydantic.score)
            report = result.pydantic.model_dump(mode="json")
            report["mode"] = mode
            report["rubric"] = rubric.model_dump(mode="json")
            report["context"] = AtsReportContext(
                job_title=job_title,
                job_company=job_company,
                job_id=job.id if job else None,
                resume_id=snapshot.resume_id,
                resume_locale=snapshot.locale,
                resume_revision=snapshot.revision,
                resume_content_hash=snapshot.content_hash,
                evidence_ids=[fact.id for fact in snapshot.evidence_registry],
                provider=provider,
                model_name=model_name,
            ).model_dump(mode="json")
            report.setdefault("deductions", [])
            return AtsReport.model_validate(report).model_dump(mode="json")
        raise ValueError("No pydantic output found")
    except Exception as e:
        logger.error("Error parsing ATS Pydantic output: %s", e)
        return build_fallback_ats_report(
            mode=mode,
            provider=provider,
            model_name=model_name,
            reason=str(e),
            context={
                "job_title": job_title,
                "job_company": job_company,
                "job_id": job.id if job else None,
                "resume_id": snapshot.resume_id,
                "resume_locale": snapshot.locale,
                "resume_revision": snapshot.revision,
                "resume_content_hash": snapshot.content_hash,
                "evidence_ids": [fact.id for fact in snapshot.evidence_registry],
            },
        )
