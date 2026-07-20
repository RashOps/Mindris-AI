import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { STYLE_TABS } from "./StylePanel";
import { TemplatePreview } from "./style-panel/visual-controls";
import { FALLBACK_CUSTOMIZATION_CATALOGUE, buildTemplateCards } from "@/lib/customization-catalogue";

describe("StylePanel tabs", () => {
  for (const label of ["Document", "Modèles"]) {
    test(`renders the ${label} icon as an SVG`, () => {
      const tab = STYLE_TABS.find((item) => item.label === label);
      expect(Boolean(tab)).toBe(true);

      const markup = renderToStaticMarkup(
        createElement(tab!.icon, { "aria-hidden": true }),
      );
      expect(markup).toContain("<svg");
      expect(markup).toContain('aria-hidden="true"');
    });
  }

  test("renders a distinct code-native preview for every built-in template", () => {
    const previews = buildTemplateCards(FALLBACK_CUSTOMIZATION_CATALOGUE).map(
      (template) =>
        renderToStaticMarkup(
          createElement(TemplatePreview, {
            style: template.previewStyle,
            accent: template.accent,
          }),
        ),
    );

    expect(previews.length).toBe(10);
    expect(new Set(previews).size).toBe(10);
  });
});
