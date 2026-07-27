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
from intelligence.resume_context import ResumeContextSnapshot, ResumeIdentity

logger = get_logger(__name__, service_name="intelligence")

def _build_job_summary(snapshot: ResumeContextSnapshot) -> str:
    """Format job insights for the agent prompt."""
    job = snapshot.job_context
    if job is None:
        return "Target position: Unknown role\nCompany: Unknown"
    hard = ", ".join(job.hard_skills[:10])
    soft = ", ".join(job.soft_skills[:5])
    return (
        f"Target position: {job.title} at {job.company}\n"
        f"Required hard skills: {hard}\n"
        f"Valued soft skills: {soft}\n"
        f"Source description:\n{job.description[:3000]}"
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
    snapshot: ResumeContextSnapshot,
    instructions: str,
    example_letter: str | None,
    provider: str,
    model_name: str,
    rehydration_identity: ResumeIdentity | None = None,
) -> str:
    """Generate a tailored cover letter in Markdown.

    Args:
        snapshot:       Canonical, task-filtered resume and job context.
        instructions:   Free-form user instructions (tone, emphasis, language…).
        example_letter: Optional existing letter to use as a style guide.
        provider:       LLM provider identifier.
        model_name:     Model name for the selected provider.
        rehydration_identity: Local identity restored after cloud generation.

    Returns:
        Markdown string — the generated cover letter.
    """
    llm = get_llm(provider=provider, model_name=model_name)
    logger.info("📝 Generating cover letter via %s/%s", provider, model_name)

    identity = snapshot.identity
    candidate_name = identity.full_name or "{{candidate_name}}"
    candidate_email = identity.email or "{{candidate_email}}"
    cv_summary = (
        f"Candidate: {candidate_name}\n"
        f"Email: {candidate_email}\n"
        f"Document language: {snapshot.locale}\n"
        f"Source revision: {snapshot.revision}\n"
        f"Evidence registry:\n{snapshot.evidence_text()}"
    )
    job_summary = _build_job_summary(snapshot)
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
            "4. Use only facts from the evidence registry for achievements. "
            "Never invent a skill, diploma, employer, date, or metric.\n"
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

    if rehydration_identity is not None:
        raw = raw.replace("{{candidate_name}}", rehydration_identity.full_name)
        raw = raw.replace("{{candidate_email}}", rehydration_identity.email)
        raw = raw.replace("{{candidate_phone}}", rehydration_identity.phone)
        raw = raw.replace("{{candidate_address}}", rehydration_identity.address)
    return raw
