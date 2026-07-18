import type { CustomizationCatalogue } from "@/lib/customization-catalogue";
import type { GlobalSettings } from "@/store/useCVStore";

import { DEFAULT_FONT, SECTION_LABELS } from "./constants";

export type SectionDraft = NonNullable<GlobalSettings["sections"]>[number];

function titleCase(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultSections(
  types: string[],
  placements: string[],
): SectionDraft[] {
  return types.map((type, index) => ({
    id: type,
    type,
    label: SECTION_LABELS[type] ?? titleCase(type),
    visible: true,
    placement: (placements[index] === "sidebar" ? "sidebar" : "main") as
      "main" | "sidebar",
    display_mode: "list",
    show_dates: true,
    show_locations: true,
    detail_level: "normal",
    page_break_before: false,
    heading_style: "line",
    heading_capitalization: "uppercase",
    title_subtitle_order: "title_first",
    date_location_position: "inline",
    skill_style: "tags",
    icon: null,
  }));
}

export function mergeSections(
  current: Partial<GlobalSettings> | undefined,
  catalogue: CustomizationCatalogue,
): SectionDraft[] {
  const defaults = defaultSections(
    catalogue.sections.types,
    catalogue.sections.placements,
  );
  const existing = current?.sections ?? [];
  const defaultsByType = new Map(
    defaults.map((section) => [section.type, section]),
  );
  const merged: SectionDraft[] = [];
  const seenTypes = new Set<string>();

  for (const existingSection of existing) {
    const defaultSection = defaultsByType.get(existingSection.type);
    if (!defaultSection) continue;
    merged.push({ ...defaultSection, ...existingSection });
    seenTypes.add(existingSection.type);
  }

  for (const defaultSection of defaults) {
    if (seenTypes.has(defaultSection.type)) continue;
    merged.push(defaultSection);
  }

  return merged;
}

export function resolveSettings(
  current: GlobalSettings | undefined,
  catalogue: CustomizationCatalogue,
): GlobalSettings {
  const pageFormat = current?.page?.format ?? "A4";
  const bodyFont =
    current?.typography?.body_font ?? current?.font_family ?? DEFAULT_FONT;
  const headingFont = current?.typography?.heading_font ?? bodyFont;
  const primaryColor =
    current?.colors?.primary ?? current?.primary_color ?? "#2563eb";
  return {
    schema_version: current?.schema_version ?? catalogue.schemaVersion,
    page: {
      format: pageFormat,
      margins: {
        horizontal:
          current?.page?.margins?.horizontal ?? current?.margin_h ?? "64px",
        vertical:
          current?.page?.margins?.vertical ?? current?.margin_v ?? "48px",
      },
      page_break_mode: current?.page?.page_break_mode ?? "auto",
      one_page_challenge: current?.page?.one_page_challenge ?? false,
    },
    layout: {
      columns:
        current?.layout?.columns ?? (current?.col_swap === "true" ? 2 : 2),
      sidebar_position:
        current?.layout?.sidebar_position ??
        (current?.col_swap === "true" ? "left" : "right"),
      sidebar_width:
        current?.layout?.sidebar_width ?? `${current?.col_left_width ?? "35"}%`,
      density: current?.layout?.density ?? "normal",
      header_alignment: current?.layout?.header_alignment ?? "left",
      photo: {
        enabled: current?.layout?.photo?.enabled ?? false,
        grayscale: current?.layout?.photo?.grayscale ?? false,
        position: current?.layout?.photo?.position ?? "left",
        size: current?.layout?.photo?.size ?? "m",
        shape: current?.layout?.photo?.shape ?? "round",
      },
      section_placement: current?.layout?.section_placement ?? {},
    },
    typography: {
      body_font: bodyFont,
      heading_font: headingFont,
      base_size: current?.typography?.base_size ?? current?.font_size ?? "13px",
      body_size:
        current?.typography?.body_size ??
        current?.typography?.base_size ??
        current?.font_size ??
        "13px",
      name_size: current?.typography?.name_size ?? "28px",
      title_size: current?.typography?.title_size ?? "15px",
      section_heading_size:
        current?.typography?.section_heading_size ?? "10px",
      entry_heading_size:
        current?.typography?.entry_heading_size ?? "14px",
      heading_scale: current?.typography?.heading_scale ?? "1.0",
      weight: current?.typography?.weight ?? "regular",
      titles_uppercase: current?.typography?.titles_uppercase ?? true,
      line_height:
        current?.typography?.line_height ?? current?.line_height ?? "1.5",
      date_style: current?.typography?.date_style ?? "normal",
      bullet_style: current?.typography?.bullet_style ?? "bullets",
    },
    colors: {
      primary: primaryColor,
      secondary: current?.colors?.secondary ?? "#64748b",
      text: current?.colors?.text ?? "#334155",
      heading: current?.colors?.heading ?? "#0f172a",
      sidebar_background: current?.colors?.sidebar_background ?? "#f8fafc",
      separators: current?.colors?.separators ?? "#e2e8f0",
      palette_preset: current?.colors?.palette_preset ?? "tech",
      monochrome: current?.colors?.monochrome ?? false,
      accent_targets: current?.colors?.accent_targets ?? [
        "title",
        "headings",
        "links",
        "skills",
      ],
    },
    sections: mergeSections(current, catalogue),
    locale: {
      label_language: current?.locale?.label_language ?? "fr",
      text_direction: current?.locale?.text_direction ?? "ltr",
    },
    advanced_css: {
      enabled: current?.advanced_css?.enabled ?? false,
      mode: current?.advanced_css?.mode ?? "off",
      css_text: current?.advanced_css?.css_text ?? "",
      preset_id: current?.advanced_css?.preset_id ?? null,
      warnings: current?.advanced_css?.warnings ?? [],
    },
    font_family: bodyFont,
    font_size: current?.font_size ?? "13px",
    primary_color: primaryColor,
    line_height: current?.line_height ?? "1.5",
    margin_page: current?.margin_page ?? "48px",
    margin_h: current?.margin_h ?? "64px",
    margin_v: current?.margin_v ?? "48px",
    entry_spacing: current?.entry_spacing ?? "20px",
    col_left_width: current?.col_left_width ?? "65",
    col_swap: current?.col_swap ?? "false",
    template_id: current?.template_id ?? "modern",
  };
}
