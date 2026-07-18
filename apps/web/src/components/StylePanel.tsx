"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { CvBuilderUiMode } from "@/app/tools/cv-creator/components/CvBuilderModeToggle";
import { useCVStore } from "@/store/useCVStore";
import type { GlobalSettings } from "@/store/useCVStore";
import {
  PANEL_INPUT_CLASS,
  PANEL_TOGGLE_CLASS,
} from "@/components/style-panel/constants";
import { AdvancedCssPanel } from "@/components/style-panel/AdvancedCssPanel";
import { LayoutTab } from "@/components/style-panel/LayoutTab";
import { PhotoTab } from "@/components/style-panel/PhotoTab";
import { HeaderTab, LinksTab } from "@/components/style-panel/HeaderTab";
import { TypographyTab } from "@/components/style-panel/TypographyTab";
import { SectionsTab } from "@/components/style-panel/SectionsTab";
import { SectionLabel } from "@/components/style-panel/controls";
import {
  ColorSwatchPicker,
  LayoutPreview,
  ToggleGrid,
  VisualOptionGroup,
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
  | "header"
  | "links"
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
const TAB_DESCRIPTIONS: Record<Tab, string> = {
  document: "Format, langue et comportement des pages.",
  template: "Choisis une base visuelle adaptée à ton CV.",
  layout: "Organise les colonnes et la densité générale.",
  typography: "Ajuste les polices et la hiérarchie du texte.",
  spacing: "Règle les marges et le rythme vertical.",
  colors: "Personnalise la palette et les accents.",
  photo: "Ajoute une photo validée par le backend.",
  header: "Organise le nom et les coordonnées.",
  links: "Harmonise l’apparence des liens.",
  sections: "Ordonne et présente chaque section.",
  advanced: "Réglages experts et CSS encadré.",
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
  const linkSettings = settings.links ?? {};
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
    { key: "header", label: "En-tête", icon: "▤" },
    { key: "links", label: "Liens", icon: "↗" },
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
          item.key === "colors" ||
          item.key === "sections"
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
              Studio de design
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
            className={`grid shrink-0 border-b border-border ${isAdvancedMode ? "grid-cols-4" : "grid-cols-3"}`}
            role="tablist"
            aria-label="Réglages de style"
            onKeyDown={(event) => {
              const tabs = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
              );
              const current = tabs.indexOf(document.activeElement as HTMLElement);
              if (current < 0) return;
              let next = current;
              if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
              else if (event.key === "ArrowLeft")
                next = (current - 1 + tabs.length) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              tabs[next]?.focus();
              tabs[next]?.click();
            }}
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
                className={`flex min-w-0 cursor-pointer flex-col items-center gap-0.5 border-b-2 px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-colors ${
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
          <p className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            {TAB_DESCRIPTIONS[activeTab]}
          </p>
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
                      value={localeSettings.date_format ?? "MM/YYYY"}
                      ariaLabel="Format des dates"
                      options={options.dateFormats.map((format) => ({
                        value: format,
                        label: format,
                      }))}
                      onChange={(date_format) =>
                        update({
                          locale: {
                            ...localeSettings,
                            date_format: date_format as NonNullable<
                              GlobalSettings["locale"]
                            >["date_format"],
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
                      <span className="flex h-14 w-full items-center justify-center rounded-md bg-muted/50">
                        <LayoutPreview
                          columns={
                            template.compatibleLayouts.includes(2) ? 2 : 1
                          }
                          sidebar={
                            template.compatibleLayouts.includes(2)
                              ? "right"
                              : "none"
                          }
                        />
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
            <TypographyTab
              settings={settings}
              typography={typographySettings}
              options={options}
              update={update}
            />
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
                  <VisualOptionGroup
                    label="Ambiance"
                    value={colorSettings.palette_preset ?? "tech"}
                    options={options.palettePresets.map((preset) => ({
                      value: preset,
                      label:
                        preset === "corporate"
                          ? "Professionnel"
                          : preset === "minimal"
                            ? "Minimal"
                            : preset === "creative"
                              ? "Créatif"
                              : preset === "custom"
                                ? "Personnalisé"
                                : "Tech",
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
                    columns={2}
                  />
                ) : null}
                {isSimpleMode ? (
                  <div className="mt-4">
                    <VisualOptionGroup
                      label="Densité"
                      value={layoutSettings.density ?? "normal"}
                      options={options.densities.map((density) => ({
                        value: density,
                        label:
                          density === "compact"
                            ? "Compact"
                            : density === "student"
                              ? "Aéré"
                              : density === "senior"
                                ? "Détaillé"
                                : "Normal",
                      }))}
                      onChange={(density) =>
                        update({
                          layout: {
                            ...layoutSettings,
                            density: density as NonNullable<
                              GlobalSettings["layout"]
                            >["density"],
                          },
                        })
                      }
                      columns={2}
                    />
                  </div>
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

          {activeTab === "header" && (
            <HeaderTab
              settings={layoutSettings}
              alignments={options.headerAlignments}
              positions={options.headerPositions}
              arrangements={options.headerDetailsArrangements}
              iconStyles={options.headerIconStyles}
              update={(patch) =>
                update({ layout: { ...layoutSettings, ...patch } })
              }
            />
          )}

          {activeTab === "links" && (
            <LinksTab
              settings={linkSettings}
              colors={options.linkColors}
              update={(patch) =>
                update({ links: { ...linkSettings, ...patch } })
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
              iconStyles={options.sectionIconStyles}
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

        {isAdvancedMode && activeTab === "advanced" ? (
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
        ) : null}
      </aside>
    </>
  );
}
