import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { GlobalSettings } from "@/store/useCVStore";

import {
  PANEL_INPUT_CLASS,
  PANEL_MUTED_CARD_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel } from "./controls";

type SectionSettings = NonNullable<GlobalSettings["sections"]>[number];

interface SectionsTabProps {
  settings: GlobalSettings;
  sectionPlacements: string[];
  sectionModes: string[];
  sectionDetails: string[];
  updateSection: (index: number, patch: Partial<SectionSettings>) => void;
  moveSection: (index: number, delta: -1 | 1) => void;
}

export function SectionsTab({
  settings,
  sectionPlacements,
  sectionModes,
  sectionDetails,
  updateSection,
  moveSection,
}: SectionsTabProps) {
  return (
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
  );
}
