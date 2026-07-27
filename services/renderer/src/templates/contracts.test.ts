import { describe, expect, test } from "bun:test";

import {
  PUBLIC_CV_SELECTORS,
  RENDERER_ENGINE_VERSION,
  RENDER_MANIFEST_VERSION,
  SELECTOR_CONTRACT_VERSION,
  TEMPLATE_CONTRACTS,
  TEMPLATE_CONTRACT_VERSION,
  TemplateContractError,
  resolveTemplateContract,
} from "./contracts";
import { generateHtml } from "./engine";
import { photoCvFixture } from "./fixtures";

describe("renderer public contracts", () => {
  test("versions all ten built-in templates", () => {
    expect(Object.keys(TEMPLATE_CONTRACTS)).toHaveLength(10);
    for (const contract of Object.values(TEMPLATE_CONTRACTS)) {
      expect(contract.engineVersion).toBe(RENDERER_ENGINE_VERSION);
      expect(contract.templateContractVersion).toBe(
        TEMPLATE_CONTRACT_VERSION,
      );
      expect(contract.selectorContractVersion).toBe(
        SELECTOR_CONTRACT_VERSION,
      );
      expect(contract.capabilities.columns.length).toBeGreaterThan(0);
    }
    expect(RENDER_MANIFEST_VERSION).toBe("1");
  });

  test("publishes semantic selectors instead of internal classes", () => {
    expect(PUBLIC_CV_SELECTORS).toContain('[data-cv-role="document"]');
    expect(PUBLIC_CV_SELECTORS).toContain('[data-cv-role="section"]');
    expect(PUBLIC_CV_SELECTORS.every((selector) => !selector.startsWith("."))).toBe(
      true,
    );
  });

  test("renders every published role through the versioned HTML contract", () => {
    const cvData = structuredClone(photoCvFixture) as any;
    cvData.global_settings.sections.push({
      id: "projects",
      type: "projects",
      label: "Projets",
      placement: "main",
    });
    cvData.projects = [
      {
        id: "project-1",
        name: "Renderer contract",
        url: "https://example.com",
        description_markdown: "Contrat observable.",
        tech_stack: ["Bun"],
      },
    ];
    const html = generateHtml(cvData, "modern");
    for (const selector of PUBLIC_CV_SELECTORS) {
      expect(html).toContain(selector.slice(1, -1));
    }
  });

  test("rejects unknown templates instead of silently falling back", () => {
    expect(() => resolveTemplateContract("missing-template")).toThrow(
      TemplateContractError,
    );
  });
});
