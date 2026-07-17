import { describe, expect, test } from "bun:test";

import { providerConfigured, resolveProviderList, taskLabel } from "./helpers";

describe("settings helpers", () => {
  test("formats backend task keys into readable labels", () => {
    expect(taskLabel("ats_score")).toBe("Ats Score");
    expect(taskLabel("cover_letter")).toBe("Cover Letter");
  });

  test("falls back to the supported default provider list", () => {
    expect(resolveProviderList({})).toEqual(["groq", "gemini", "openai", "mistral", "ollama"]);
  });

  test("prefers configured catalogue providers when available", () => {
    expect(resolveProviderList({ ollama: [], openai: [] })).toEqual(["ollama", "openai"]);
  });

  test("treats missing provider status as usable and explicit false as unavailable", () => {
    expect(providerConfigured({}, "ollama")).toBe(true);
    expect(providerConfigured({ openai: { configured: false, mode: "cloud", reason: "missing" } }, "openai")).toBe(false);
  });
});
