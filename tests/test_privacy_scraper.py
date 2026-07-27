"""Local-strict scraping never falls back to cloud proxy providers."""

from __future__ import annotations

import pytest
from scraper.proxy_scraper import ScrapeDoProvider, ScrapingBeeProvider
from scraper.smart_scraper import SmartScraper


def test_local_strict_forces_local_playwright_strategy(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "scraper.smart_scraper.load_runtime_configuration",
        lambda: {"privacy_mode": "local_strict"},
    )
    scraper = SmartScraper(strategy="proxy_first")
    assert scraper._strategy == "playwright_only"  # noqa: SLF001
    assert scraper._fallback_enabled is False  # noqa: SLF001


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", [ScrapeDoProvider(), ScrapingBeeProvider()])
async def test_cloud_proxy_rejects_private_target_before_reading_secret(
    provider,
) -> None:
    with pytest.raises(ValueError, match="private_network"):
        await provider.fetch("http://127.0.0.1/private")
