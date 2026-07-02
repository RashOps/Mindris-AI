import { describe, expect, test } from "bun:test";
import {
  normalizeAtsReport,
  normalizeAppSettings,
  normalizeCVData,
  normalizeResumeDocument,
  systemConfigurationToAppSettings,
} from "./useCVStore";
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

  test("maps backend system configuration into frontend app settings", () => {
    const mapped = systemConfigurationToAppSettings({
      app: {
        defaults: {
          optimize: { provider: "ollama", model_name: "llama3.2" },
          cover_letter: { provider: "groq", model_name: "llama-3.3-70b-versatile" },
          ats_score: { provider: "openai", model_name: "gpt-4o-mini" },
          patch: { provider: "mistral", model_name: "mistral-small-latest" },
        },
        pdf_ingestion_mode: "local_text",
      },
    });

    expect(mapped.optimize_llm).toEqual({ provider: "ollama", model_name: "llama3.2" });
    expect(mapped.ats_llm).toEqual({ provider: "openai", model_name: "gpt-4o-mini" });
    expect(mapped.patch_llm).toEqual({ provider: "mistral", model_name: "mistral-small-latest" });
    expect(mapped.pdf_ingestion_mode).toBe("local_text");
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

  test("normalizes ATS report transparency metadata from partial payloads", () => {
    const normalized = normalizeAtsReport({
      score: 74,
      summary: "Strong fit with a few gaps.",
      scoring_breakdown: [],
      keyword_analysis: [],
      recommendations: [],
      deductions: [{ code: "missing_sql", title: "SQL missing", points_lost: 8 }],
      context: { job_company: "Mindris" },
    } as never);

    expect(normalized.mode).toBe("standard");
    expect(normalized.rubric.version).toBe("ats-v1");
    expect(normalized.deductions[0]?.severity).toBe("medium");
    expect(normalized.context.job_company).toBe("Mindris");
  });

  test("normalizes legacy resume documents into multilingual metadata", () => {
    const normalized = normalizeResumeDocument({
      id: "resume-1",
      name: "Ada Resume",
      templateId: "modern",
      locale: "fr",
      cvData: {
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
      },
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
    } as never);

    expect(normalized.locale).toBe("fr");
    expect(normalized.multilingual).toEqual({
      defaultLocale: "fr",
      activeLocale: "fr",
      availableLocales: ["fr"],
    });
  });
});
