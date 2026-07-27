import { readFileSync } from "fs";
import { join } from "path";

import { resolveTemplateContract } from "./contracts";

const TEMPLATE_STYLES: Record<string, string[]> = {
  modern: ["modern"],
  "atlas-sidebar": ["modern", "atlas-sidebar"],
  compact: ["compact"],
  ats: ["ats"],
  student: ["student"],
  creative: ["creative"],
  ledger: ["modern", "ledger"],
  executive: ["modern", "executive"],
  signal: ["compact", "signal"],
  scholar: ["student", "scholar"],
};

export const dynamicSectionCss = readFileSync(
  join(import.meta.dir, "styles", "dynamic.css"),
  "utf-8",
);

export function resolveTemplateAssets(requestedTemplate: string): {
  activeTemplate: string;
  css: string;
} {
  resolveTemplateContract(requestedTemplate);
  const activeTemplate = requestedTemplate;
  const activeStyles = TEMPLATE_STYLES[activeTemplate] ?? ["modern"];

  try {
    const css = activeStyles
      .map((styleId) =>
        readFileSync(
          join(import.meta.dir, "styles", `${styleId}.css`),
          "utf-8",
        ),
      )
      .join("\n\n");
    return {
      activeTemplate,
      css: `${css}\n\n/* template-id: ${activeTemplate} */`,
    };
  } catch (error) {
    throw new Error(
      `Stylesheet for registered template "${activeTemplate}" could not be loaded: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
