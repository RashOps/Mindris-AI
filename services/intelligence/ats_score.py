"""ATS Scoring Agent.

Uses a CrewAI agent to evaluate a CV against a job description
and returns a detailed enterprise-grade ATS report using Pydantic output.
"""

from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field
from crewai import Agent, Crew, Process, Task
from intelligence.llm_config import get_llm


class KeywordStatus(BaseModel):
    """Analysis of a single keyword from the job requirements."""
    keyword: str = Field(description="The keyword being analyzed")
    found: bool = Field(description="Whether the keyword or a close semantic match was found in the CV")
    density: str = Field(description="How many times it was mentioned, or 'Not found'")
    severity: str = Field(description="Impact if missing: 'high' (blocking), 'medium' (important), or 'low' (bonus)")


class AtsReport(BaseModel):
    """Detailed ATS evaluation report."""
    score: int = Field(description="Overall ATS match score between 0 and 100")
    summary: str = Field(description="A 2-3 sentence executive summary of the candidate's fit")
    keyword_analysis: List[KeywordStatus] = Field(description="Detailed analysis of required hard and soft skills")
    recommendations: List[str] = Field(description="Actionable steps the candidate can take to improve the CV")


def _build_cv_text(cv_data: dict) -> str:
    """Extract a plain text representation of the CV for scoring."""
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
        text.append(f"Skills ({skill_group.get('category')}): {', '.join(skill_group.get('skills', []))}")

    return "\n".join(text)


async def calculate_ats_score(cv_data: dict, job_insights: dict, provider: str, model_name: str) -> dict:
    """Calculate the detailed ATS report for a CV against a job offer."""

    cv_text = _build_cv_text(cv_data)

    job_title = job_insights.get("job_title", "Unknown")
    hard_skills = job_insights.get("hard_skills", [])
    soft_skills = job_insights.get("soft_skills", [])

    job_text = f"Job Title: {job_title}\nRequired Hard Skills: {', '.join(hard_skills)}\nRequired Soft Skills: {', '.join(soft_skills)}"

    llm = get_llm(provider=provider, model_name=model_name)

    ats_scorer = Agent(
        role="Senior ATS & Recruitment Scanner",
        goal="Audit the candidate's CV against the job requirements and generate a detailed report.",
        backstory=(
            "You are a strict but fair Enterprise-Grade Applicant Tracking System (ATS). "
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
            "Task: Perform a deep ATS audit of the candidate's CV against the job requirements.\n"
            "1. Calculate an overall match score (0-100).\n"
            "2. Write a brief executive summary.\n"
            "3. Analyze EACH required hard and soft skill. Determine if it was found, its density (e.g., 'Mentioned 2 times'), and the severity if it's missing.\n"
            "4. Provide 3-5 specific, actionable recommendations to improve the CV for this specific job."
        ),
        expected_output="A structured JSON object containing the ATS report.",
        output_pydantic=AtsReport,
        agent=ats_scorer,
    )

    crew = Crew(agents=[ats_scorer], tasks=[task], process=Process.sequential)
    result = crew.kickoff()

    try:
        # CrewAI 1.14.3 with output_pydantic returns a pydantic object in result.pydantic
        if hasattr(result, "pydantic") and result.pydantic:
            return result.pydantic.model_dump()
        else:
            raise ValueError("No pydantic output found")
    except Exception as e:
        print(f"Error parsing ATS Pydantic output: {e}")
        # Fallback
        return {
            "score": 50,
            "summary": "Error generating detailed report.",
            "keyword_analysis": [],
            "recommendations": ["Try again later or check API provider quotas."],
        }
