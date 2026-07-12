import { describe, expect, test } from "bun:test";

import { GUIDE_SECTIONS } from "./guide-content";

describe("guide content", () => {
  test("documents the local-first client-only boundary", () => {
    const boundary = GUIDE_SECTIONS.find((section) => section.title === "Client and server boundary");

    expect(Boolean(boundary)).toBe(true);
    expect(boundary?.items.some((item) => item.includes("Browser code must not become a service layer"))).toBe(true);
    expect(boundary?.items.some((item) => item.includes("loopback runtime boundary"))).toBe(true);
    expect(boundary?.items.some((item) => item.includes("X-API-Key"))).toBe(true);
  });

  test("describes configuration by the shipped operator sections", () => {
    const runtime = GUIDE_SECTIONS.find((section) => section.title === "4. Operate the runtime");

    expect(Boolean(runtime)).toBe(true);
    expect(runtime?.items[0]).toContain("task defaults");
    expect(runtime?.items[0]).toContain("write-only secret slots");
  });
});
