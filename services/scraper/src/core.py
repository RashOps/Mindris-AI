"""
Base class for all scrapers in the project.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

# user agent for different os
USER_AGENT_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"
USER_AGENT_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
USER_AGENT_LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36"

class BaseScraper:
    """
    Base scraper class for all scrapers in the project.
    """

    def __init__(self, headless: bool = True):
        """
        Initialize the base scraper.
        """
        self.headless = headless
        self.browser = None
        self.page = None
        self.user_agent = None

    async def __aenter__(self):
        """
        Async context manager for the scraper.
        """
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=self.headless)
        self.context = await self.browser.launch_persistent_context(
            user_data_dir=Path.home() / "projects/mindris-ai/services/scraper/storage/auth_state.json",
            channel="chromium",
            viewport=None,
            user_agent=self.user_agent
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Async context manager exit.
        """
        await self.browser.close()
        await self.pw.stop()

    async def get_page_content(self, url: str):
        """
        Get the page content for a given URL.
        """
        page = await self.context.new_page()

        await stealth_async(page)
        await page.goto(url, wait_until="networkidle")
        
        await asyncio.sleep(2)
        return await page.content()

    def set_user_agent(self, user_agent: str):
        """
        Set the user agent for the scraper.
        """
        self.user_agent = user_agent

if __name__ == "__main__":
    async def main():
        scraper = BaseScraper(headless=False)
        scraper.set_user_agent(USER_AGENT_LINUX)
        
        async with scraper as s:
            print("🚀 Browser launched...")
            content = await s.get_page_content("https://www.google.com")
            print(f"✅ Content length: {len(content)}")
            if "Google" in content:
                print("🎯 Test réussi : Google est bien chargé.")

    asyncio.run(main())