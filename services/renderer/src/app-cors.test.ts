import { describe, expect, test } from "bun:test";

import { buildRendererApp } from "./app";

describe("renderer CORS", () => {
    test.each([
        "http://localhost:3000",
        "http://localhost:3100",
        "http://127.0.0.1:4173",
    ])("allows loopback browser origin %s", async (origin) => {
        const response = await buildRendererApp().handle(
            new Request("http://localhost:4000/ready", {
                headers: { Origin: origin },
            }),
        );

        expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    });

    test("does not allow an untrusted remote origin", async () => {
        const response = await buildRendererApp().handle(
            new Request("http://localhost:4000/ready", {
                headers: { Origin: "https://example.com" },
            }),
        );

        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });
});
