"""End-to-end Mindris AI pipeline: scrape a job offer and analyse it with CrewAI."""

import asyncio
import logging
import pprint

from intelligence.crew import analyze_job_offer
from scraper.smart_scraper import ScraperExhaustedError, SmartScraper
from utils.logger import get_logger

# Initialise logging for the CLI entry point
get_logger("mindris")
logger = logging.getLogger(__name__)


async def run_pipeline(
    url: str,
    selector: str = "body",
    provider: str = "ollama",
    model_name: str = "gemma4:32k",
) -> None:
    """Scrape a job offer URL and run the AI analysis pipeline.

    Phase 1 — SmartScraper fetches the page and converts it to clean Markdown.
    Phase 2 — CrewAI / LLM extracts structured fields from the Markdown.

    The URL and full Markdown body are injected into the Pydantic result after
    the LLM finishes, so the model only needs to handle lightweight extraction
    (skills, title, company, …) without wasting context tokens on large fields.

    Args:
        url: Public URL of the job offer page to analyse.
        selector: CSS selector to target the job description element.
            Defaults to ``"body"`` (full page).
        provider: The LLM provider (e.g., "ollama", "groq", "gemini", "openai").
        model_name: The specific model name for the provider.
    """
    logger.info("🚀 Starting Mindris AI pipeline for: %s", url)
    logger.info("🤖 Using LLM: %s (%s)", provider, model_name)

    # ── Phase 1: Scraping ─────────────────────────────────────────────────────
    logger.info("🔍 Phase 1: Scraping and Markdown conversion…")
    try:
        async with SmartScraper() as scraper:
            markdown_content = await scraper.get_cleaned_content(url, selector=selector)
    except ScraperExhaustedError:
        logger.error("❌ All scraping providers exhausted — aborting pipeline.")
        return

    if not markdown_content:
        logger.error("❌ Scraping returned empty content — aborting pipeline.")
        return

    logger.info("✅ Markdown ready (%d chars).", len(markdown_content))

    # ── Phase 2: AI analysis ──────────────────────────────────────────────────
    logger.info("🧠 Phase 2: AI analysis (%s/%s)…", provider, model_name)

    try:
        job_offer = await analyze_job_offer(
            markdown_content=markdown_content,
            url=url,
            provider=provider,
            model_name=model_name,
        )

        if job_offer:
            logger.info("\n" + "=" * 40)
            logger.info("🎯 ANALYSIS RESULT")
            logger.info("=" * 40)
            pprint.pprint(job_offer.model_dump())
        else:
            logger.error("❌ AI analysis returned no structured output.")

    except Exception as e:
        logger.exception("❌ AI analysis error: %s", e)


if __name__ == "__main__":
    _url = "https://recrutement.sfr.com/offer/view/194094"

    # You can change the provider and model_name dynamically here:
    # e.g., provider="groq", model_name="llama3-70b-8192"
    # e.g., provider="gemini", model_name="gemini-1.5-pro"
    asyncio.run(
        run_pipeline(
            _url,
            selector="body",
            provider="ollama",
            model_name="gemma4:32k",
        )
    )
