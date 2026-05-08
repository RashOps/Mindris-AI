"""CrewAI task definitions for Mindris AI intelligence pipeline."""

from crewai import Agent, Task
from database.models import JobOffer

# Maximum number of Markdown characters passed to the LLM.
# At ~4 chars/token this is ≈3 000 tokens, leaving plenty of room for
# the system prompt, agent backstory, JSON schema, and the LLM response
# within a 32 768-token context window.
_MAX_MARKDOWN_CHARS = 12_000


class MindrisTasks:
    """Factory for CrewAI tasks used in the Mindris intelligence pipeline."""

    def analysis_task(self, agent: Agent, job_markdown: str, url: str) -> Task:
        """Build a job-offer extraction task for the given agent.

        JSON rules are placed **before** the Markdown content so they are
        never lost when Ollama truncates an oversized prompt.

        Args:
            agent: The CrewAI agent that will execute this task.
            job_markdown: Raw job offer content in Markdown format.
            url: Source URL of the offer (injected post-LLM, not generated
                by the model, to save context tokens).

        Returns:
            A configured :class:`crewai.Task` with ``output_json=JobOffer``.
        """
        # Truncate early so we never overflow the LLM context window.
        content = job_markdown[:_MAX_MARKDOWN_CHARS]
        if len(job_markdown) > _MAX_MARKDOWN_CHARS:
            content += "\n\n[… content truncated for context-window reasons …]"

        return Task(
            description=(
                # ── Instructions FIRST so they survive any further truncation ──
                "CRITICAL JSON RULES — FOLLOW THEM EXACTLY:\n"
                "1. Reply with a SINGLE valid JSON object and nothing else.\n"
                "2. Use EXACTLY these English keys: "
                '"title", "company", "location", "hard_skills", "soft_skills", '
                '"experience_level", "remote_policy", "salary_range".\n'
                "3. NEVER translate keys (use \"company\", NOT \"entreprise\").\n"
                "4. Extract as many hard_skills (technical) and soft_skills "
                "(interpersonal) as possible — return them as JSON arrays.\n"
                '5. Do NOT include "url" or "description_markdown" keys.\n\n'
                # ── Content follows ───────────────────────────────────────────
                "Analyse the following job offer and extract the information "
                "according to the rules above:\n\n"
                f"{content}"
            ),
            expected_output=(
                "A single JSON object with English keys: title, company, "
                "location, hard_skills, soft_skills, experience_level, "
                "remote_policy, salary_range."
            ),
            agent=agent,
            output_json=JobOffer,
        )
