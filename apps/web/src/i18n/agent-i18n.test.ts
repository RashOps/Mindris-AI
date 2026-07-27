import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { resolveMessages } from "./messages";

describe("agent journey i18n contract", () => {
  test("keeps the FR and EN review/status structures aligned", () => {
    const fr = resolveMessages("fr").agent;
    const en = resolveMessages("en").agent;

    expect(Object.keys(fr.statuses).sort()).toEqual(
      Object.keys(en.statuses).sort(),
    );
    expect(Object.keys(fr.review).sort()).toEqual(Object.keys(en.review).sort());
    expect(fr.review.noImplicitCommit).toContain("validation");
    expect(en.review.noImplicitCommit).toContain("approval");
  });

  test("migrated components do not reintroduce legacy direct status copy", async () => {
    const ghostMode = await readFile(
      new URL("../components/GhostMode.tsx", import.meta.url),
      "utf8",
    );
    const reviewPanel = await readFile(
      new URL("../components/JobInsightsPanel.tsx", import.meta.url),
      "utf8",
    );

    expect(ghostMode.includes("Lost connection to the pipeline.")).toBe(false);
    expect(ghostMode.includes("Waiting for a job URL")).toBe(false);
    expect(reviewPanel.includes("Deep Score my CV")).toBe(false);
    expect(reviewPanel.includes("Backend-owned patch configuration")).toBe(
      false,
    );
  });
});
