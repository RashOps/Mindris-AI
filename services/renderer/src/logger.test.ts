import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { createRendererLogger, resolveRendererLogPath } from "./logger";

let tempDirs: string[] = [];

afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs = [];
});

describe("renderer logger", () => {
    test("resolves the canonical service path from LOGS_DIR", () => {
        const path = resolveRendererLogPath({ logsDir: "/tmp/mindris-logs" });

        expect(path).toBe("/tmp/mindris-logs/services/renderer.log");
    });

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

    test("rotates bounded log backups", async () => {
        const dir = await mkdtemp(join(tmpdir(), "mindris-renderer-rotation-"));
        tempDirs.push(dir);
        const logPath = join(dir, "services", "renderer.log");
        const logger = createRendererLogger({
            logPath,
            maxBytes: 180,
            backupCount: 2,
        });

        for (let index = 0; index < 5; index += 1) {
            await logger.log({
                level: "info",
                event: "rotation.test",
                message: `record-${index}-${"x".repeat(80)}`,
            });
        }

        expect(await readFile(logPath, "utf8")).toContain("record-4");
        expect(await readFile(`${logPath}.1`, "utf8")).toContain("record-3");
    });
});
