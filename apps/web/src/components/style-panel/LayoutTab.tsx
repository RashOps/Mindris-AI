import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { GlobalSettings } from "@/store/useCVStore";
import type { resolveCustomizationOptionLists } from "@/lib/customization-catalogue";

import {
  PANEL_INPUT_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel, Slider } from "./controls";

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
      )}

      {(scope === "all" || scope === "spacing") && (
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
      )}

      {(scope === "all" || scope === "layout") && (
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
      )}

      {(scope === "all" || scope === "layout") && (
              <section>
                <SectionLabel>Header</SectionLabel>
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
                </div>
              </section>
      )}

    </>
  );
}
