import { describe, expect, test } from "bun:test";

import { GUIDE_SECTIONS } from "./guide-content";

describe("guide content", () => {
  test("documents the local-first client-only boundary", () => {
    const boundary = GUIDE_SECTIONS.find((section) => section.title === "Frontière client/serveur");

    expect(Boolean(boundary)).toBe(true);
    expect(boundary?.items.some((item) => item.includes("Le code navigateur ne doit pas devenir une couche de service cachée"))).toBe(true);
    expect(boundary?.items.some((item) => item.includes("frontière loopback"))).toBe(true);
    expect(boundary?.items.some((item) => item.includes("X-API-Key"))).toBe(true);
  });

  test("describes configuration by the shipped operator sections", () => {
    const runtime = GUIDE_SECTIONS.find((section) => section.title === "5. Configurer le runtime");

    expect(Boolean(runtime)).toBe(true);
    expect(runtime?.items[0]).toContain("defaults par tâche");
    expect(runtime?.items[0]).toContain("slots de secrets");
  });

  test("adds actionable checklists to every guide section", () => {
    expect(GUIDE_SECTIONS.every((section) => section.checklist.length >= 3)).toBe(true);
  });
});
