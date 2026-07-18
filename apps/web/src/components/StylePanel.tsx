"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { CvBuilderUiMode } from "@/app/tools/cv-creator/components/CvBuilderModeToggle";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";
import {
  DEFAULT_FONT,
  PANEL_INPUT_CLASS,
  PANEL_TOGGLE_CLASS,
} from "@/components/style-panel/constants";
import { AdvancedCssPanel } from "@/components/style-panel/AdvancedCssPanel";
import { LayoutTab } from "@/components/style-panel/LayoutTab";
import { PhotoTab } from "@/components/style-panel/PhotoTab";
import { SectionsTab } from "@/components/style-panel/SectionsTab";
import { SectionLabel } from "@/components/style-panel/controls";
import {
  ColorSwatchPicker,
  SteppedSlider,
  ToggleGrid,
} from "@/components/style-panel/visual-controls";
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

type Tab =
  | "document"
  | "template"
  | "layout"
  | "typography"
  | "spacing"
  | "colors"
  | "photo"
  | "sections"
  | "advanced";
type AccentTarget = NonNullable<
  NonNullable<GlobalSettings["colors"]>["accent_targets"]
>[number];

const ACCENT_TARGET_LABELS: Record<AccentTarget, string> = {
  name: "Nom",
  title: "Titre",
  headings: "Titres sections",
  dates: "Dates",
  links: "Liens",
  skills: "Compétences",
};

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
  const { cvData, setGlobalSettings, setProfile } = useCVStore();
  const [tab, setTab] = useState<Tab>("template");
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

  const reorderSections = (activeId: string, overId: string) => {
    if (activeId === overId) return;
    const sections = [...(settings.sections ?? [])];
    const fromIndex = sections.findIndex((section) => section.id === activeId);
    const toIndex = sections.findIndex((section) => section.id === overId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, item);
    update({ sections });
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "document", label: "Document", icon: "□" },
    { key: "template", label: "Modèles", icon: "" },
    { key: "layout", label: "Mise en page", icon: "◫" },
    { key: "typography", label: "Texte", icon: "Aa" },
    { key: "spacing", label: "Espacement", icon: "↕" },
    { key: "colors", label: "Couleurs", icon: "●" },
    { key: "photo", label: "Photo", icon: "◉" },
    { key: "sections", label: "Sections", icon: "≡" },
    { key: "advanced", label: "Expert", icon: "{}" },
  ];
  const visibleTabs = TABS.filter((item) => {
    if (uiMode === "simple") {
      return item.key === "template" || item.key === "colors";
    }
    if (uiMode === "normal") {
      return (
        item.key === "document" ||
        item.key === "template" ||
        item.key === "layout" ||
        item.key === "typography" ||
        item.key === "spacing" ||
        item.key === "colors"
      );
    }
    return true;
  });
  const isSimpleMode = uiMode === "simple";
  const isAdvancedMode = uiMode === "advanced";

  const sectionPlacements = options.sectionPlacements;
  const sectionModes = options.displayModes;
  const sectionDetails = options.detailLevels;
  const accentTargetOptions = options.accentTargets as AccentTarget[];
  const accentTargets: AccentTarget[] = colorSettings.accent_targets ?? [
    "title",
    "headings",
    "links",
    "skills",
  ];
  const toggleAccentTarget = (target: AccentTarget, checked: boolean) => {
    update({
      colors: {
        ...colorSettings,
        accent_targets: checked
          ? Array.from(new Set([...accentTargets, target]))
          : accentTargets.filter((item) => item !== target),
      },
    });
  };
  const isEmbedded = variant === "embedded";
  const activeTab = visibleTabs.some((item) => item.key === tab)
    ? tab
    : (visibleTabs[0]?.key ?? "template");

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
              Réglages fournis par le moteur
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
          <div
            className="flex shrink-0 overflow-x-auto border-b border-border"
            role="tablist"
            aria-label="Réglages de style"
          >
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                id={`cv-style-tab-${t.key}`}
                role="tab"
                aria-selected={activeTab === t.key}
                aria-controls={`cv-style-panel-${t.key}`}
                tabIndex={activeTab === t.key ? 0 : -1}
                onClick={() => setTab(t.key)}
                className={`flex min-w-20 flex-1 cursor-pointer flex-col items-center gap-0.5 whitespace-nowrap border-b-2 py-2.5 text-[11px] font-semibold transition-colors ${
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

        <div
          id={`cv-style-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`cv-style-tab-${activeTab}`}
          className="flex-1 space-y-5 overflow-y-auto px-5 pt-4 pb-24"
        >
          {activeTab === "document" && (
            <>
              <LayoutTab
                settings={settings}
                pageSettings={pageSettings}
                layoutSettings={layoutSettings}
                options={options}
                update={update}
                scope="document"
              />

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

          {activeTab === "template" && (
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

              {!isSimpleMode ? (
                <section>
                  <SectionLabel>Notes du template</SectionLabel>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Le moteur garantit la compatibilité du template. Les
                    réglages affichés ici sont appliqués à l’aperçu et à
                    l’export.
                  </div>
                </section>
              ) : null}
            </>
          )}

          {activeTab === "typography" && (
            <>
              <section>
                <SectionLabel>Polices</SectionLabel>
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
                <SectionLabel>Tailles</SectionLabel>
                <SteppedSlider
                  label="Taille du texte"
                  min={options.bodySize.min}
                  max={options.bodySize.max}
                  value={parseInt(
                    typographySettings.body_size ??
                      typographySettings.base_size ??
                      settings.font_size ??
                      "13",
                    10,
                  )}
                  unit="px"
                  onChange={(v) =>
                    update({
                      font_size: `${v}px`,
                      typography: {
                        ...typographySettings,
                        base_size: `${v}px`,
                        body_size: `${v}px`,
                      },
                    })
                  }
                />
                <SteppedSlider
                  label="Nom"
                  min={options.nameSize.min}
                  max={options.nameSize.max}
                  value={parseInt(typographySettings.name_size ?? "28", 10)}
                  unit="px"
                  onChange={(v) =>
                    update({
                      typography: {
                        ...typographySettings,
                        name_size: `${v}px`,
                      },
                    })
                  }
                />
                <SteppedSlider
                  label="Titre professionnel"
                  min={options.titleSize.min}
                  max={options.titleSize.max}
                  value={parseInt(typographySettings.title_size ?? "15", 10)}
                  unit="px"
                  onChange={(v) =>
                    update({
                      typography: { ...typographySettings, title_size: `${v}px` },
                    })
                  }
                />
                <SteppedSlider
                  label="Titres des sections"
                  min={options.sectionHeadingSize.min}
                  max={options.sectionHeadingSize.max}
                  value={parseInt(
                    typographySettings.section_heading_size ?? "10",
                    10,
                  )}
                  unit="px"
                  onChange={(v) =>
                    update({
                      typography: {
                        ...typographySettings,
                        section_heading_size: `${v}px`,
                      },
                    })
                  }
                />
                <SteppedSlider
                  label="Titres des entrées"
                  min={options.entryHeadingSize.min}
                  max={options.entryHeadingSize.max}
                  value={parseInt(
                    typographySettings.entry_heading_size ?? "14",
                    10,
                  )}
                  unit="px"
                  onChange={(v) =>
                    update({
                      typography: {
                        ...typographySettings,
                        entry_heading_size: `${v}px`,
                      },
                    })
                  }
                />
              </section>

              <section>
                <SectionLabel>Présentation</SectionLabel>
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
                      Titres en majuscules
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
            <LayoutTab
              settings={settings}
              pageSettings={pageSettings}
              layoutSettings={layoutSettings}
              options={options}
              update={update}
              scope="layout"
            />
          )}

          {activeTab === "spacing" && (
            <LayoutTab
              settings={settings}
              pageSettings={pageSettings}
              layoutSettings={layoutSettings}
              options={options}
              update={update}
              scope="spacing"
            />
          )}

          {activeTab === "colors" && (
            <>
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
                    .map((token) => {
                      const labels: Record<string, string> = {
                        primary: "Couleur principale",
                        secondary: "Couleur secondaire",
                        text: "Texte",
                        heading: "Titres",
                        sidebar_background: "Fond de colonne",
                        separators: "Séparateurs",
                      };
                      return (
                        <ColorSwatchPicker
                          key={token}
                          label={labels[token] ?? token.replace("_", " ")}
                          value={
                            (
                              colorSettings as Record<string, string | undefined>
                            )?.[token] ?? "#2563eb"
                          }
                          onChange={(value) =>
                            update({
                              colors: { ...colorSettings, [token]: value },
                            })
                          }
                        />
                      );
                    })}
                </div>
                {!isSimpleMode ? (
                  <label className={PANEL_TOGGLE_CLASS + " mt-3"}>
                    <span className="text-xs font-medium text-foreground">
                      Monochrome
                    </span>
                    <input
                      type="checkbox"
                      checked={colorSettings.monochrome ?? false}
                      onChange={(event) =>
                        update({
                          colors: {
                            ...colorSettings,
                            monochrome: event.target.checked,
                          },
                        })
                      }
                    />
                  </label>
                ) : null}
              </section>

              {!isSimpleMode ? (
                <section>
                  <ToggleGrid
                    label="Accent appliqué à"
                    values={accentTargets}
                    options={accentTargetOptions.map((target) => ({
                      value: target,
                      label: ACCENT_TARGET_LABELS[target],
                    }))}
                    onChange={toggleAccentTarget}
                  />
                </section>
              ) : null}
            </>
          )}

          {activeTab === "photo" && (
            <PhotoTab
              profile={cvData.profile}
              settings={layoutSettings.photo ?? { enabled: false }}
              options={catalogue.layout.photo}
              updateProfile={setProfile}
              updateSettings={(patch) =>
                update({
                  layout: {
                    ...layoutSettings,
                    photo: { ...layoutSettings.photo, ...patch },
                  },
                })
              }
            />
          )}

          {activeTab === "sections" && (
            <SectionsTab
              settings={settings}
              sectionPlacements={sectionPlacements}
              sectionModes={sectionModes}
              sectionDetails={sectionDetails}
              headingStyles={options.headingStyles}
              headingCapitalization={options.headingCapitalization}
              titleSubtitleOrders={options.titleSubtitleOrders}
              dateLocationPositions={options.dateLocationPositions}
              skillStyles={options.skillStyles}
              updateSection={updateSection}
              moveSection={moveSection}
              reorderSections={reorderSections}
            />
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
            Réinitialiser les réglages
          </button>
        </div>
      </aside>
    </>
  );
}
