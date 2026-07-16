"use client";

import { useEffect, useMemo, useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";
import {
  buildTemplateCards,
  fetchCustomizationCatalogue,
  normalizeCustomizationCatalogue,
  resolveCustomizationOptionLists,
  type CustomizationCatalogue,
  FALLBACK_CUSTOMIZATION_CATALOGUE,
} from "@/lib/customization-catalogue";

const DEFAULT_FONT = "Inter";
const PANEL_INPUT_CLASS = "app-input h-9 px-2 text-sm";
const PANEL_TEXTAREA_CLASS = "app-textarea min-h-48 w-full px-3 py-2 font-mono text-xs";
const PANEL_TOGGLE_CLASS = "flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2";
const PANEL_MUTED_CARD_CLASS = "rounded-lg border border-border bg-muted/40 p-3";

const SECTION_LABELS: Record<string, string> = {
  profile: "Profil",
  contact: "Contact",
  experience: "Expériences",
  education: "Formation",
  projects: "Projets",
  skills: "Compétences",
  languages: "Langues",
  certifications: "Certifications",
  volunteering: "Bénévolat",
  interests: "Centres d'intérêt",
  publications: "Publications",
  references: "Références",
  custom: "Section personnalisée",
};

// ── Reusable components ───────────────────────────────────────────────────────

function Slider({
  label, min, max, step = 1, value, unit, onChange,
}: {
  label: string; min: number; max: number; step?: number;
  value: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs font-semibold tabular-nums text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "var(--panel-accent, #8b5cf6)" }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
      {children}
    </h3>
  );
}

function titleCase(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type SectionDraft = NonNullable<GlobalSettings["sections"]>[number];

function defaultSections(types: string[], placements: string[]): SectionDraft[] {
  return types.map((type, index) => ({
    id: type,
    type,
    label: SECTION_LABELS[type] ?? titleCase(type),
    visible: true,
    placement: (placements[index] === "sidebar" ? "sidebar" : "main") as "main" | "sidebar",
    display_mode: "list",
    show_dates: true,
    show_locations: true,
    detail_level: "normal",
    icon: null,
  }));
}

export function mergeSections(
  current: Partial<GlobalSettings> | undefined,
  catalogue: CustomizationCatalogue,
): SectionDraft[] {
  const defaults = defaultSections(catalogue.sections.types, catalogue.sections.placements);
  const existing = current?.sections ?? [];
  const defaultsByType = new Map(defaults.map((section) => [section.type, section]));
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

function resolveSettings(
  current: GlobalSettings | undefined,
  catalogue: CustomizationCatalogue,
): GlobalSettings {
  const pageFormat = current?.page?.format ?? "A4";
  const bodyFont = current?.typography?.body_font ?? current?.font_family ?? DEFAULT_FONT;
  const headingFont = current?.typography?.heading_font ?? bodyFont;
  const primaryColor = current?.colors?.primary ?? current?.primary_color ?? "#2563eb";
  const resolved: GlobalSettings = {
    schema_version: current?.schema_version ?? catalogue.schemaVersion,
    page: {
      format: pageFormat,
      margins: {
        horizontal: current?.page?.margins?.horizontal ?? current?.margin_h ?? "64px",
        vertical: current?.page?.margins?.vertical ?? current?.margin_v ?? "48px",
      },
      page_break_mode: current?.page?.page_break_mode ?? "auto",
      one_page_challenge: current?.page?.one_page_challenge ?? false,
    },
    layout: {
      columns: current?.layout?.columns ?? (current?.col_swap === "true" ? 2 : 2),
      sidebar_position:
        current?.layout?.sidebar_position ??
        (current?.col_swap === "true" ? "left" : "right"),
      sidebar_width: current?.layout?.sidebar_width ?? `${current?.col_left_width ?? "35"}%`,
      density: current?.layout?.density ?? "normal",
      header_alignment: current?.layout?.header_alignment ?? "left",
      photo: {
        enabled: current?.layout?.photo?.enabled ?? false,
        shape: current?.layout?.photo?.shape ?? "round",
      },
      section_placement: current?.layout?.section_placement ?? {},
    },
    typography: {
      body_font: bodyFont,
      heading_font: headingFont,
      base_size: current?.typography?.base_size ?? current?.font_size ?? "13px",
      heading_scale: current?.typography?.heading_scale ?? "1.0",
      weight: current?.typography?.weight ?? "regular",
      titles_uppercase: current?.typography?.titles_uppercase ?? true,
      line_height: current?.typography?.line_height ?? current?.line_height ?? "1.5",
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
  return resolved;
}

// ── Main Panel ────────────────────────────────────────────────────────────────

type Tab = "design" | "typography" | "layout" | "sections" | "advanced";

interface StylePanelProps {
  open?: boolean;
  onClose?: () => void;
  variant?: "drawer" | "embedded";
}

export function StylePanel({ open = true, onClose, variant = "drawer" }: StylePanelProps) {
  const { cvData, setGlobalSettings } = useCVStore();
  const [tab, setTab] = useState<Tab>("design");
  const [catalogue, setCatalogue] = useState<CustomizationCatalogue>(
    FALLBACK_CUSTOMIZATION_CATALOGUE,
  );

  useEffect(() => {
    void fetchCustomizationCatalogue()
      .then((next) => setCatalogue(normalizeCustomizationCatalogue(next)))
      .catch(() => setCatalogue(FALLBACK_CUSTOMIZATION_CATALOGUE));
  }, []);

  const options = useMemo(
    () => resolveCustomizationOptionLists(catalogue),
    [catalogue],
  );
  const templateCards = useMemo(() => buildTemplateCards(catalogue), [catalogue]);
  const settings = useMemo(
    () => resolveSettings(cvData.global_settings, catalogue),
    [cvData.global_settings, catalogue],
  );
  const colorSettings = settings.colors ?? {};
  const typographySettings = settings.typography ?? {};
  const layoutSettings = settings.layout ?? {};
  const pageSettings = settings.page ?? {};
  const localeSettings = settings.locale ?? {};
  const advancedCssSettings = settings.advanced_css ?? {
    enabled: false,
    mode: "off",
    css_text: "",
    preset_id: null,
    warnings: [],
  };
  const resetSettings = useMemo(
    () => resolveSettings(undefined, catalogue),
    [catalogue],
  );

  const update = (patch: Partial<GlobalSettings>) =>
    setGlobalSettings({ ...settings, ...patch });

  const updateTemplate = (templateId: string) => {
    setGlobalSettings({ ...settings, template_id: templateId });
  };

  const updateSection = (index: number, patch: Partial<NonNullable<GlobalSettings["sections"]>[number]>) => {
    const nextSections = settings.sections?.map((section, currentIndex) =>
      currentIndex === index ? { ...section, ...patch } : section,
    ) ?? [];
    update({ sections: nextSections });
  };

  const moveSection = (index: number, delta: -1 | 1) => {
    const sections = [...(settings.sections ?? [])];
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const [item] = sections.splice(index, 1);
    sections.splice(nextIndex, 0, item);
    update({ sections });
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "design", label: "Design", icon: "" },
    { key: "typography", label: "Typography", icon: "Aa" },
    { key: "layout", label: "Layout", icon: "◫" },
    { key: "sections", label: "Sections", icon: "≡" },
    { key: "advanced", label: "Advanced", icon: "{}" },
  ];

  const sectionPlacements = options.sectionPlacements;
  const sectionModes = options.displayModes;
  const sectionDetails = options.detailLevels;
  const isEmbedded = variant === "embedded";

  return (
    <>
      {!isEmbedded && open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
          onClick={onClose}
        />
      )}

      <aside
        style={isEmbedded ? undefined : { boxShadow: "-8px 0 32px rgba(15,23,42,0.18)" }}
        className={
          isEmbedded
            ? "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card"
            : `fixed top-0 right-0 z-50 flex h-full w-[24rem] flex-col border-l border-border bg-card transition-transform duration-300 ease-in-out ${
                open ? "translate-x-0" : "translate-x-full"
              }`
        }
        aria-label="Style panel"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Design Studio</h2>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Backend catalogue driven
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex shrink-0 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-b-2 py-2.5 text-[11px] font-semibold transition-colors ${
                tab === t.key
                  ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {t.icon && <span className="text-sm leading-none">{t.icon}</span>}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {tab === "design" && (
            <>
              <section>
                <SectionLabel>Template</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  {templateCards.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => updateTemplate(template.id)}
                      aria-label={`Template ${template.label}`}
                      className="flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all"
                      style={
                        settings.template_id === template.id
                          ? {
                              border: "2px solid #7c3aed",
                              background: "#f5f3ff",
                              boxShadow: "0 0 0 3px rgba(124,58,237,0.08)",
                            }
                          : { border: "1px solid #cbd5e1", background: "#fff" }
                      }
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {template.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {template.compatibleLayouts.join("/")}-col
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>Palette</SectionLabel>
                  <select
                  value={colorSettings.palette_preset ?? "tech"}
                  onChange={(e) =>
                    update({
                      colors: {
                        ...colorSettings,
                        palette_preset: e.target.value as NonNullable<
                          GlobalSettings["colors"]
                        >["palette_preset"],
                      },
                    })
                  }
                  className={PANEL_INPUT_CLASS + " w-full"}
                >
                  {options.palettePresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {options.editableColors.map((token) => (
                    <label key={token} className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {token.replace("_", " ")}
                      </span>
                      <input
                        type="color"
                        value={(colorSettings as Record<string, string | undefined>)?.[token] ?? "#2563eb"}
                        onChange={(e) =>
                          update({
                            colors: {
                              ...colorSettings,
                              [token]: e.target.value,
                            },
                          })
                        }
                        className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
                      />
                    </label>
                  ))}
                </div>
                <label className={PANEL_TOGGLE_CLASS + " mt-3"}>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Monochrome</span>
                  <input
                    type="checkbox"
                    checked={colorSettings.monochrome ?? false}
                    onChange={(e) =>
                      update({
                        colors: {
                          ...colorSettings,
                          monochrome: e.target.checked,
                        },
                      })
                    }
                  />
                </label>
              </section>

              <section>
                <SectionLabel>Template notes</SectionLabel>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  The backend keeps template compatibility and enforcement. This panel only
                  sends API state.
                </div>
              </section>

              <section>
                <SectionLabel>Locale</SectionLabel>
                <div className="grid gap-2">
                  <select
                    value={localeSettings.label_language ?? "fr"}
                    onChange={(e) =>
                      update({
                        locale: {
                          ...localeSettings,
                          label_language: e.target.value as NonNullable<
                            GlobalSettings["locale"]
                          >["label_language"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.localeLanguages.map((language) => (
                      <option key={language} value={language}>
                        {language.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <select
                    value={localeSettings.text_direction ?? "ltr"}
                    onChange={(e) =>
                      update({
                        locale: {
                          ...localeSettings,
                          text_direction: e.target.value as NonNullable<
                            GlobalSettings["locale"]
                          >["text_direction"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.localeDirections.map((direction) => (
                      <option key={direction} value={direction}>
                        {direction.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            </>
          )}

          {tab === "typography" && (
            <>
              <section>
                <SectionLabel>Fonts</SectionLabel>
                <div className="space-y-3">
                  <select
                    value={typographySettings.body_font ?? DEFAULT_FONT}
                    onChange={(e) =>
                      update({
                        font_family: e.target.value,
                        typography: {
                          ...typographySettings,
                          body_font: e.target.value,
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS + " w-full"}
                  >
                    {options.fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typographySettings.heading_font ?? DEFAULT_FONT}
                    onChange={(e) =>
                      update({
                        typography: {
                          ...typographySettings,
                          heading_font: e.target.value,
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS + " w-full"}
                  >
                    {options.headingFonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section>
                <SectionLabel>Size</SectionLabel>
                <Slider
                  label="Base size"
                  min={options.baseSize.min}
                  max={options.baseSize.max}
                  value={parseInt(typographySettings.base_size ?? settings.font_size ?? "13", 10)}
                  unit="pt"
                  onChange={(v) =>
                    update({
                      font_size: `${v}px`,
                      typography: {
                        ...typographySettings,
                        base_size: `${v}px`,
                      },
                    })
                  }
                />
                <Slider
                  label="Heading scale"
                  min={options.headingScale.min}
                  max={options.headingScale.max}
                  step={options.headingScale.step ?? 0.05}
                  value={parseFloat(typographySettings.heading_scale ?? "1")}
                  unit="x"
                  onChange={(v) =>
                    update({
                      typography: {
                        ...typographySettings,
                        heading_scale: String(v.toFixed(2)),
                      },
                    })
                  }
                />
              </section>

              <section>
                <SectionLabel>Behavior</SectionLabel>
                <div className="grid gap-2">
                  <select
                    value={typographySettings.weight ?? "regular"}
                    onChange={(e) =>
                      update({
                        typography: {
                          ...typographySettings,
                          weight: e.target.value as NonNullable<
                            GlobalSettings["typography"]
                          >["weight"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.weights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                  <label className={PANEL_TOGGLE_CLASS}>
                    <span className="text-xs font-medium text-slate-700">
                      Uppercase titles
                    </span>
                    <input
                      type="checkbox"
                      checked={typographySettings.titles_uppercase ?? true}
                      onChange={(e) =>
                        update({
                          typography: {
                            ...typographySettings,
                            titles_uppercase: e.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                  <select
                    value={typographySettings.line_height ?? settings.line_height ?? "1.5"}
                    onChange={(e) =>
                      update({
                        line_height: e.target.value,
                        typography: {
                          ...typographySettings,
                          line_height: e.target.value,
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.lineHeights.map((lineHeight) => (
                      <option key={lineHeight} value={lineHeight}>
                        {lineHeight}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typographySettings.date_style ?? "normal"}
                    onChange={(e) =>
                      update({
                        typography: {
                          ...typographySettings,
                          date_style: e.target.value as NonNullable<
                            GlobalSettings["typography"]
                          >["date_style"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.dateStyles.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typographySettings.bullet_style ?? "bullets"}
                    onChange={(e) =>
                      update({
                        typography: {
                          ...typographySettings,
                          bullet_style: e.target.value as NonNullable<
                            GlobalSettings["typography"]
                          >["bullet_style"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.bulletStyles.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            </>
          )}

          {tab === "layout" && (
            <>
              <section>
                <SectionLabel>Page</SectionLabel>
                <div className="grid gap-2">
                  <select
                    value={pageSettings.format ?? "A4"}
                    onChange={(e) =>
                      update({
                        page: {
                          ...pageSettings,
                          format: e.target.value as "A4" | "Letter",
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.pageFormats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pageSettings.page_break_mode ?? "auto"}
                    onChange={(e) =>
                      update({
                        page: {
                          ...pageSettings,
                          page_break_mode: e.target.value as "auto" | "manual",
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.pageBreakModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <label className={PANEL_TOGGLE_CLASS}>
                    <div>
                      <span className="block text-xs font-medium text-slate-700">
                        1 page challenge
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Tightens spacing and typography without deleting data.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Toggle one page challenge"
                      checked={pageSettings.one_page_challenge ?? false}
                      onChange={(e) =>
                        update({
                          page: {
                            ...pageSettings,
                            one_page_challenge: e.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </section>

              <section>
                <SectionLabel>Margins</SectionLabel>
                <Slider
                  label="Horizontal"
                  min={options.margins.range.min}
                  max={options.margins.range.max}
                  value={parseInt(pageSettings.margins?.horizontal ?? settings.margin_h ?? "64", 10)}
                  unit={options.margins.range.unit}
                  onChange={(v) =>
                      update({
                        margin_h: `${v}px`,
                        page: {
                          ...pageSettings,
                          margins: {
                          ...pageSettings.margins,
                            horizontal: `${v}px`,
                          },
                        },
                    })
                  }
                />
                <Slider
                  label="Vertical"
                  min={options.margins.range.min}
                  max={options.margins.range.max}
                  value={parseInt(pageSettings.margins?.vertical ?? settings.margin_v ?? "48", 10)}
                  unit={options.margins.range.unit}
                  onChange={(v) =>
                      update({
                        margin_v: `${v}px`,
                        page: {
                        ...pageSettings,
                          margins: {
                          ...pageSettings.margins,
                            vertical: `${v}px`,
                          },
                        },
                    })
                  }
                />
                <Slider
                  label="Entry spacing"
                  min={4}
                  max={36}
                  value={parseInt(settings.entry_spacing ?? "20", 10)}
                  unit="px"
                  onChange={(v) => update({ entry_spacing: `${v}px` })}
                />
              </section>

              <section>
                <SectionLabel>Columns</SectionLabel>
                <div className="grid gap-2">
                  <select
                    value={layoutSettings.columns ?? 2}
                    onChange={(e) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          columns: Number(e.target.value) as 1 | 2,
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.columns.map((value) => (
                      <option key={value} value={value}>
                        {value} column{value > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    value={layoutSettings.sidebar_position ?? "right"}
                    onChange={(e) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          sidebar_position: e.target.value as "none" | "left" | "right",
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.sidebarPositions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                  <select
                    value={layoutSettings.density ?? "normal"}
                    onChange={(e) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          density: e.target.value as NonNullable<
                            GlobalSettings["layout"]
                          >["density"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.densities.map((density) => (
                      <option key={density} value={density}>
                        {density}
                      </option>
                    ))}
                  </select>
                  <Slider
                    label="Sidebar width"
                    min={options.sidebarWidthRange.min}
                    max={options.sidebarWidthRange.max}
                    value={parseInt(layoutSettings.sidebar_width ?? settings.col_left_width ?? "35", 10)}
                    unit="%"
                    onChange={(v) =>
                      update({
                        col_left_width: String(v),
                        layout: {
                          ...layoutSettings,
                          sidebar_width: `${v}%`,
                        },
                      })
                    }
                  />
                </div>
              </section>

              <section>
                <SectionLabel>Header & Photo</SectionLabel>
                <div className="grid gap-2">
                  <select
                    value={layoutSettings.header_alignment ?? "left"}
                    onChange={(e) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          header_alignment: e.target.value as NonNullable<
                            GlobalSettings["layout"]
                          >["header_alignment"],
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.headerAlignments.map((alignment) => (
                      <option key={alignment} value={alignment}>
                        {alignment}
                      </option>
                    ))}
                  </select>
                  <label className={PANEL_TOGGLE_CLASS}>
                    <span className="text-xs font-medium text-slate-700">Photo enabled</span>
                    <input
                      type="checkbox"
                      checked={layoutSettings.photo?.enabled ?? false}
                      onChange={(e) =>
                        update({
                          layout: {
                            ...layoutSettings,
                            photo: {
                              ...layoutSettings.photo,
                              enabled: e.target.checked,
                            },
                          },
                        })
                      }
                    />
                  </label>
                  <select
                    value={layoutSettings.photo?.shape ?? "round"}
                    onChange={(e) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          photo: {
                            ...layoutSettings.photo,
                            shape: e.target.value as "round" | "square",
                          },
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {options.photoShapes.map((shape) => (
                      <option key={shape} value={shape}>
                        {shape}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            </>
          )}

          {tab === "sections" && (
            <>
              <section>
                <SectionLabel>Section model</SectionLabel>
                <div className="space-y-3">
                  {settings.sections?.map((section, index) => (
                    <div key={section.id} className={PANEL_MUTED_CARD_CLASS}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {section.label}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">
                            {section.type}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveSection(index, -1)}
                            disabled={index === 0}
                            aria-label={`Move section ${section.type} up`}
                            className="rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            onClick={() => moveSection(index, 1)}
                            disabled={index === (settings.sections?.length ?? 0) - 1}
                            aria-label={`Move section ${section.type} down`}
                            className="rounded border border-input bg-background px-2 py-1 text-[10px] text-muted-foreground disabled:opacity-40"
                          >
                            Down
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <input
                          value={section.label}
                          onChange={(e) => updateSection(index, { label: e.target.value })}
                          aria-label={`Section label ${section.type}`}
                          className={PANEL_INPUT_CLASS}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-slate-700">Visible</span>
                            <input
                              type="checkbox"
                              checked={section.visible ?? true}
                              onChange={(e) => updateSection(index, { visible: e.target.checked })}
                              aria-label={`Toggle section ${section.type}`}
                            />
                          </label>
                          <select
                            value={section.placement ?? "main"}
                            onChange={(e) =>
                              updateSection(index, {
                                placement: e.target.value as "main" | "sidebar",
                              })
                            }
                            aria-label={`Section placement ${section.type}`}
                            className={PANEL_INPUT_CLASS}
                          >
                            {sectionPlacements.map((placement) => (
                              <option key={placement} value={placement}>
                                {placement}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={section.display_mode ?? "list"}
                            onChange={(e) =>
                              updateSection(index, {
                                display_mode: e.target.value as NonNullable<
                                  GlobalSettings["sections"]
                                >[number]["display_mode"],
                              })
                            }
                            aria-label={`Section display mode ${section.type}`}
                            className={PANEL_INPUT_CLASS}
                          >
                            {sectionModes.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                          <select
                            value={section.detail_level ?? "normal"}
                            onChange={(e) =>
                              updateSection(index, {
                                detail_level: e.target.value as NonNullable<
                                  GlobalSettings["sections"]
                                >[number]["detail_level"],
                              })
                            }
                            aria-label={`Section detail level ${section.type}`}
                            className={PANEL_INPUT_CLASS}
                          >
                            {sectionDetails.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-slate-700">Dates</span>
                            <input
                              type="checkbox"
                              checked={section.show_dates ?? true}
                              onChange={(e) => updateSection(index, { show_dates: e.target.checked })}
                              aria-label={`Toggle dates ${section.type}`}
                            />
                          </label>
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-slate-700">Locations</span>
                            <input
                              type="checkbox"
                              checked={section.show_locations ?? true}
                              onChange={(e) =>
                                updateSection(index, { show_locations: e.target.checked })
                              }
                              aria-label={`Toggle locations ${section.type}`}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {tab === "advanced" && (
            <>
              <section>
                <SectionLabel>Advanced CSS</SectionLabel>
                <div className="grid gap-2">
                  <label className={PANEL_TOGGLE_CLASS}>
                    <div>
                      <span className="block text-xs font-medium text-slate-700">
                        Enable expert CSS
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Applied by the renderer inside the CV Shadow DOM only.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={advancedCssSettings.enabled ?? false}
                      onChange={(e) =>
                        update({
                          advanced_css: {
                            ...advancedCssSettings,
                            enabled: e.target.checked,
                            mode: e.target.checked
                              ? advancedCssSettings.mode === "off"
                                ? "tokens"
                                : advancedCssSettings.mode
                              : "off",
                          },
                        })
                      }
                    />
                  </label>
                  <select
                    value={advancedCssSettings.mode ?? "off"}
                    onChange={(e) =>
                      update({
                        advanced_css: {
                          ...advancedCssSettings,
                          enabled: e.target.value !== "off",
                          mode: e.target.value as "off" | "tokens" | "css_patch",
                        },
                      })
                    }
                    className={PANEL_INPUT_CLASS}
                  >
                    {catalogue.advancedCss.modes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={advancedCssSettings.css_text ?? ""}
                    onChange={(e) =>
                      update({
                        advanced_css: {
                          ...advancedCssSettings,
                          css_text: e.target.value,
                        },
                      })
                    }
                    aria-label="Advanced CSS editor"
                    maxLength={catalogue.advancedCss.maxLength}
                    spellCheck={false}
                    className={PANEL_TEXTAREA_CLASS}
                    placeholder=":host { --primary-color: #0f172a; }"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {advancedCssSettings.css_text?.length ?? 0}/
                      {catalogue.advancedCss.maxLength}
                    </span>
                    <span>{catalogue.advancedCss.allowedScopes.join(" · ")}</span>
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Snippets</SectionLabel>
                <div className="grid gap-2">
                  {catalogue.advancedCss.examples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() =>
                        update({
                          advanced_css: {
                            ...advancedCssSettings,
                            enabled: true,
                            mode:
                              advancedCssSettings.mode === "off"
                                ? "tokens"
                                : advancedCssSettings.mode,
                            css_text: example,
                          },
                        })
                      }
                      className="rounded-lg border border-input bg-background px-3 py-2 text-left font-mono text-[11px] text-foreground shadow-sm transition-colors hover:bg-accent"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>Guardrails</SectionLabel>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  <p>Blocked: {catalogue.advancedCss.blockedAtRules.join(", ")}</p>
                  <p>Filtered: {catalogue.advancedCss.blockedFunctions.join(", ")}</p>
                </div>
                {advancedCssSettings.warnings &&
                  advancedCssSettings.warnings.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] text-amber-800">
                      {advancedCssSettings.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}
              </section>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 px-5 py-3">
          <button
            onClick={() => setGlobalSettings({ ...resetSettings, template_id: "modern" })}
            className="w-full cursor-pointer rounded-lg border border-input bg-background py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Reset to backend defaults
          </button>
        </div>
      </aside>
    </>
  );
}
