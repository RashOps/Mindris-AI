"""Company intelligence analysis for Mindris AI."""

from __future__ import annotations

import asyncio

from crewai import Agent, Crew, Process, Task
from pydantic import BaseModel, Field
from utils.logger import get_logger

from intelligence.llm_config import get_llm

logger = get_logger(__name__, service_name="intelligence")


class CompanyInsight(BaseModel):
    """Structured company intelligence shown in job insights."""

    name: str
    industry: str = "Unknown"
    size: str = "Unknown"
    culture_values: list[str] = Field(default_factory=list)
    recent_news: list[str] = Field(default_factory=list)
    glassdoor_summary: str | None = None
    tech_stack_known: list[str] = Field(default_factory=list)
    unavailable_reason: str | None = None


async def analyze_company(
    company_name: str,
    provider: str = "groq",
    model_name: str = "llama-3.1-8b-instant",
) -> dict:
    """Analyze a company with graceful fallback when external intel is unavailable."""
    name = company_name.strip()
    if not name:
        return CompanyInsight(
            name="Unknown",
            unavailable_reason="No company name was provided.",
        ).model_dump()

    try:
        llm = get_llm(provider=provider, model_name=model_name)
        analyst = Agent(
            role="Company Research Analyst",
            goal="Summarize practical company intelligence for a job candidate.",
            backstory=(
                "You create concise, useful company briefings from your "
                "general knowledge. "
                "If recent facts are uncertain, say so instead of inventing details."
            ),
            llm=llm,
            allow_delegation=False,
            verbose=False,
        )
        task = Task(
            description=(
                f"Company: {name}\n\n"
                "Return a compact candidate-facing company briefing. "
                "Use only high-confidence information. "
                "If exact size, news, Glassdoor sentiment, or tech stack "
                "are unknown, use 'Unknown' or empty arrays."
            ),
            expected_output="A structured CompanyInsight JSON object.",
            output_pydantic=CompanyInsight,
            agent=analyst,
        )
        crew = Crew(agents=[analyst], tasks=[task], process=Process.sequential)
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, crew.kickoff)
        if hasattr(result, "pydantic") and result.pydantic:
            return result.pydantic.model_dump()
    except Exception as exc:
        logger.warning("Company analysis unavailable for %s: %s", name, exc)

    return CompanyInsight(
        name=name,
        unavailable_reason=(
            "Company intel unavailable without a successful LLM/search response."
        ),
    ).model_dump()
