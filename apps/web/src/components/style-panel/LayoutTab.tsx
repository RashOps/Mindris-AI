import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { GlobalSettings } from "@/store/useCVStore";
import type { resolveCustomizationOptionLists } from "@/lib/customization-catalogue";

import {
  PANEL_INPUT_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel, Slider } from "./controls";
import {
  AlignmentPreview,
  LayoutPreview,
  VisualOptionGroup,
} from "./visual-controls";

type StyleOptions = ReturnType<typeof resolveCustomizationOptionLists>;

interface LayoutTabProps {
  settings: GlobalSettings;
  pageSettings: NonNullable<GlobalSettings["page"]>;
  layoutSettings: NonNullable<GlobalSettings["layout"]>;
  options: StyleOptions;
  update: (patch: Partial<GlobalSettings>) => void;
  scope?: "all" | "document" | "layout" | "spacing";
}

export function LayoutTab({
  settings,
  pageSettings,
  layoutSettings,
  options,
  update,
  scope = "all",
}: LayoutTabProps) {
  return (
    <>
      {(scope === "all" || scope === "document") && (
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
                      label: mode === "auto" ? "Automatique" : "Manuel",
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
                        Objectif une page
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        Ajuste la densité sans supprimer de contenu.
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
      )}

      {(scope === "all" || scope === "spacing") && (
              <section>
                <SectionLabel>Marges et rythme</SectionLabel>
                <Slider
                  label="Marges horizontales"
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
                  label="Marges verticales"
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
                  label="Espacement des éléments"
                  min={4}
                  max={36}
                  value={parseInt(settings.entry_spacing ?? "20", 10)}
                  unit="px"
                  onChange={(v) => update({ entry_spacing: `${v}px` })}
                />
              </section>
      )}

      {(scope === "all" || scope === "layout") && (
              <section>
                <SectionLabel>Colonnes</SectionLabel>
                <div className="grid gap-4">
                  <VisualOptionGroup
                    label="Structure"
                    value={layoutSettings.columns ?? 2}
                    options={options.columns.map((value) => ({
                      value,
                      label: value === 1 ? "Une colonne" : "Deux colonnes",
                      preview: (
                        <LayoutPreview
                          columns={value as 1 | 2}
                          sidebar={layoutSettings.sidebar_position ?? "right"}
                        />
                      ),
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          columns: value as 1 | 2,
                        },
                      })
                    }
                  />
                  <VisualOptionGroup
                    label="Position de la colonne secondaire"
                    value={layoutSettings.sidebar_position ?? "right"}
                    options={options.sidebarPositions.map((position) => ({
                      value: position,
                      label:
                        position === "left"
                          ? "À gauche"
                          : position === "right"
                            ? "À droite"
                            : "Aucune",
                      preview: (
                        <LayoutPreview
                          columns={position === "none" ? 1 : 2}
                          sidebar={position as "none" | "left" | "right"}
                        />
                      ),
                    }))}
                    onChange={(value) =>
                      update({
                        layout: {
                          ...layoutSettings,
                          sidebar_position: value as "none" | "left" | "right",
                        },
                      })
                    }
                  />
                  <ToolbarSelect
                    value={layoutSettings.density ?? "normal"}
                    ariaLabel="Layout density"
                    options={options.densities.map((density) => ({
                      value: density,
                      label:
                        density === "student"
                          ? "Débutant"
                          : density === "compact"
                            ? "Compact"
                            : density === "senior"
                              ? "Expérimenté"
                              : "Normal",
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
                    label="Largeur de la colonne"
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
      )}

      {(scope === "all" || scope === "layout") && (
              <section>
                <SectionLabel>En-tête</SectionLabel>
                <div className="grid gap-2">
                  <VisualOptionGroup
                    label="Alignement"
                    value={layoutSettings.header_alignment ?? "left"}
                    options={options.headerAlignments.map((alignment) => ({
                      value: alignment,
                      label:
                        alignment === "left"
                          ? "Gauche"
                          : alignment === "right"
                            ? "Droite"
                            : "Centré",
                      preview: (
                        <AlignmentPreview
                          value={alignment as "left" | "center" | "right"}
                        />
                      ),
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
                  />
                </div>
              </section>
      )}

    </>
  );
}
