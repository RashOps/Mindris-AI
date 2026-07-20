import { readFileSync } from "fs";
import { join } from "path";

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
  const activeTemplate = Object.hasOwn(TEMPLATE_STYLES, requestedTemplate)
    ? requestedTemplate
    : "modern";
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
  } catch {
    console.warn(
      `CSS not found for template "${activeTemplate}", using fallback.`,
    );
    return { activeTemplate, css: ":host { font-family: sans-serif; }" };
  }
}
