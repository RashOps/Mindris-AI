"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { CvBuilderUiMode } from "@/app/tools/cv-creator/components/CvBuilderModeToggle";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";
import {
  DEFAULT_FONT,
  PANEL_INPUT_CLASS,
  PANEL_MUTED_CARD_CLASS,
  PANEL_TOGGLE_CLASS,
} from "@/components/style-panel/constants";
import { AdvancedCssPanel } from "@/components/style-panel/AdvancedCssPanel";
import { SectionLabel, Slider } from "@/components/style-panel/controls";
import { resolveSettings } from "@/components/style-panel/settings";
import {
  buildTemplateCards,
  fetchCustomizationCatalogue,
  normalizeCustomizationCatalogue,
  resolveCustomizationOptionLists,
  type CustomizationCatalogue,
  FALLBACK_CUSTOMIZATION_CATALOGUE,
} from "@/lib/customization-catalogue";

export { mergeSections } from "@/components/style-panel/settings";

type Tab = "design" | "typography" | "layout" | "sections" | "advanced";

interface StylePanelProps {
  open?: boolean;
  onClose?: () => void;
  variant?: "drawer" | "embedded";
  uiMode?: CvBuilderUiMode;
}

export function StylePanel({
  open = true,
  onClose,
  variant = "drawer",
  uiMode = "advanced",
}: StylePanelProps) {
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
  const templateCards = useMemo(
    () => buildTemplateCards(catalogue),
    [catalogue],
  );
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

  const updateSection = (
    index: number,
    patch: Partial<NonNullable<GlobalSettings["sections"]>[number]>,
  ) => {
    const nextSections =
      settings.sections?.map((section, currentIndex) =>
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
    { key: "typography", label: "Texte", icon: "Aa" },
    { key: "layout", label: "Page", icon: "◫" },
    { key: "sections", label: "Sections", icon: "≡" },
    { key: "advanced", label: "Avancé", icon: "{}" },
  ];
  const visibleTabs = TABS.filter((item) => {
    if (uiMode === "simple") return item.key === "design";
    if (uiMode === "normal") {
      return (
        item.key === "design" ||
        item.key === "typography" ||
        item.key === "layout"
      );
    }
    return true;
  });
  const isSimpleMode = uiMode === "simple";
  const isAdvancedMode = uiMode === "advanced";

  const sectionPlacements = options.sectionPlacements;
  const sectionModes = options.displayModes;
  const sectionDetails = options.detailLevels;
  const isEmbedded = variant === "embedded";
  const activeTab = visibleTabs.some((item) => item.key === tab)
    ? tab
    : (visibleTabs[0]?.key ?? "design");

  return (
    <>
      {!isEmbedded && open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
          onClick={onClose}
        />
      )}

      <aside
        style={
          isEmbedded
            ? undefined
            : { boxShadow: "-8px 0 32px rgba(15,23,42,0.18)" }
        }
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
            <h2 className="truncate text-sm font-semibold text-foreground">
              Design Studio
            </h2>
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

        {visibleTabs.length > 1 ? (
          <div className="flex shrink-0 border-b border-border">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-b-2 py-2.5 text-[11px] font-semibold transition-colors ${
                  activeTab === t.key
                    ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {t.icon && (
                  <span className="text-sm leading-none">{t.icon}</span>
                )}
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {activeTab === "design" && (
            <>
              <section>
                <SectionLabel>Template</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  {templateCards.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => updateTemplate(template.id)}
                      aria-label={`Template ${template.label}`}
                      className={`flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                        settings.template_id === template.id
                          ? "border-violet-600 bg-violet-50 shadow-[0_0_0_3px_rgba(124,58,237,0.08)] dark:bg-violet-950/40"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      <span className="text-sm font-semibold text-foreground">
                        {template.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {template.compatibleLayouts.join("/")}-col
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel>
                  {isSimpleMode ? "Couleur principale" : "Palette"}
                </SectionLabel>
                {!isSimpleMode ? (
                  <ToolbarSelect
                    value={colorSettings.palette_preset ?? "tech"}
                    ariaLabel="Palette preset"
                    options={options.palettePresets.map((preset) => ({
                      value: preset,
                      label: preset,
                    }))}
                    onChange={(value) =>
                      update({
                        colors: {
                          ...colorSettings,
                          palette_preset: value as NonNullable<
                            GlobalSettings["colors"]
                          >["palette_preset"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS + " w-full"}
                  />
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {options.editableColors
                    .filter((token) => !isSimpleMode || token === "primary")
                    .map((token) => (
                      <label key={token} className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {token.replace("_", " ")}
                        </span>
                        <input
                          type="color"
                          value={
                            (
                              colorSettings as Record<
                                string,
                                string | undefined
                              >
                            )?.[token] ?? "#2563eb"
                          }
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
                {!isSimpleMode ? (
                  <label className={PANEL_TOGGLE_CLASS + " mt-3"}>
                    <span className="text-xs font-medium text-foreground">
                      Monochrome
                    </span>
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
                ) : null}
              </section>

              {!isSimpleMode ? (
                <section>
                  <SectionLabel>Template notes</SectionLabel>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    The backend keeps template compatibility and enforcement.
                    This panel only sends API state.
                  </div>
                </section>
              ) : null}

              {isAdvancedMode ? (
                <section>
                  <SectionLabel>Locale</SectionLabel>
                  <div className="grid gap-2">
                    <ToolbarSelect
                      value={localeSettings.label_language ?? "fr"}
                      ariaLabel="Locale label language"
                      options={options.localeLanguages.map((language) => ({
                        value: language,
                        label: language.toUpperCase(),
                      }))}
                      onChange={(value) =>
                        update({
                          locale: {
                            ...localeSettings,
                            label_language: value as NonNullable<
                              GlobalSettings["locale"]
                            >["label_language"],
                          },
                        })
                      }
                      triggerClassName={PANEL_INPUT_CLASS}
                    />
                    <ToolbarSelect
                      value={localeSettings.text_direction ?? "ltr"}
                      ariaLabel="Locale text direction"
                      options={options.localeDirections.map((direction) => ({
                        value: direction,
                        label: direction.toUpperCase(),
                      }))}
                      onChange={(value) =>
                        update({
                          locale: {
                            ...localeSettings,
                            text_direction: value as NonNullable<
                              GlobalSettings["locale"]
                            >["text_direction"],
                          },
                        })
                      }
                      triggerClassName={PANEL_INPUT_CLASS}
                    />
                  </div>
                </section>
              ) : null}
            </>
          )}

          {activeTab === "typography" && (
            <>
              <section>
                <SectionLabel>Fonts</SectionLabel>
                <div className="space-y-3">
                  <ToolbarSelect
                    value={typographySettings.body_font ?? DEFAULT_FONT}
                    ariaLabel="Body font"
                    options={options.fonts.map((font) => ({
                      value: font,
                      label: font,
                    }))}
                    onChange={(value) =>
                      update({
                        font_family: value,
                        typography: {
                          ...typographySettings,
                          body_font: value,
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS + " w-full"}
                    menuClassName="min-w-64"
                  />
                  <ToolbarSelect
                    value={typographySettings.heading_font ?? DEFAULT_FONT}
                    ariaLabel="Heading font"
                    options={options.headingFonts.map((font) => ({
                      value: font,
                      label: font,
                    }))}
                    onChange={(value) =>
                      update({
                        typography: {
                          ...typographySettings,
                          heading_font: value,
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS + " w-full"}
                    menuClassName="min-w-64"
                  />
                </div>
              </section>

              <section>
                <SectionLabel>Size</SectionLabel>
                <Slider
                  label="Base size"
                  min={options.baseSize.min}
                  max={options.baseSize.max}
                  value={parseInt(
                    typographySettings.base_size ?? settings.font_size ?? "13",
                    10,
                  )}
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
                  <ToolbarSelect
                    value={typographySettings.weight ?? "regular"}
                    ariaLabel="Typography weight"
                    options={options.weights.map((weight) => ({
                      value: weight,
                      label: weight,
                    }))}
                    onChange={(value) =>
                      update({
                        typography: {
                          ...typographySettings,
                          weight: value as NonNullable<
                            GlobalSettings["typography"]
                          >["weight"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <label className={PANEL_TOGGLE_CLASS}>
                    <span className="text-xs font-medium text-foreground">
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
                  <ToolbarSelect
                    value={
                      typographySettings.line_height ??
                      settings.line_height ??
                      "1.5"
                    }
                    ariaLabel="Line height"
                    options={options.lineHeights.map((lineHeight) => ({
                      value: lineHeight,
                      label: lineHeight,
                    }))}
                    onChange={(value) =>
                      update({
                        line_height: value,
                        typography: {
                          ...typographySettings,
                          line_height: value,
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <ToolbarSelect
                    value={typographySettings.date_style ?? "normal"}
                    ariaLabel="Date style"
                    options={options.dateStyles.map((style) => ({
                      value: style,
                      label: style,
                    }))}
                    onChange={(value) =>
                      update({
                        typography: {
                          ...typographySettings,
                          date_style: value as NonNullable<
                            GlobalSettings["typography"]
                          >["date_style"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <ToolbarSelect
                    value={typographySettings.bullet_style ?? "bullets"}
                    ariaLabel="Bullet style"
                    options={options.bulletStyles.map((style) => ({
                      value: style,
                      label: style,
                    }))}
                    onChange={(value) =>
                      update({
                        typography: {
                          ...typographySettings,
                          bullet_style: value as NonNullable<
                            GlobalSettings["typography"]
                          >["bullet_style"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === "layout" && (
            <>
              <section>
                <SectionLabel>Page</SectionLabel>
                <div className="grid gap-2">
                  <ToolbarSelect
                    value={pageSettings.format ?? "A4"}
                    ariaLabel="Page format"
                    options={options.pageFormats.map((format) => ({
                      value: format,
                      label: format,
                    }))}
                    onChange={(value) =>
                      update({
                        page: {
                          ...pageSettings,
                          format: value as "A4" | "Letter",
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <ToolbarSelect
                    value={pageSettings.page_break_mode ?? "auto"}
                    ariaLabel="Page break mode"
                    options={options.pageBreakModes.map((mode) => ({
                      value: mode,
                      label: mode,
                    }))}
                    onChange={(value) =>
                      update({
                        page: {
                          ...pageSettings,
                          page_break_mode: value as "auto" | "manual",
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <label className={PANEL_TOGGLE_CLASS}>
                    <div>
                      <span className="block text-xs font-medium text-foreground">
                        1 page challenge
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
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
                  value={parseInt(
                    pageSettings.margins?.horizontal ??
                      settings.margin_h ??
                      "64",
                    10,
                  )}
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
                  value={parseInt(
                    pageSettings.margins?.vertical ?? settings.margin_v ?? "48",
                    10,
                  )}
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
                  <ToolbarSelect
                    value={String(layoutSettings.columns ?? 2)}
                    ariaLabel="Layout columns"
                    options={options.columns.map((value) => ({
                      value: String(value),
                      label: `${value} column${value > 1 ? "s" : ""}`,
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          columns: Number(value) as 1 | 2,
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <ToolbarSelect
                    value={layoutSettings.sidebar_position ?? "right"}
                    ariaLabel="Sidebar position"
                    options={options.sidebarPositions.map((position) => ({
                      value: position,
                      label: position,
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          sidebar_position: value as "none" | "left" | "right",
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <ToolbarSelect
                    value={layoutSettings.density ?? "normal"}
                    ariaLabel="Layout density"
                    options={options.densities.map((density) => ({
                      value: density,
                      label: density,
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          density: value as NonNullable<
                            GlobalSettings["layout"]
                          >["density"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <Slider
                    label="Sidebar width"
                    min={options.sidebarWidthRange.min}
                    max={options.sidebarWidthRange.max}
                    value={parseInt(
                      layoutSettings.sidebar_width ??
                        settings.col_left_width ??
                        "35",
                      10,
                    )}
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
                  <ToolbarSelect
                    value={layoutSettings.header_alignment ?? "left"}
                    ariaLabel="Header alignment"
                    options={options.headerAlignments.map((alignment) => ({
                      value: alignment,
                      label: alignment,
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          header_alignment: value as NonNullable<
                            GlobalSettings["layout"]
                          >["header_alignment"],
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                  <label className={PANEL_TOGGLE_CLASS}>
                    <span className="text-xs font-medium text-foreground">
                      Photo enabled
                    </span>
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
                  <ToolbarSelect
                    value={layoutSettings.photo?.shape ?? "round"}
                    ariaLabel="Photo shape"
                    options={options.photoShapes.map((shape) => ({
                      value: shape,
                      label: shape,
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          photo: {
                            ...layoutSettings.photo,
                            shape: value as "round" | "square",
                          },
                        },
                      })
                    }
                    triggerClassName={PANEL_INPUT_CLASS}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === "sections" && (
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
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
                            disabled={
                              index === (settings.sections?.length ?? 0) - 1
                            }
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
                          onChange={(e) =>
                            updateSection(index, { label: e.target.value })
                          }
                          aria-label={`Section label ${section.type}`}
                          className={PANEL_INPUT_CLASS}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-foreground">
                              Visible
                            </span>
                            <input
                              type="checkbox"
                              checked={section.visible ?? true}
                              onChange={(e) =>
                                updateSection(index, {
                                  visible: e.target.checked,
                                })
                              }
                              aria-label={`Toggle section ${section.type}`}
                            />
                          </label>
                          <ToolbarSelect
                            value={section.placement ?? "main"}
                            ariaLabel={`Section placement ${section.type}`}
                            options={sectionPlacements.map((placement) => ({
                              value: placement,
                              label: placement,
                            }))}
                            onChange={(value) =>
                              updateSection(index, {
                                placement: value as "main" | "sidebar",
                              })
                            }
                            triggerClassName={PANEL_INPUT_CLASS}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <ToolbarSelect
                            value={section.display_mode ?? "list"}
                            ariaLabel={`Section display mode ${section.type}`}
                            options={sectionModes.map((mode) => ({
                              value: mode,
                              label: mode,
                            }))}
                            onChange={(value) =>
                              updateSection(index, {
                                display_mode: value as NonNullable<
                                  GlobalSettings["sections"]
                                >[number]["display_mode"],
                              })
                            }
                            triggerClassName={PANEL_INPUT_CLASS}
                          />
                          <ToolbarSelect
                            value={section.detail_level ?? "normal"}
                            ariaLabel={`Section detail level ${section.type}`}
                            options={sectionDetails.map((level) => ({
                              value: level,
                              label: level,
                            }))}
                            onChange={(value) =>
                              updateSection(index, {
                                detail_level: value as NonNullable<
                                  GlobalSettings["sections"]
                                >[number]["detail_level"],
                              })
                            }
                            triggerClassName={PANEL_INPUT_CLASS}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-foreground">
                              Dates
                            </span>
                            <input
                              type="checkbox"
                              checked={section.show_dates ?? true}
                              onChange={(e) =>
                                updateSection(index, {
                                  show_dates: e.target.checked,
                                })
                              }
                              aria-label={`Toggle dates ${section.type}`}
                            />
                          </label>
                          <label className={PANEL_TOGGLE_CLASS}>
                            <span className="text-xs font-medium text-foreground">
                              Locations
                            </span>
                            <input
                              type="checkbox"
                              checked={section.show_locations ?? true}
                              onChange={(e) =>
                                updateSection(index, {
                                  show_locations: e.target.checked,
                                })
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

          {activeTab === "advanced" && (
            <AdvancedCssPanel
              catalogue={catalogue}
              settings={advancedCssSettings}
              update={update}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3">
          <button
            onClick={() =>
              setGlobalSettings({ ...resetSettings, template_id: "modern" })
            }
            className="w-full cursor-pointer rounded-lg border border-input bg-background py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Reset to backend defaults
          </button>
        </div>
      </aside>
    </>
  );
}
