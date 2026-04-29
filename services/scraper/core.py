"""
Base class for all scrapers in the project.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

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
        self.pw = None
        self.context = None
        self.user_agent = USER_AGENT_LINUX
        self.stealth = Stealth()
        
        # Calcul du chemin de stockage relatif à la racine du projet
        current_file = Path(__file__).resolve()
        # Structure : services/scraper/core.py -> 2 parents pour remonter à mindris-ai
        self.project_root = current_file.parents[2]
        self.storage_dir = self.project_root / "services" / "scraper" / "storage"

    async def __aenter__(self):
        """
        Async context manager for the scraper.
        """
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.pw = await async_playwright().start()
        
        # Lancement du contexte persistant (lance automatiquement le navigateur)
        self.context = await self.pw.chromium.launch_persistent_context(
            user_data_dir=str(self.storage_dir),
            headless=self.headless,
            user_agent=self.user_agent,
            viewport={'width': 1280, 'height': 720}
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """
        Async context manager exit.
        """
        if self.context:
            await self.context.close()
        if self.pw:
            await self.pw.stop()

    async def get_page_content(self, url: str):
        """
        Get the page content for a given URL.
        """
        if not self.context:
            raise RuntimeError("Scraper must be used as an async context manager (async with)")

        page = await self.context.new_page()

        # Application du mode furtif (stealth)
        await self.stealth.apply_stealth_async(page)
        
        await page.goto(url, wait_until="networkidle")
        
        # Petit délai pour laisser les scripts se charger
        await asyncio.sleep(2)
        
        content = await page.content()
        await page.close()
        return content

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
            print("🚀 Navigateur lancé avec le mode stealth...")
            content = await s.get_page_content("https://www.google.com")
            print(f"✅ Taille du contenu récupéré : {len(content)} octets")
            if "Google" in content:
                print("🎯 Test réussi : Google est bien chargé.")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass