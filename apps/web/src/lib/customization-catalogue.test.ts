import { describe, expect, test } from "bun:test";
import {
  buildTemplateCards,
  type CustomizationCatalogue,
  normalizeCustomizationCatalogue,
  resolveCustomizationOptionLists,
} from "./customization-catalogue";

describe("customization catalogue helpers", () => {
  test("normalize backend catalogue and derive UI option lists", () => {
    const source: Partial<CustomizationCatalogue> = {
      typography: {
        bodyFonts: ["Inter", "Merriweather"],
        headingFonts: ["Lato"],
      } as unknown as CustomizationCatalogue["typography"],
      templates: {
        modern: { compatibleLayouts: [1, 2] },
        ats: {
          compatibleLayouts: [1],
          enforced: {
            layout: { columns: 1, sidebar_position: "none" },
          },
        },
      } as unknown as CustomizationCatalogue["templates"],
      sections: {
        types: ["profile", "experience", "certifications"],
        placements: ["main", "sidebar"],
      } as unknown as CustomizationCatalogue["sections"],
    };

    const catalogue = normalizeCustomizationCatalogue(source);

    const options = resolveCustomizationOptionLists(catalogue);
    const templates = buildTemplateCards(catalogue);

    expect(options.fonts).toEqual(["Inter", "Merriweather"]);
    expect(options.headingFonts).toEqual(["Lato"]);
    expect(options.sectionTypes).toContain("certifications");
    expect(templates.find((template) => template.id === "ats")?.compatibleLayouts).toEqual([1]);
    expect(templates.find((template) => template.id === "ats")?.enforced?.layout?.columns).toBe(1);
  });
});
