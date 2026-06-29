import { describe, expect, test } from "bun:test";

import { buildRendererApp } from "./app";

describe("renderer monitoring", () => {
    test("serves runtime metrics with readiness and request counters", async () => {
        const app = buildRendererApp("http://localhost:4000");

        await app.handle(new Request("http://localhost:4000/ready"));
        const response = await app.handle(
            new Request("http://localhost:4000/metrics"),
        );
        const payload = await response.json() as {
            status: string;
            service: string;
            readiness: { status: string };
            requests: { total_count: number; routes: Record<string, unknown> };
            render: { failures: { total_count: number } };
        };

        expect(response.status).toBe(200);
        expect(payload.status).toBe("success");
        expect(payload.service).toBe("renderer");
        expect(payload.readiness.status).toBe("ready");
        expect(payload.requests.total_count).toBeGreaterThanOrEqual(1);
        expect(Object.keys(payload.requests.routes).length).toBeGreaterThan(0);
        expect(payload.render.failures.total_count).toBeGreaterThanOrEqual(0);
    });
});
