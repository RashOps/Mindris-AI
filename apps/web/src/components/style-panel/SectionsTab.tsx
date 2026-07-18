/* eslint-disable react-hooks/refs -- dnd-kit exposes ref/listener bindings that are intentionally spread during render. */
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { GlobalSettings } from "@/store/useCVStore";

import {
  PANEL_INPUT_CLASS,
  PANEL_MUTED_CARD_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel } from "./controls";

type SectionSettings = NonNullable<GlobalSettings["sections"]>[number];

const DATE_LOCATION_SECTION_TYPES = new Set(["experience", "education"]);
const SKILL_LIKE_SECTION_TYPES = new Set(["skills", "languages", "interests"]);

interface SectionsTabProps {
  settings: GlobalSettings;
  sectionPlacements: string[];
  sectionModes: string[];
  sectionDetails: string[];
  updateSection: (index: number, patch: Partial<SectionSettings>) => void;
  moveSection: (index: number, delta: -1 | 1) => void;
  reorderSections: (activeId: string, overId: string) => void;
}

function sectionDisplayModes(section: SectionSettings, sectionModes: string[]) {
  if (SKILL_LIKE_SECTION_TYPES.has(section.type)) {
    return sectionModes.filter((mode) => mode !== "timeline");
  }
  if (section.type === "experience" || section.type === "education") {
    return sectionModes;
  }
  return sectionModes.filter((mode) => mode !== "timeline");
}

function SortableSectionCard({
  section,
  index,
  total,
  sectionPlacements,
  sectionModes,
  sectionDetails,
  updateSection,
  moveSection,
}: {
  section: SectionSettings;
  index: number;
  total: number;
  sectionPlacements: string[];
  sectionModes: string[];
  sectionDetails: string[];
  updateSection: (index: number, patch: Partial<SectionSettings>) => void;
  moveSection: (index: number, delta: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sortable = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };
  const supportsDates = DATE_LOCATION_SECTION_TYPES.has(section.type);
  const modes = sectionDisplayModes(section, sectionModes);

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={`${PANEL_MUTED_CARD_CLASS} ${sortable.isDragging ? "opacity-80 shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          ref={sortable.setActivatorNodeRef}
          {...sortable.attributes}
          {...sortable.listeners}
          aria-label={`Réordonner ${section.label}`}
          className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md border border-input bg-background text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-semibold text-foreground">
            {section.label}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            {section.type} · {section.placement ?? "main"} ·{" "}
            {section.display_mode ?? "list"}
          </span>
        </button>
        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground">
          Visible
          <input
            type="checkbox"
            checked={section.visible ?? true}
            onChange={(event) =>
              updateSection(index, { visible: event.target.checked })
            }
            aria-label={`Afficher la section ${section.type}`}
          />
        </label>
      </div>

      {expanded && (
        <div className="mt-3 grid gap-2">
          <input
            value={section.label}
            onChange={(event) =>
              updateSection(index, { label: event.target.value })
            }
            aria-label={`Libellé section ${section.type}`}
            className={PANEL_INPUT_CLASS}
          />

          <div className="grid grid-cols-2 gap-2">
            <ToolbarSelect
              value={section.placement ?? "main"}
              ariaLabel={`Placement section ${section.type}`}
              options={sectionPlacements.map((placement) => ({
                value: placement,
                label: placement === "sidebar" ? "sidebar" : "main",
              }))}
              onChange={(value) =>
                updateSection(index, {
                  placement: value as "main" | "sidebar",
                })
              }
              triggerClassName={PANEL_INPUT_CLASS}
            />
            <ToolbarSelect
              value={section.display_mode ?? "list"}
              ariaLabel={`Affichage section ${section.type}`}
              options={modes.map((mode) => ({
                value: mode,
                label: mode,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  display_mode: value as SectionSettings["display_mode"],
                })
              }
              triggerClassName={PANEL_INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ToolbarSelect
              value={section.detail_level ?? "normal"}
              ariaLabel={`Niveau de détail section ${section.type}`}
              options={sectionDetails.map((level) => ({
                value: level,
                label: level,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  detail_level: value as SectionSettings["detail_level"],
                })
              }
              triggerClassName={PANEL_INPUT_CLASS}
            />
            <label className={PANEL_TOGGLE_CLASS}>
              <span className="text-xs font-medium text-foreground">
                Saut de page
              </span>
              <input
                type="checkbox"
                checked={section.page_break_before ?? false}
                onChange={(event) =>
                  updateSection(index, {
                    page_break_before: event.target.checked,
                  })
                }
                aria-label={`Saut de page avant ${section.type}`}
              />
            </label>
          </div>

          {supportsDates && (
            <div className="grid grid-cols-2 gap-2">
              <label className={PANEL_TOGGLE_CLASS}>
                <span className="text-xs font-medium text-foreground">
                  Dates
                </span>
                <input
                  type="checkbox"
                  checked={section.show_dates ?? true}
                  onChange={(event) =>
                    updateSection(index, {
                      show_dates: event.target.checked,
                    })
                  }
                  aria-label={`Afficher les dates ${section.type}`}
                />
              </label>
              <label className={PANEL_TOGGLE_CLASS}>
                <span className="text-xs font-medium text-foreground">
                  Lieux
                </span>
                <input
                  type="checkbox"
                  checked={section.show_locations ?? true}
                  onChange={(event) =>
                    updateSection(index, {
                      show_locations: event.target.checked,
                    })
                  }
                  aria-label={`Afficher les lieux ${section.type}`}
                />
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => moveSection(index, -1)}
              disabled={index === 0}
              className="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Monter
            </button>
            <button
              type="button"
              onClick={() => moveSection(index, 1)}
              disabled={index === total - 1}
              className="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Descendre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SectionsTab({
  settings,
  sectionPlacements,
  sectionModes,
  sectionDetails,
  updateSection,
  moveSection,
  reorderSections,
}: SectionsTabProps) {
  const sections = settings.sections ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;
    reorderSections(activeId, overId);
  };

  return (
    <section>
      <SectionLabel>Organisation des sections</SectionLabel>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sections.map((section, index) => (
              <SortableSectionCard
                key={section.id}
                section={section}
                index={index}
                total={sections.length}
                sectionPlacements={sectionPlacements}
                sectionModes={sectionModes}
                sectionDetails={sectionDetails}
                updateSection={updateSection}
                moveSection={moveSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
