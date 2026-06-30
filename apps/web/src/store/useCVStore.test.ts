import { describe, expect, test } from "bun:test";
import { normalizeAppSettings, normalizeCVData } from "./useCVStore";
import { mergeSections } from "../components/StylePanel";
import { FALLBACK_CUSTOMIZATION_CATALOGUE } from "../lib/customization-catalogue";

describe("useCVStore normalization", () => {
  test("fills missing advanced section arrays from partial CV data", () => {
    const normalized = normalizeCVData({
      profile: {
        full_name: "Ada Lovelace",
        title: "Engineer",
        phone: "",
        email: "ada@example.com",
        location: { city: "Paris", country: "France" },
        socials: [],
        text_markdown: "",
      },
      global_settings: { template_id: "modern" } as never,
      experience: [],
    });

    expect(normalized.certifications).toEqual([]);
    expect(normalized.volunteering).toEqual([]);
    expect(normalized.publications).toEqual([]);
    expect(normalized.references).toEqual([]);
    expect(normalized.custom_sections).toEqual([]);
    expect(normalized.languages).toEqual([]);
    expect(normalized.hobbies).toEqual([]);
  });

  test("normalizes partial app settings and rejects invalid providers", () => {
    if ("localStorage" in globalThis) {
      globalThis.localStorage.clear();
    }
    const normalized = normalizeAppSettings({
      optimize_llm: { provider: "ollama", model_name: "llama3.2" },
      cover_letter_llm: { provider: "bad-provider", model_name: "x" },
    });

    expect(normalized.optimize_llm.provider).toBe("ollama");
    expect(normalized.optimize_llm.model_name).toBe("llama3.2");
    expect(normalized.cover_letter_llm.provider).toBe("groq");
    expect(normalized.cover_letter_llm.model_name).toBe("llama-3.3-70b-versatile");
    expect(normalized.ats_llm.provider).toBe("groq");
    expect(normalized.pdf_ingestion_mode).toBe("auto");
  });

  test("preserves customized section order when merging with catalogue defaults", () => {
    const merged = mergeSections(
      {
        sections: [
          { id: "profile", type: "profile", label: "Profil" },
          { id: "projects", type: "projects", label: "Projets" },
          { id: "experience", type: "experience", label: "Parcours professionnel" },
        ],
      },
      FALLBACK_CUSTOMIZATION_CATALOGUE,
    );

    expect(merged[0]?.type).toBe("profile");
    expect(merged[1]?.type).toBe("projects");
    expect(merged[2]?.type).toBe("experience");
  });

  test("normalizes advanced css settings and warnings from partial CV data", () => {
    const normalized = normalizeCVData({
      profile: {
        full_name: "Ada Lovelace",
        title: "Engineer",
        phone: "",
        email: "ada@example.com",
        location: { city: "Paris", country: "France" },
        socials: [],
        text_markdown: "",
      },
      global_settings: {
        template_id: "modern",
        advanced_css: {
          enabled: true,
          mode: "css_patch",
          css_text: ".section-title { color: #0f766e; }",
        },
      } as never,
      experience: [],
    });

    expect(normalized.global_settings.advanced_css?.enabled).toBe(true);
    expect(normalized.global_settings.advanced_css?.mode).toBe("css_patch");
    expect(normalized.global_settings.advanced_css?.warnings).toEqual([]);
  });
});
