"""ATS Scoring Agent.

Uses a CrewAI agent to evaluate a CV against a job description
and returns a single integer score (0-100).
"""

from __future__ import annotations

import re
from crewai import Agent, Crew, Process, Task
from intelligence.llm_config import get_llm

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

async def calculate_ats_score(cv_data: dict, job_insights: dict, provider: str, model_name: str) -> int:
    """Calculate the ATS score (0-100) for a CV against a job offer."""
    
    cv_text = _build_cv_text(cv_data)
    
    job_title = job_insights.get("job_title", "Unknown")
    hard_skills = job_insights.get("hard_skills", [])
    soft_skills = job_insights.get("soft_skills", [])
    
    job_text = f"Job Title: {job_title}\nRequired Hard Skills: {', '.join(hard_skills)}\nRequired Soft Skills: {', '.join(soft_skills)}"
    
    llm = get_llm(provider=provider, model_name=model_name)
    
    ats_scorer = Agent(
        role="Senior ATS & Recruitment Scanner",
        goal="Score the candidate's CV against the job requirements.",
        backstory=(
            "You are a strict but fair Applicant Tracking System (ATS). "
            "You evaluate CVs based on keyword matching, relevance of experience, "
            "and overall alignment with the job requirements."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    task = Task(
        description=(
            f"=== JOB REQUIREMENTS ===\n{job_text}\n\n"
            f"=== CANDIDATE CV ===\n{cv_text}\n\n"
            "Task: Evaluate how well the candidate's CV matches the job requirements. "
            "Consider both exact keyword matches and semantic relevance. "
            "Return ONLY a single integer between 0 and 100 representing the match percentage. "
            "Do not include any other text or explanation."
        ),
        expected_output="A single integer between 0 and 100.",
        agent=ats_scorer,
    )

    crew = Crew(agents=[ats_scorer], tasks=[task], process=Process.sequential)
    result = crew.kickoff()

    try:
        score_text = str(result.raw).strip()
        # Find all numbers in the string
        numbers = re.findall(r'\d+', score_text)
        if numbers:
            score = int(numbers[0])
            return min(max(score, 0), 100)
        return 50
    except Exception:
        return 50
