import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { STYLE_TABS } from "./StylePanel";

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
});
