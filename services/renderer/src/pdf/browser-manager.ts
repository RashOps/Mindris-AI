import puppeteer, { type Browser, type Page } from "puppeteer";

type BrowserManagerStatus = {
    ready: boolean;
    activePages: number;
    maxConcurrentPages: number;
};

type BrowserManagerOptions = {
    maxConcurrentPages?: number;
    renderTimeoutMs?: number;
};

const DEFAULT_MAX_CONCURRENT_PAGES = 2;
const DEFAULT_RENDER_TIMEOUT_MS = 45_000;

function positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class BrowserManager {
    private browser: Browser | null = null;
    private launchPromise: Promise<Browser> | null = null;
    private activePages = 0;
    private readonly maxConcurrentPages: number;
    private readonly renderTimeoutMs: number;

    constructor(options: BrowserManagerOptions = {}) {
        this.maxConcurrentPages = options.maxConcurrentPages
            ?? positiveInteger(
                process.env.RENDERER_MAX_CONCURRENT_PAGES,
                DEFAULT_MAX_CONCURRENT_PAGES,
            );
        this.renderTimeoutMs = options.renderTimeoutMs
            ?? positiveInteger(
                process.env.RENDERER_RENDER_TIMEOUT_MS,
                DEFAULT_RENDER_TIMEOUT_MS,
            );
    }

    status(): BrowserManagerStatus {
        return {
            ready: this.browser?.connected === true,
            activePages: this.activePages,
            maxConcurrentPages: this.maxConcurrentPages,
        };
    }

    async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
        await this.waitForPageSlot();
        this.activePages += 1;

        const browser = await this.getBrowser();
        const page = await browser.newPage();
        page.setDefaultTimeout(this.renderTimeoutMs);
        page.setDefaultNavigationTimeout(this.renderTimeoutMs);

        try {
            return await callback(page);
        } finally {
            await page.close().catch(() => undefined);
            this.activePages = Math.max(0, this.activePages - 1);
        }
    }

    async close(): Promise<void> {
        const browser = this.browser;
        this.browser = null;
        this.launchPromise = null;
        if (browser?.connected) {
            await browser.close().catch(() => undefined);
        }
    }

    private async getBrowser(): Promise<Browser> {
        if (this.browser?.connected) {
            return this.browser;
        }

        if (!this.launchPromise) {
            this.launchPromise = puppeteer.launch({
                headless: true,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
            }).then((browser) => {
                this.browser = browser;
                this.launchPromise = null;
                browser.on("disconnected", () => {
                    if (this.browser === browser) {
                        this.browser = null;
                    }
                });
                return browser;
            }).catch((error) => {
                this.launchPromise = null;
                this.browser = null;
                throw error;
            });
        }

        return this.launchPromise;
    }

    private async waitForPageSlot(): Promise<void> {
        while (this.activePages >= this.maxConcurrentPages) {
            await Bun.sleep(25);
        }
    }
}

const browserManager = new BrowserManager();

export function getBrowserManager(): BrowserManager {
    return browserManager;
}
