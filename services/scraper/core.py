"""Playwright-based web scraper with stealth and Cloudflare bypass for Mindris AI.

This module exposes :class:`BaseScraper`, an async context manager that launches
a Chromium browser with ``playwright-stealth`` applied.  It is designed to scrape
job-board pages protected by Cloudflare Turnstile / Bot-Management by:

* Using an up-to-date Chrome user-agent.
* Randomising delays and simulating human scroll behaviour.
* Detecting the Cloudflare challenge page and waiting for it to auto-resolve.
* Aborting gracefully when the challenge cannot be bypassed, to prevent sending
  raw Cloudflare JS to the LLM.
"""

import asyncio
import contextlib
import logging
import random
from pathlib import Path

from markdownify import markdownify as md
from playwright.async_api import BrowserContext, Page, async_playwright
from playwright_stealth import Stealth
from utils.config import settings

logger = logging.getLogger(__name__)

# ── User-agents (updated to Chrome 125 / 2025) ────────────────────────────────
USER_AGENT_WINDOWS = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)
USER_AGENT_MAC = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)
USER_AGENT_LINUX = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)

# HTML tags whose content adds noise without value for the LLM
_STRIP_TAGS = [
    "script",
    "style",
    "nav",
    "footer",
    "header",
    "aside",
    "form",
    "svg",
    "noscript",
    "iframe",
    "button",
    "img",
]

# Cloudflare challenge fingerprints
_CF_PATTERNS = ("cf_chl_opt", "Just a moment", "cf-challenge", "cf_clearance")


class BaseScraper:
    """Async context-manager scraper built on Playwright with stealth mode.

    Example::

        async with BaseScraper(headless=False) as scraper:
            markdown = await scraper.get_cleaned_content(url, selector="main")
    """

    def __init__(self, headless: bool | None = None) -> None:
        """Initialise the scraper.

        Args:
            headless: Whether to run the browser without a visible window.
                Defaults to the ``SCRAPER_HEADLESS`` env setting.
                Set to ``False`` during development to help pass Cloudflare
                interactive challenges manually on first run.
        """
        self.headless: bool = (
            headless if headless is not None else settings.scraper_headless
        )
        self.user_agent: str = USER_AGENT_WINDOWS
        self.stealth = Stealth()
        self._pw = None
        self._browser = None
        self._profile_dir: Path = settings.storage_dir / "browser_profile"

    # ── Context manager ───────────────────────────────────────────────────────

    async def __aenter__(self) -> "BaseScraper":
        """Start Playwright and launch the browser."""
        self._profile_dir.mkdir(parents=True, exist_ok=True)
        self._pw = await async_playwright().start()
        # launch_persistent_context keeps cookies / localStorage between runs,
        # which means once a Cloudflare challenge is solved it stays solved.
        self._browser: BrowserContext = (
            await self._pw.chromium.launch_persistent_context(
                user_data_dir=str(self._profile_dir),
                headless=self.headless,
                user_agent=self.user_agent,
                viewport={"width": 1440, "height": 900},
                locale="fr-FR",
                timezone_id="Europe/Paris",
                # Mimic a real Chrome install
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ],
            )
        )
        logger.info("Browser launched (headless=%s)", self.headless)
        return self

    async def __aexit__(
        self,
        exc_type: type | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        """Close the browser and stop Playwright."""
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()
        logger.info("Browser closed.")

    # ── Public API ────────────────────────────────────────────────────────────

    async def get_page_content(self, url: str) -> str:
        """Fetch the full raw HTML of *url* with stealth mode active.

        Args:
            url: The page URL to visit.

        Returns:
            Raw HTML string of the rendered page.

        Raises:
            RuntimeError: If the scraper has not been entered as a context manager.
        """
        if not self._browser:
            msg = "BaseScraper must be used as 'async with BaseScraper() as s:'"
            raise RuntimeError(msg)

        page = await self._open_stealthy_page()
        try:
            await page.goto(
                url, wait_until="networkidle", timeout=settings.scraper_timeout_ms
            )
            await self._human_delay()
            return await page.content()
        finally:
            await page.close()

    async def get_cleaned_content(self, url: str, selector: str = "body") -> str:
        """Scrape *url*, extract *selector*, and return clean Markdown.

        Cloudflare detection is performed at two levels:
        1. Page title check immediately after load.
        2. HTML content check before passing to the LLM.

        Args:
            url: The page URL to scrape.
            selector: CSS selector for the element to extract.  Falls back to
                ``body`` if the selector is not found within the timeout.

        Returns:
            Cleaned Markdown string, or an empty string on failure / Cloudflare block.
        """
        page = await self._open_stealthy_page()
        try:
            logger.info("Navigating to %s", url)
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=settings.scraper_timeout_ms,
            )

            # Wait for the page to settle, then check for Cloudflare
            await self._human_delay(min_s=4, max_s=8)
            if await self._is_cloudflare_page(page):
                print("⏳ Cloudflare detected — waiting 15 s for auto-resolution…")
                logger.warning("Cloudflare challenge detected on %s", url)
                await asyncio.sleep(15)
                if await self._is_cloudflare_page(page):
                    print(
                        "❌ Cloudflare challenge not resolved. Aborting to protect LLM."
                    )
                    logger.error(
                        "Cloudflare not resolved for %s — returning empty.", url
                    )
                    return ""

            # Simulate human scrolling before extracting content
            await self._simulate_scroll(page)

            # Locate the target element
            resolved_selector = await self._resolve_selector(page, selector)
            element = await page.query_selector(resolved_selector)
            html = await element.inner_html() if element else await page.content()

            # Final safety check on the extracted HTML
            if any(pat in html for pat in _CF_PATTERNS):
                print("❌ Cloudflare JS detected in extracted HTML. Aborting.")
                logger.error("CF content in extracted HTML for %s.", url)
                return ""

            markdown = self._html_to_markdown(html)
            logger.info(
                "Extraction complete: %d chars of Markdown from %s", len(markdown), url
            )
            return markdown

        except Exception:
            logger.exception("Unexpected error scraping %s", url)
            return ""
        finally:
            await page.close()

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _open_stealthy_page(self) -> Page:
        """Open a new page and apply playwright-stealth patches.

        Returns:
            A :class:`playwright.async_api.Page` with stealth mode active.
        """
        page = await self._browser.new_page()
        await self.stealth.apply_stealth_async(page)
        return page

    async def _is_cloudflare_page(self, page: Page) -> bool:
        """Return ``True`` if the current page is a Cloudflare challenge.

        Args:
            page: The Playwright page to inspect.

        Returns:
            ``True`` when a Cloudflare challenge is detected.
        """
        title = await page.title()
        return any(pat in title for pat in ("Just a moment", "Cloudflare", "cf_chl"))

    async def _resolve_selector(self, page: Page, selector: str) -> str:
        """Try to find *selector* on the page, falling back to ``body``.

        Args:
            page: The Playwright page to search.
            selector: Preferred CSS selector.

        Returns:
            The selector to use — either the original or ``"body"``.
        """
        try:
            await page.wait_for_selector(selector, timeout=10_000)
            return selector
        except Exception:
            print(f"❌ Selector '{selector}' not found — falling back to body.")
            logger.warning("Selector '%s' not found, using body.", selector)
            return "body"

    async def _simulate_scroll(self, page: Page) -> None:
        """Scroll the page slowly to mimic human reading behaviour.

        Args:
            page: The Playwright page to scroll.
        """
        for distance in (300, 600, 900, 1200):
            await page.evaluate(f"window.scrollTo(0, {distance})")
            await asyncio.sleep(random.uniform(0.3, 0.8))  # noqa: S311

    @staticmethod
    async def _human_delay(min_s: float = 3.0, max_s: float = 6.0) -> None:
        """Sleep for a random duration to avoid bot-detection timing patterns.

        Args:
            min_s: Minimum sleep time in seconds.
            max_s: Maximum sleep time in seconds.
        """
        await asyncio.sleep(random.uniform(min_s, max_s))  # noqa: S311

    def _html_to_markdown(self, html_content: str) -> str:
        """Convert an HTML fragment to clean Markdown.

        Strips noise tags, collapses blank lines, and trims whitespace.

        Args:
            html_content: Raw HTML string to convert.

        Returns:
            Clean, LLM-ready Markdown string.
        """
        if not html_content:
            return ""

        raw = md(
            html_content,
            strip=_STRIP_TAGS,
            heading_style="ATX",
            bullets="-",
            ignore_images=True,
            ignore_links=True,
            ignore_tables=True,
            autolinks=True,
        ).strip()

        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        return "\n".join(lines)


if __name__ == "__main__":

    async def _smoke_test() -> None:
        """Quick smoke test: verify Google loads correctly."""
        async with BaseScraper(headless=False) as s:
            print("🚀 Browser launched with stealth mode…")
            content = await s.get_page_content("https://www.google.com")
            print(f"✅ Retrieved {len(content)} bytes.")
            if "Google" in content:
                print("🎯 Smoke test passed.")

    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(_smoke_test())
