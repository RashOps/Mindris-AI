"""End-to-end Mindris AI pipeline: scrape a job offer and analyse it with CrewAI."""

import asyncio
import pprint

from intelligence.crew import MindrisIntelligence
from scraper.core import BaseScraper


async def run_pipeline(
    url: str,
    selector: str = "body",
    provider: str = "ollama",
    model_name: str = "gemma4:32k",
) -> None:
    """Scrape a job offer URL and run the AI analysis pipeline.

    Phase 1 — Playwright scrapes the page and converts it to clean Markdown.
    Phase 2 — CrewAI / Ollama extracts structured fields from the Markdown.

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
    print(f"🚀 Starting Mindris AI pipeline for: {url}")
    print(f"🤖 Using LLM: {provider} ({model_name})")

    # ── Phase 1: Scraping ─────────────────────────────────────────────────────
    async with BaseScraper() as scraper:
        print("🔍 Phase 1: Scraping and Markdown conversion…")
        markdown_content = await scraper.get_cleaned_content(url, selector=selector)

    if not markdown_content:
        print("❌ Scraping failed — aborting pipeline.")
        return

    print(f"✅ Markdown ready ({len(markdown_content)} chars).")

    # ── Phase 2: AI analysis ──────────────────────────────────────────────────
    print(f"🧠 Phase 2: AI analysis ({provider}/{model_name})…")
    intelligence = MindrisIntelligence(provider=provider, model_name=model_name)

    try:
        result = intelligence.analyze_job(markdown_content, url)

        print("\n" + "=" * 40)
        print("🎯 ANALYSIS RESULT")
        print("=" * 40)

        if hasattr(result, "pydantic") and result.pydantic:
            # Inject fields that the LLM was not asked to produce
            result.pydantic.url = url
            result.pydantic.description_markdown = markdown_content
            pprint.pprint(result.pydantic.model_dump())
        else:
            print(result)

    except Exception as e:
        print(f"❌ AI analysis error: {e}")


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
