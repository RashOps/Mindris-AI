import { describe, expect, test } from "bun:test";

import { buildRendererApp } from "./app";
import type { RendererLogEntry, RendererLogger } from "./logger";

describe("renderer app logging", () => {
    test("emits a structured completion log for a handled request", async () => {
        const entries: RendererLogEntry[] = [];
        const logger: RendererLogger = {
            log(entry) {
                entries.push(entry);
                return Promise.resolve();
            },
        };

        const app = buildRendererApp("http://localhost:4000", { logger });
        const response = await app.handle(
            new Request("http://localhost:4000/ready"),
        );

        expect(response.status).toBe(200);
        expect(entries.some((entry) =>
            entry.event === "request.completed"
            && entry.route === "/ready"
            && entry.method === "GET"
            && entry.status === 200
            && typeof entry.duration_ms === "number")).toBe(true);
    });
});
