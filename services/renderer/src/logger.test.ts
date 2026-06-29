import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createRendererLogger } from "./logger";

let tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
});

describe("renderer logger", () => {
    test("writes structured JSON lines to the target file", async () => {
        const dir = await mkdtemp(join(tmpdir(), "mindris-renderer-log-"));
        tempDirs.push(dir);
        const logPath = join(dir, "renderer.log");
        const logger = createRendererLogger({ logPath });

        await logger.log({
            level: "info",
            event: "request.completed",
            message: "Request served",
            route: "/ready",
            method: "GET",
            status: 200,
            duration_ms: 12,
        });

        const line = (await readFile(logPath, "utf8")).trim();
        const parsed = JSON.parse(line);

        expect(parsed.service).toBe("renderer");
        expect(parsed.event).toBe("request.completed");
        expect(parsed.route).toBe("/ready");
        expect(parsed.method).toBe("GET");
        expect(parsed.status).toBe(200);
        expect(parsed.duration_ms).toBe(12);
        expect(typeof parsed.timestamp).toBe("string");
    });
});
