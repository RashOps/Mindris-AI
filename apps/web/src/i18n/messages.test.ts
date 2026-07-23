import { describe, expect, test } from "bun:test";

import { en, fr, MESSAGES, resolveMessages } from "./messages";

function shape(value: unknown): unknown {
  if (typeof value === "string") return "string";
  if (!value || typeof value !== "object") return typeof value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, shape(nested)]),
  );
}

describe("i18n messages", () => {
  test("keeps French as the product default", () => {
    expect(MESSAGES.fr).toBe(fr);
    expect(fr.app.workspaceTitle).toBe("Espace de travail");
  });

  test("keeps English structurally aligned with French", () => {
    expect(shape(en)).toEqual(shape(fr));
  });

  test("falls back to French for unsupported or missing locales", () => {
    expect(resolveMessages("de")).toBe(fr);
    expect(resolveMessages(undefined)).toBe(fr);
    expect(resolveMessages("en")).toBe(en);
  });
});
