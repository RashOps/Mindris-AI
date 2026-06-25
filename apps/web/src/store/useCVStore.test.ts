import { describe, expect, test } from "bun:test";
import { normalizeCVData } from "./useCVStore";

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
});
