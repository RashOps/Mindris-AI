"""Smart scraper with automatic provider fallback for Mindris AI.

Orchestrates scraping across three tiers depending on the configured
``SCRAPER_STRATEGY`` environment variable:

+--------------------+-------------------------------------------------------+
| Strategy           | Behaviour                                             |
+====================+=======================================================+
| ``auto``           | Playwright → Scrape.do → ScrapingBee (default)        |
+--------------------+-------------------------------------------------------+
| ``playwright_only``| Only local Playwright, never call cloud providers.    |
+--------------------+-------------------------------------------------------+
| ``proxy_first``    | Skip Playwright entirely, start with Scrape.do.       |
+--------------------+-------------------------------------------------------+

The cascade stops at the first provider that returns a non-empty result.
When all providers fail :class:`ScraperExhaustedError` is raised so the
caller can emit an SSE error event.

Usage::

    async with SmartScraper() as scraper:
        markdown = await scraper.get_cleaned_content("https://example.com/job")
"""

import logging
from types import TracebackType
from typing import Literal

from utils.config import settings

from .core import BaseScraper
from .proxy_scraper import ScrapeDoProvider, ScrapingBeeProvider

logger = logging.getLogger(__name__)

# ── Exceptions ────────────────────────────────────────────────────────────────


class ScraperExhaustedError(RuntimeError):
    """Raised when every scraping provider has failed for a given URL."""


# ── SmartScraper ─────────────────────────────────────────────────────────────


class SmartScraper:
    """Async context manager that tries multiple scraping providers in order.

    The active strategy is determined at instantiation time from
    :attr:`utils.config.Settings.scraper_strategy` but can be overridden
    by passing *strategy* explicitly (useful in tests).

    Example::

        async with SmartScraper() as scraper:
            md = await scraper.get_cleaned_content("https://linkedin.com/jobs/…")

        # Force proxy-first (e.g., skip Playwright in a headless CI environment):
        async with SmartScraper(strategy="proxy_first") as scraper:
            md = await scraper.get_cleaned_content(url)
    """

    def __init__(
        self,
        strategy: Literal["auto", "playwright_only", "proxy_first"] | None = None,
        headless: bool | None = None,
    ) -> None:
        """Initialise the SmartScraper.

        Args:
            strategy: Override the scraper strategy from config. When ``None``
                the value is read from ``settings.scraper_strategy``.
            headless: Override the headless flag for Playwright. When ``None``
                the value is read from ``settings.scraper_headless``.
        """
        self._strategy: str = strategy or settings.scraper_strategy
        self._fallback_enabled: bool = settings.scraper_proxy_fallback
        self._headless = headless

        # Lazy-initialised Playwright scraper (only if needed)
        self._playwright_scraper: BaseScraper | None = None

        logger.info(
            "🧭 SmartScraper strategy=%s fallback=%s",
            self._strategy,
            self._fallback_enabled,
        )

    # ── Context manager ───────────────────────────────────────────────────────

    async def __aenter__(self) -> "SmartScraper":
        """Start the Playwright browser if the strategy requires it."""
        if self._strategy in ("auto", "playwright_only"):
            self._playwright_scraper = BaseScraper(headless=self._headless)
            await self._playwright_scraper.__aenter__()
            logger.debug("🎭 Playwright browser started")
        return self

    async def __aexit__(
        self,
        exc_type: type | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        """Close the Playwright browser if it was opened."""
        if self._playwright_scraper is not None:
            await self._playwright_scraper.__aexit__(exc_type, exc_val, exc_tb)
            logger.debug("🎭 Playwright browser closed")

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_cleaned_content(
        self, url: str, selector: str = "body"
    ) -> str:
        """Scrape *url* and return clean Markdown, trying providers in cascade.

        The cascade order depends on the active strategy:

        - ``auto``:          Playwright → Scrape.do → ScrapingBee
        - ``playwright_only``: Playwright only (raises on failure)
        - ``proxy_first``:   Scrape.do → ScrapingBee (skips Playwright)

        Args:
            url: The page URL to scrape.
            selector: CSS selector for the element to extract.  Passed to
                Playwright only; proxy providers always return the full body.

        Returns:
            Clean Markdown string from the first successful provider.

        Raises:
            ScraperExhaustedError: When all enabled providers fail.
        """
        providers = self._build_provider_chain()
        last_error: Exception | None = None

        for provider_name, provider_fn in providers:
            logger.info("⚙️ [%s] Attempting to scrape %s", provider_name, url)
            try:
                result = await provider_fn(url, selector)
                if result:
                    logger.info(
                        "✅ [%s] Success — %d chars of Markdown",
                        provider_name,
                        len(result),
                    )
                    return result
                logger.warning(
                    "⚠️ [%s] Returned empty content for %s — trying next provider",
                    provider_name,
                    url,
                )
            except Exception as exc:
                logger.warning(
                    "⚠️ [%s] Failed for %s: %s — trying next provider",
                    provider_name,
                    url,
                    exc,
                )
                last_error = exc

        msg = (
            f"All scraping providers exhausted for {url}."
            + (f" Last error: {last_error}" if last_error else "")
        )
        logger.error("❌ %s", msg)
        raise ScraperExhaustedError(msg)

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _build_provider_chain(
        self,
    ) -> list[tuple[str, object]]:
        """Build the ordered list of (name, async_callable) provider pairs.

        Returns:
            List of ``(provider_name, coroutine_function)`` tuples in the
            order they should be tried.
        """
        chain: list[tuple[str, object]] = []

        # ── Playwright (local, free) ──────────────────────────────────────────
        if self._strategy in ("auto", "playwright_only") and self._playwright_scraper:
            chain.append(("Playwright", self._playwright_scraper.get_cleaned_content))

        if self._strategy == "playwright_only":
            # No cloud fallback allowed
            return chain

        if not self._fallback_enabled:
            logger.debug("Proxy fallback disabled — stopping after Playwright")
            return chain

        # ── Scrape.do (cloud tier 1) ──────────────────────────────────────────
        if settings.scrape_do_api_key:
            scrape_do = ScrapeDoProvider()

            async def _scrape_do_wrapper(url: str, selector: str) -> str:  # noqa: ANN001
                return await scrape_do.fetch(url)  # proxy providers ignore selector

            chain.append(("Scrape.do", _scrape_do_wrapper))
        else:
            logger.debug("Scrape.do skipped — SCRAPE_DO_API not configured")

        # ── ScrapingBee (cloud tier 2) ────────────────────────────────────────
        if settings.scrapingbee_api_key:
            scrapingbee = ScrapingBeeProvider()

            async def _scrapingbee_wrapper(url: str, selector: str) -> str:  # noqa: ANN001
                return await scrapingbee.fetch(url)

            chain.append(("ScrapingBee", _scrapingbee_wrapper))
        else:
            logger.debug("ScrapingBee skipped — SCRAPINGBEE_API not configured")

        return chain
