import { describe, expect, test } from "bun:test";

import { BrowserManager } from "./browser-manager";

describe("BrowserManager", () => {
    test("releases its concurrency slot when browser launch fails", async () => {
        const manager = new BrowserManager({
            maxConcurrentPages: 1,
            launchBrowser: async () => {
                throw new Error("browser unavailable");
            },
        });

        await expect(manager.withPage(async () => undefined)).rejects.toThrow(
            "browser unavailable",
        );

        expect(manager.status()).toEqual({
            ready: false,
            activePages: 0,
            maxConcurrentPages: 1,
        });
    });
});
