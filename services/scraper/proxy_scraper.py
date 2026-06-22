"""Cloud proxy scraping providers for Mindris AI.

Provides two async provider classes that call external scraping APIs
(Scrape.do and ScrapingBee) via ``httpx`` — no browser required.
Each provider returns clean Markdown identical in format to
:meth:`scraper.core.BaseScraper.get_cleaned_content`.

These classes are consumed by :class:`scraper.smart_scraper.SmartScraper`
and should **never** be used directly in application code.
"""


import httpx
from markdownify import markdownify as md
from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

# ── Shared HTML-to-Markdown helper ────────────────────────────────────────────

_STRIP_TAGS = [
    "script", "style", "nav", "footer", "header",
    "aside", "form", "svg", "noscript", "iframe", "button", "img",
]

# Cloudflare challenge fingerprints — same list as core.py
_CF_PATTERNS = ("cf_chl_opt", "Just a moment", "cf-challenge", "cf_clearance")


def _html_to_markdown(html: str) -> str:
    """Convert raw HTML to clean LLM-ready Markdown.

    Args:
        html: Raw HTML string from a proxy provider response.

    Returns:
        Stripped, deduplicated Markdown string.
    """
    if not html:
        return ""
    raw = md(
        html,
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


def _check_cloudflare(content: str) -> bool:
    """Return True if the content still contains a Cloudflare challenge.

    Args:
        content: Raw HTML or Markdown returned by a provider.

    Returns:
        ``True`` when a CF fingerprint is detected.
    """
    return any(pat in content for pat in _CF_PATTERNS)


# ── Scrape.do provider ────────────────────────────────────────────────────────

class ScrapeDoProvider:
    """Fetch pages via the Scrape.do API (JS rendering, geo-targeting).

    Scrape.do documentation: https://scrape.do/documentation/

    Example::

        provider = ScrapeDoProvider()
        markdown = await provider.fetch("https://example.com/job")
    """

    BASE_URL = "https://api.scrape.do/"
    TIMEOUT_S = 90  # Scrape.do JS render can take up to 60 s

    async def fetch(self, url: str) -> str:
        """Fetch *url* via Scrape.do and return clean Markdown.

        Args:
            url: The target page URL.

        Returns:
            Clean Markdown string, or empty string on failure / CF block.

        Raises:
            httpx.HTTPStatusError: When the API returns a non-2xx status.
            ValueError: When SCRAPE_DO_API key is not configured.
        """
        if not settings.scrape_do_api_key:
            raise ValueError(
                "SCRAPE_DO_API is not set. Add it to your .env file."
            )

        api_key = settings.scrape_do_api_key.get_secret_value()
        params = {
            "token": api_key,
            "url": url,
            "render": "true",          # JavaScript rendering enabled
            "geoCode": "fr",           # French geo-targeting (relevant for job boards)
            "super": "false",          # Residential proxies only when truly needed
        }

        logger.info("🌐 [Scrape.do] Fetching %s", url)

        async with httpx.AsyncClient(timeout=self.TIMEOUT_S) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()

        html = response.text
        logger.debug(
            "[Scrape.do] Response: %d bytes, status %d",
            len(html), response.status_code,
        )

        if _check_cloudflare(html):
            logger.warning(
                "[Scrape.do] Cloudflare challenge detected in response for %s", url
            )
            return ""

        markdown = _html_to_markdown(html)
        logger.info(
            "✅ [Scrape.do] Extracted %d chars of Markdown from %s", len(markdown), url
        )
        return markdown


# ── ScrapingBee provider ──────────────────────────────────────────────────────

class ScrapingBeeProvider:
    """Fetch pages via the ScrapingBee API (stealth proxies, JS rendering).

    ScrapingBee documentation: https://www.scrapingbee.com/documentation/

    Example::

        provider = ScrapingBeeProvider()
        markdown = await provider.fetch("https://example.com/job")
    """

    BASE_URL = "https://app.scrapingbee.com/api/v1/"
    TIMEOUT_S = 90

    async def fetch(self, url: str) -> str:
        """Fetch *url* via ScrapingBee and return clean Markdown.

        Args:
            url: The target page URL.

        Returns:
            Clean Markdown string, or empty string on failure / CF block.

        Raises:
            httpx.HTTPStatusError: When the API returns a non-2xx status.
            ValueError: When SCRAPINGBEE_API key is not configured.
        """
        if not settings.scrapingbee_api_key:
            raise ValueError(
                "SCRAPINGBEE_API is not set. Add it to your .env file."
            )

        api_key = settings.scrapingbee_api_key.get_secret_value()
        params = {
            "api_key": api_key,
            "url": url,
            "render_js": "true",       # JavaScript rendering
            "wait": "2000",            # Wait 2 s for dynamic content
            "block_ads": "true",
            "stealth_proxy": "true",   # Residential stealth proxies
            "country_code": "fr",      # French IP (relevant for FR job boards)
            "premium_proxy": "false",  # Escalate to True only on repeated failures
        }

        logger.info("🐝 [ScrapingBee] Fetching %s", url)

        async with httpx.AsyncClient(timeout=self.TIMEOUT_S) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()

        html = response.text
        logger.debug(
            "[ScrapingBee] Response: %d bytes, status %d",
            len(html), response.status_code,
        )

        if _check_cloudflare(html):
            logger.warning(
                "[ScrapingBee] Cloudflare challenge detected in response for %s", url
            )
            return ""

        markdown = _html_to_markdown(html)
        logger.info(
            "✅ [ScrapingBee] Extracted %d chars of Markdown from %s",
            len(markdown),
            url,
        )
        return markdown
