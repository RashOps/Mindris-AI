import { apiUrl, jsonHeaders } from "@/lib/api";

type PresetMargin = { horizontal: string; vertical: string };

type RangeSpec = { min: number; max: number; unit: string; step?: number };

type TemplateEnforcement = {
  layout?: { columns?: 1 | 2; sidebar_position?: "none" | "left" | "right" };
  photo?: { enabled?: boolean };
  colors?: { monochrome?: boolean };
  typography?: { bullet_style?: "bullets" | "dash" | "dots" | "icons" };
};

export type CustomizationCatalogue = {
  schemaVersion: string;
  page: {
    formats: string[];
    pageBreakModes: string[];
    margins: {
      presets: Record<string, PresetMargin>;
      range: RangeSpec;
    };
  };
  layout: {
    columns: number[];
    sidebarPositions: string[];
    sidebarWidth: {
      presets: string[];
      range: RangeSpec;
    };
    densities: string[];
    headerAlignments: string[];
    photo: {
      enabled: boolean[];
      shapes: string[];
    };
    placements: string[];
  };
  typography: {
    bodyFonts: string[];
    headingFonts: string[];
    baseSize: RangeSpec;
    headingScale: RangeSpec;
    weights: string[];
    capitalization: string[];
    lineHeights: string[];
    dateStyles: string[];
    bulletStyles: string[];
  };
  colors: {
    palettePresets: string[];
    editable: string[];
    accentTargets: string[];
    monochrome: boolean[];
    minimumContrast: number;
  };
  sections: {
    types: string[];
    displayModes: string[];
    detailLevels: string[];
    headingStyles: string[];
    headingCapitalization: string[];
    titleSubtitleOrders: string[];
    dateLocationPositions: string[];
    skillStyles: string[];
    toggles: string[];
    placements: string[];
  };
  locale: {
    languages: string[];
    directions: string[];
  };
  advancedCss: {
    enabled: boolean;
    maxLength: number;
    modes: string[];
    allowedScopes: string[];
    blockedAtRules: string[];
    blockedFunctions: string[];
    examples: string[];
  };
  templates: Record<
    string,
    {
      compatibleLayouts: number[];
      enforced?: TemplateEnforcement;
    }
  >;
};

export type TemplateCard = {
  id: string;
  label: string;
  compatibleLayouts: number[];
  enforced?: TemplateEnforcement;
};

export const FALLBACK_CUSTOMIZATION_CATALOGUE: CustomizationCatalogue = {
  schemaVersion: "2",
  page: {
    formats: ["A4", "Letter"],
    pageBreakModes: ["auto", "manual"],
    margins: {
      presets: {
        small: { horizontal: "32px", vertical: "28px" },
        normal: { horizontal: "64px", vertical: "48px" },
        large: { horizontal: "80px", vertical: "64px" },
      },
      range: { min: 16, max: 96, unit: "px" },
    },
  },
  layout: {
    columns: [1, 2],
    sidebarPositions: ["none", "left", "right"],
    sidebarWidth: {
      presets: ["25%", "30%", "35%"],
      range: { min: 20, max: 70, unit: "%" },
    },
    densities: ["student", "compact", "normal", "senior"],
    headerAlignments: ["left", "center", "right"],
    photo: {
      enabled: [true, false],
      shapes: ["round", "square"],
    },
    placements: ["main", "sidebar"],
  },
  typography: {
    bodyFonts: ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
    headingFonts: ["Inter", "Roboto", "Lato", "Merriweather", "DM Sans"],
    baseSize: { min: 9, max: 14, unit: "px" },
    headingScale: { min: 1.0, max: 1.6, step: 0.05, unit: "" },
    weights: ["regular", "medium", "bold"],
    capitalization: ["normal", "uppercase"],
    lineHeights: ["1.25", "1.35", "1.5", "1.65"],
    dateStyles: ["normal", "italic", "small", "right"],
    bulletStyles: ["bullets", "dash", "dots", "icons"],
  },
  colors: {
    palettePresets: ["corporate", "tech", "minimal", "creative", "custom"],
    editable: [
      "primary",
      "secondary",
      "text",
      "heading",
      "sidebar_background",
      "separators",
    ],
    accentTargets: ["name", "title", "headings", "dates", "links", "skills"],
    monochrome: [true, false],
    minimumContrast: 4.5,
  },
  sections: {
    types: [
      "experience",
      "education",
      "projects",
      "skills",
      "languages",
      "certifications",
      "volunteering",
      "interests",
      "publications",
      "references",
      "custom",
    ],
    displayModes: ["list", "timeline", "cards", "compact"],
    detailLevels: ["short", "normal", "detailed"],
    headingStyles: ["line", "plain", "box", "accent"],
    headingCapitalization: ["normal", "uppercase"],
    titleSubtitleOrders: ["title_first", "subtitle_first"],
    dateLocationPositions: ["inline", "right", "below"],
    skillStyles: ["tags", "plain", "bars"],
    toggles: ["visible", "show_dates", "show_locations", "page_break_before"],
    placements: ["main", "sidebar"],
  },
  locale: {
    languages: ["fr", "en", "de", "es"],
    directions: ["ltr", "rtl"],
  },
  advancedCss: {
    enabled: true,
    maxLength: 8000,
    modes: ["off", "tokens", "css_patch"],
    allowedScopes: [
      ":host",
      ".cv-shell",
      "[data-section]",
      "[data-section-type]",
      "[data-section-placement]",
    ],
    blockedAtRules: ["@import"],
    blockedFunctions: ["expression(", "javascript:", "url("],
    examples: [
      ":host { --primary-color: #0f172a; --heading-scale: 1.1; }",
      "[data-section-type='experience'] .section-title { color: #0f766e; }",
    ],
  },
  templates: {
    modern: { compatibleLayouts: [1, 2] },
    compact: { compatibleLayouts: [1, 2] },
    ats: {
      compatibleLayouts: [1],
      enforced: {
        layout: { columns: 1, sidebar_position: "none" },
        photo: { enabled: false },
        colors: { monochrome: true },
        typography: { bullet_style: "dash" },
      },
    },
    student: { compatibleLayouts: [1] },
    creative: { compatibleLayouts: [1, 2] },
  },
};

function copyArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : fallback;
}

function mergeRange(value: unknown, fallback: RangeSpec): RangeSpec {
  if (!value || typeof value !== "object") return fallback;
  return { ...fallback, ...(value as Partial<RangeSpec>) };
}

function mergeTemplates(
  value: unknown,
  fallback: CustomizationCatalogue["templates"],
): CustomizationCatalogue["templates"] {
  if (!value || typeof value !== "object") return fallback;
  const entries = value as CustomizationCatalogue["templates"];
  return { ...fallback, ...entries };
}

export function normalizeCustomizationCatalogue(
  value?: Partial<CustomizationCatalogue> | null,
): CustomizationCatalogue {
  if (!value || typeof value !== "object") return FALLBACK_CUSTOMIZATION_CATALOGUE;
  return {
    schemaVersion: value.schemaVersion ?? FALLBACK_CUSTOMIZATION_CATALOGUE.schemaVersion,
    page: {
      formats: copyArray(value.page?.formats, FALLBACK_CUSTOMIZATION_CATALOGUE.page.formats),
      pageBreakModes: copyArray(
        value.page?.pageBreakModes,
        FALLBACK_CUSTOMIZATION_CATALOGUE.page.pageBreakModes,
      ),
      margins: {
        presets: {
          ...FALLBACK_CUSTOMIZATION_CATALOGUE.page.margins.presets,
          ...(value.page?.margins?.presets ?? {}),
        },
        range: mergeRange(
          value.page?.margins?.range,
          FALLBACK_CUSTOMIZATION_CATALOGUE.page.margins.range,
        ),
      },
    },
    layout: {
      columns: copyArray(value.layout?.columns, FALLBACK_CUSTOMIZATION_CATALOGUE.layout.columns),
      sidebarPositions: copyArray(
        value.layout?.sidebarPositions,
        FALLBACK_CUSTOMIZATION_CATALOGUE.layout.sidebarPositions,
      ),
      sidebarWidth: {
        presets: copyArray(
          value.layout?.sidebarWidth?.presets,
          FALLBACK_CUSTOMIZATION_CATALOGUE.layout.sidebarWidth.presets,
        ),
        range: mergeRange(
          value.layout?.sidebarWidth?.range,
          FALLBACK_CUSTOMIZATION_CATALOGUE.layout.sidebarWidth.range,
        ),
      },
      densities: copyArray(
        value.layout?.densities,
        FALLBACK_CUSTOMIZATION_CATALOGUE.layout.densities,
      ),
      headerAlignments: copyArray(
        value.layout?.headerAlignments,
        FALLBACK_CUSTOMIZATION_CATALOGUE.layout.headerAlignments,
      ),
      photo: {
        enabled: copyArray(
          value.layout?.photo?.enabled,
          FALLBACK_CUSTOMIZATION_CATALOGUE.layout.photo.enabled,
        ),
        shapes: copyArray(
          value.layout?.photo?.shapes,
          FALLBACK_CUSTOMIZATION_CATALOGUE.layout.photo.shapes,
        ),
      },
      placements: copyArray(
        value.layout?.placements,
        FALLBACK_CUSTOMIZATION_CATALOGUE.layout.placements,
      ),
    },
    typography: {
      bodyFonts: copyArray(
        value.typography?.bodyFonts,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.bodyFonts,
      ),
      headingFonts: copyArray(
        value.typography?.headingFonts,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.headingFonts,
      ),
      baseSize: mergeRange(
        value.typography?.baseSize,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.baseSize,
      ),
      headingScale: mergeRange(
        value.typography?.headingScale,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.headingScale,
      ),
      weights: copyArray(
        value.typography?.weights,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.weights,
      ),
      capitalization: copyArray(
        value.typography?.capitalization,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.capitalization,
      ),
      lineHeights: copyArray(
        value.typography?.lineHeights,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.lineHeights,
      ),
      dateStyles: copyArray(
        value.typography?.dateStyles,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.dateStyles,
      ),
      bulletStyles: copyArray(
        value.typography?.bulletStyles,
        FALLBACK_CUSTOMIZATION_CATALOGUE.typography.bulletStyles,
      ),
    },
    colors: {
      palettePresets: copyArray(
        value.colors?.palettePresets,
        FALLBACK_CUSTOMIZATION_CATALOGUE.colors.palettePresets,
      ),
      editable: copyArray(
        value.colors?.editable,
        FALLBACK_CUSTOMIZATION_CATALOGUE.colors.editable,
      ),
      accentTargets: copyArray(
        value.colors?.accentTargets,
        FALLBACK_CUSTOMIZATION_CATALOGUE.colors.accentTargets,
      ),
      monochrome: copyArray(
        value.colors?.monochrome,
        FALLBACK_CUSTOMIZATION_CATALOGUE.colors.monochrome,
      ),
      minimumContrast: value.colors?.minimumContrast ?? FALLBACK_CUSTOMIZATION_CATALOGUE.colors.minimumContrast,
    },
    sections: {
      types: copyArray(value.sections?.types, FALLBACK_CUSTOMIZATION_CATALOGUE.sections.types),
      displayModes: copyArray(
        value.sections?.displayModes,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.displayModes,
      ),
      detailLevels: copyArray(
        value.sections?.detailLevels,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.detailLevels,
      ),
      headingStyles: copyArray(
        value.sections?.headingStyles,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.headingStyles,
      ),
      headingCapitalization: copyArray(
        value.sections?.headingCapitalization,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.headingCapitalization,
      ),
      titleSubtitleOrders: copyArray(
        value.sections?.titleSubtitleOrders,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.titleSubtitleOrders,
      ),
      dateLocationPositions: copyArray(
        value.sections?.dateLocationPositions,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.dateLocationPositions,
      ),
      skillStyles: copyArray(
        value.sections?.skillStyles,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.skillStyles,
      ),
      toggles: copyArray(value.sections?.toggles, FALLBACK_CUSTOMIZATION_CATALOGUE.sections.toggles),
      placements: copyArray(
        value.sections?.placements,
        FALLBACK_CUSTOMIZATION_CATALOGUE.sections.placements,
      ),
    },
    locale: {
      languages: copyArray(
        value.locale?.languages,
        FALLBACK_CUSTOMIZATION_CATALOGUE.locale.languages,
      ),
      directions: copyArray(
        value.locale?.directions,
        FALLBACK_CUSTOMIZATION_CATALOGUE.locale.directions,
      ),
    },
    advancedCss: {
      enabled:
        value.advancedCss?.enabled ??
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.enabled,
      maxLength:
        value.advancedCss?.maxLength ??
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.maxLength,
      modes: copyArray(
        value.advancedCss?.modes,
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.modes,
      ),
      allowedScopes: copyArray(
        value.advancedCss?.allowedScopes,
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.allowedScopes,
      ),
      blockedAtRules: copyArray(
        value.advancedCss?.blockedAtRules,
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.blockedAtRules,
      ),
      blockedFunctions: copyArray(
        value.advancedCss?.blockedFunctions,
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.blockedFunctions,
      ),
      examples: copyArray(
        value.advancedCss?.examples,
        FALLBACK_CUSTOMIZATION_CATALOGUE.advancedCss.examples,
      ),
    },
    templates: mergeTemplates(value.templates, FALLBACK_CUSTOMIZATION_CATALOGUE.templates),
  };
}

export function resolveCustomizationOptionLists(catalogue: CustomizationCatalogue) {
  return {
    pageFormats: catalogue.page.formats,
    pageBreakModes: catalogue.page.pageBreakModes,
    margins: catalogue.page.margins,
    columns: catalogue.layout.columns,
    sidebarPositions: catalogue.layout.sidebarPositions,
    sidebarWidths: catalogue.layout.sidebarWidth.presets,
    sidebarWidthRange: catalogue.layout.sidebarWidth.range,
    densities: catalogue.layout.densities,
    headerAlignments: catalogue.layout.headerAlignments,
    photoShapes: catalogue.layout.photo.shapes,
    photoEnabled: catalogue.layout.photo.enabled,
    fonts: catalogue.typography.bodyFonts,
    headingFonts: catalogue.typography.headingFonts,
    baseSize: catalogue.typography.baseSize,
    headingScale: catalogue.typography.headingScale,
    weights: catalogue.typography.weights,
    capitalization: catalogue.typography.capitalization,
    lineHeights: catalogue.typography.lineHeights,
    dateStyles: catalogue.typography.dateStyles,
    bulletStyles: catalogue.typography.bulletStyles,
    palettePresets: catalogue.colors.palettePresets,
    editableColors: catalogue.colors.editable,
    accentTargets: catalogue.colors.accentTargets,
    monochrome: catalogue.colors.monochrome,
    sectionTypes: catalogue.sections.types,
    displayModes: catalogue.sections.displayModes,
    detailLevels: catalogue.sections.detailLevels,
    headingStyles: catalogue.sections.headingStyles,
    headingCapitalization: catalogue.sections.headingCapitalization,
    titleSubtitleOrders: catalogue.sections.titleSubtitleOrders,
    dateLocationPositions: catalogue.sections.dateLocationPositions,
    skillStyles: catalogue.sections.skillStyles,
    sectionToggles: catalogue.sections.toggles,
    sectionPlacements: catalogue.sections.placements,
    localeLanguages: catalogue.locale.languages,
    localeDirections: catalogue.locale.directions,
  };
}

export function buildTemplateCards(catalogue: CustomizationCatalogue): TemplateCard[] {
  return Object.entries(catalogue.templates).map(([id, template]) => ({
    id,
    label: id === "ats" ? "ATS Strict" : id.charAt(0).toUpperCase() + id.slice(1),
    compatibleLayouts: template.compatibleLayouts,
    enforced: template.enforced,
  }));
}

export async function fetchCustomizationCatalogue(): Promise<CustomizationCatalogue> {
  const response = await fetch(apiUrl("/api/v1/templates/customization-catalogue"), {
    headers: jsonHeaders(),
  });
  if (!response.ok) {
    return FALLBACK_CUSTOMIZATION_CATALOGUE;
  }
  const payload = (await response.json()) as { item?: Partial<CustomizationCatalogue> };
  return normalizeCustomizationCatalogue(payload.item);
}
