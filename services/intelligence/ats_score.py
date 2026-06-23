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

logger = get_logger(__name__)


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


class AtsReport(BaseModel):
    """Detailed ATS evaluation report."""

    score: int = Field(description="Overall ATS match score between 0 and 100")
    summary: str = Field(
        description="A 2-3 sentence executive summary of the candidate's fit"
    )
    scoring_breakdown: list[ScoringCriteria] = Field(
        description="Transparent weighted scoring breakdown"
    )
    keyword_analysis: list[KeywordStatus] = Field(
        description="Detailed analysis of required hard and soft skills"
    )
    recommendations: list[str] = Field(
        description="Actionable steps the candidate can take to improve the CV"
    )


# ── Helpers ───────────────────────────────────────────────────────────────────


def _build_cv_text(cv_data: dict) -> str:
    """Extract a plain text representation of the CV for scoring.

    Args:
        cv_data: Full CVData JSON dictionary.

    Returns:
        Flat text string suitable for the ATS agent prompt.
    """
    profile = cv_data.get("profile", {})
    text = []

    if profile.get("title"):
        text.append(f"Title: {profile['title']}")
    if profile.get("text_markdown"):
        text.append(f"Summary: {profile['text_markdown']}")

    for exp in cv_data.get("experience", []):
        text.append(f"Role: {exp.get('role')} at {exp.get('company')}")
        if exp.get("description_markdown"):
            text.append(exp["description_markdown"])

    for skill_group in cv_data.get("skills", []):
        cat = skill_group.get("category")
        skills = ", ".join(skill_group.get("skills", []))
        text.append(f"Skills ({cat}): {skills}")

    return "\n".join(text)


# ── Public API ────────────────────────────────────────────────────────────────


async def calculate_ats_score(
    cv_data: dict,
    job_insights: dict,
    provider: str,
    model_name: str,
) -> dict:
    """Calculate the detailed ATS report for a CV against a job offer.

    Args:
        cv_data:      Full CVData JSON from the frontend store.
        job_insights: Structured job data (title, company, skills, bullets).
        provider:     LLM provider identifier.
        model_name:   Model name for the selected provider.

    Returns:
        Dictionary matching :class:`AtsReport` schema.
    """
    logger.info("🎯 Calculating ATS score via %s/%s", provider, model_name)
    cv_text = _build_cv_text(cv_data)

    job_title = job_insights.get("job_title", "Unknown")
    hard_skills = job_insights.get("hard_skills", [])
    soft_skills = job_insights.get("soft_skills", [])

    job_text = (
        f"Job Title: {job_title}\n"
        f"Required Hard Skills: {', '.join(hard_skills)}\n"
        f"Required Soft Skills: {', '.join(soft_skills)}"
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
            "1. Calculate an overall match score (0-100).\n"
            "2. Write a brief executive summary.\n"
            "3. Analyze EACH required hard and soft skill. Determine if it was found, "
            "its density (e.g., 'Mentioned 2 times'), and the severity if missing.\n"
            "4. Build a scoring_breakdown using exactly these weights: "
            "Keyword Match Rate 40, Experience Relevance 25, "
            "Formatting & Structure 15, Quantification 10, "
            "Overall Coherence 10. The criterion scores must explain "
            "the final score.\n"
            "5. Apply strict penalties: every missing hard skill costs "
            "at least 5 points, weak experience relevance costs up to "
            "25 points, missing metrics in bullets costs up to 10 points, "
            "and a non-aligned CV title costs 10 points.\n"
            "6. Provide 3-5 specific, actionable recommendations to improve "
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
            return result.pydantic.model_dump()
        raise ValueError("No pydantic output found")
    except Exception as e:
        logger.error("Error parsing ATS Pydantic output: %s", e)
        return {
            "score": 50,
            "summary": "Error generating detailed report.",
            "scoring_breakdown": [
                {
                    "criterion": "Fallback Score",
                    "weight": 100,
                    "score": 50,
                    "max_score": 100,
                    "explanation": (
                        "The LLM provider did not return a valid structured report."
                    ),
                }
            ],
            "keyword_analysis": [],
            "recommendations": ["Try again later or check API provider quotas."],
        }
