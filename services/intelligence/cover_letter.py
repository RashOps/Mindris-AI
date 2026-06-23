"""Cover Letter Generator for Mindris AI.

Uses a CrewAI agent to generate a tailored cover letter in Markdown,
based on the candidate's CV data, the scraped job insights, optional
writing instructions, and an optional example letter for style guidance.
"""

from __future__ import annotations

import asyncio

from crewai import Agent, Crew, Process, Task
from utils.logger import get_logger

from intelligence.llm_config import get_llm

logger = get_logger(__name__)

# ── Prompt builders ───────────────────────────────────────────────────────────


def _build_cv_summary(cv_data: dict) -> str:
    """Extract a concise candidate summary from CVData."""
    profile = cv_data.get("profile", {})
    name = profile.get("full_name", "Candidate")
    title = profile.get("title", "")
    email = profile.get("email", "")
    summary = profile.get("text_markdown", "")

    exp_items = cv_data.get("experience", [])
    exp_text = "\n".join(
        f"  - {e.get('role')} @ {e.get('company')} ({e.get('period', '')})"
        for e in exp_items[:4]
    )

    skills_groups = cv_data.get("skills", [])
    skills_text = ", ".join(s for g in skills_groups for s in g.get("skills", [])[:5])

    return (
        f"Candidate: {name} — {title}\n"
        f"Email: {email}\n"
        f"Summary: {summary[:400]}\n"
        f"Key experiences:\n{exp_text}\n"
        f"Top skills: {skills_text}"
    )


def _build_job_summary(job_insights: dict) -> str:
    """Format job insights for the agent prompt."""
    title = job_insights.get("job_title", "Unknown Role")
    company = job_insights.get("company", "the company")
    hard = ", ".join(job_insights.get("hard_skills", [])[:10])
    soft = ", ".join(job_insights.get("soft_skills", [])[:5])
    bullets = "\n".join(f"  - {b}" for b in job_insights.get("drafted_bullets", [])[:6])
    return (
        f"Target position: {title} at {company}\n"
        f"Required hard skills: {hard}\n"
        f"Valued soft skills: {soft}\n"
        f"Tailored highlights:\n{bullets}"
    )


def _build_style_guidance(example_letter: str | None) -> str:
    """Derive style instructions from an example letter if provided."""
    if not example_letter or not example_letter.strip():
        return (
            "Style: professional, warm, concise. "
            "Length: 3–4 paragraphs. "
            "Language: match the job posting language."
        )
    # Give the agent the raw example to study
    excerpt = example_letter.strip()[:1500]
    return (
        "The candidate provided the following example letter as a style guide. "
        "Replicate its tone, vocabulary level, paragraph structure, "
        "and approximate length — "
        "but write a completely new letter tailored to the target job.\n\n"
        f"--- EXAMPLE LETTER ---\n{excerpt}\n--- END EXAMPLE ---"
    )


# ── Public API ────────────────────────────────────────────────────────────────


async def generate_cover_letter(
    cv_data: dict,
    job_insights: dict,
    instructions: str,
    example_letter: str | None,
    provider: str,
    model_name: str,
) -> str:
    """Generate a tailored cover letter in Markdown.

    Args:
        cv_data:        Full CVData JSON from the frontend store.
        job_insights:   Structured job data (title, company, skills, bullets).
        instructions:   Free-form user instructions (tone, emphasis, language…).
        example_letter: Optional existing letter to use as a style guide.
        provider:       LLM provider identifier.
        model_name:     Model name for the selected provider.

    Returns:
        Markdown string — the generated cover letter.
    """
    llm = get_llm(provider=provider, model_name=model_name)
    logger.info("📝 Generating cover letter via %s/%s", provider, model_name)

    cv_summary = _build_cv_summary(cv_data)
    job_summary = _build_job_summary(job_insights)
    style_guidance = _build_style_guidance(example_letter)
    extra_instr = instructions.strip() if instructions else "None provided."

    writer = Agent(
        role="Professional Cover Letter Writer",
        goal=(
            "Write a compelling, personalised cover letter in Markdown that will "
            "impress the hiring team and maximise the candidate's ATS score."
        ),
        backstory=(
            "You are an expert career coach and professional writer with 15+ years of "
            "experience crafting winning cover letters for tech and business roles. "
            "You know how to weave a candidate's real experience into a narrative that "
            "directly addresses the employer's needs."
        ),
        llm=llm,
        allow_delegation=False,
        verbose=False,
    )

    task = Task(
        description=(
            "Write a personalised cover letter in Markdown for the candidate below.\n\n"
            f"=== CANDIDATE PROFILE ===\n{cv_summary}\n\n"
            f"=== TARGET JOB ===\n{job_summary}\n\n"
            f"=== STYLE GUIDANCE ===\n{style_guidance}\n\n"
            f"=== ADDITIONAL INSTRUCTIONS ===\n{extra_instr}\n\n"
            "CRITICAL RULES — follow every one exactly:\n"
            "1. Start your response with the very first character of the letter "
            "(a '#' heading or the candidate name). "
            "DO NOT wrap the output in ```markdown``` or any code fence. "
            "DO NOT add any preamble like 'Here is the letter:'. "
            "Output raw Markdown ONLY.\n"
            "2. MANDATORY: explicitly name the target company and role "
            "from the TARGET JOB "
            "section in the opening paragraph.\n"
            "3. MANDATORY: naturally weave in at least 3 of the hard "
            "skills listed in "
            "the TARGET JOB section.\n"
            "4. MANDATORY: transform the 'Tailored highlights' bullets "
            "into 1\u20132 concrete "
            "achievement sentences in the body paragraphs.\n"
            "5. Structure: Markdown header (name + contact) → date → salutation → "
            "3–4 body paragraphs → professional closing.\n"
            "6. Write in the same language as the job posting (default: French)."
        ),
        expected_output=(
            "Raw Markdown cover letter starting with '#' or the candidate's name — "
            "no code fences, no explanation."
        ),
        agent=writer,
    )

    crew = Crew(agents=[writer], tasks=[task], process=Process.sequential)

    # CrewAI kickoff is synchronous — run in a thread to avoid blocking the event loop
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, crew.kickoff)
    raw = str(result.raw).strip()
    logger.info("✅ Cover letter generated (%d chars)", len(raw))

    # ── Strip code fence wrapper (```markdown ... ``` or ``` ... ```) ─────────
    if raw.startswith("```"):
        first_newline = raw.find("\n")
        last_fence = raw.rfind("```")
        if first_newline != -1 and last_fence > first_newline:
            raw = raw[first_newline + 1 : last_fence].strip()

    return raw
