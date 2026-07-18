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
import { VisualOptionGroup } from "./visual-controls";

type SectionSettings = NonNullable<GlobalSettings["sections"]>[number];

const DATE_LOCATION_SECTION_TYPES = new Set(["experience", "education"]);
const SKILL_LIKE_SECTION_TYPES = new Set(["skills", "languages", "interests"]);
const HEADING_STYLE_LABELS: Record<string, string> = {
  line: "Ligne",
  plain: "Simple",
  box: "Encadré",
  accent: "Accent",
};
const CAPITALIZATION_LABELS: Record<string, string> = {
  normal: "Normal",
  uppercase: "Majuscules",
};
const DATE_LOCATION_POSITION_LABELS: Record<string, string> = {
  inline: "Sur la ligne",
  right: "À droite",
  below: "En dessous",
};
const SKILL_STYLE_LABELS: Record<string, string> = {
  tags: "Tags",
  plain: "Texte simple",
  bars: "Barres",
  grid: "Grille",
  rows: "Lignes",
  compact: "Compact",
  bubble: "Bulles",
  level: "Niveaux",
  dots: "Points",
};
const ICON_STYLE_LABELS: Record<string, string> = {
  none: "Sans icône",
  outline: "Contour",
  filled: "Pleine",
};

interface SectionsTabProps {
  settings: GlobalSettings;
  sectionPlacements: string[];
  sectionModes: string[];
  sectionDetails: string[];
  headingStyles: string[];
  headingCapitalization: string[];
  titleSubtitleOrders: string[];
  dateLocationPositions: string[];
  skillStyles: string[];
  iconStyles: string[];
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
  headingStyles,
  headingCapitalization,
  titleSubtitleOrders,
  dateLocationPositions,
  skillStyles,
  iconStyles,
  updateSection,
  moveSection,
}: {
  section: SectionSettings;
  index: number;
  total: number;
  sectionPlacements: string[];
  sectionModes: string[];
  sectionDetails: string[];
  headingStyles: string[];
  headingCapitalization: string[];
  titleSubtitleOrders: string[];
  dateLocationPositions: string[];
  skillStyles: string[];
  iconStyles: string[];
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

          <div className="grid gap-3">
            <VisualOptionGroup
              label="Style du titre"
              value={section.heading_style ?? "line"}
              options={headingStyles.map((style) => ({
                value: style,
                label: HEADING_STYLE_LABELS[style] ?? style,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  heading_style: value as SectionSettings["heading_style"],
                })
              }
            />
            <VisualOptionGroup
              label="Capitalisation"
              value={section.heading_capitalization ?? "uppercase"}
              options={headingCapitalization.map((style) => ({
                value: style,
                label: CAPITALIZATION_LABELS[style] ?? style,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  heading_capitalization:
                    value as SectionSettings["heading_capitalization"],
                })
              }
            />
            <VisualOptionGroup
              label="Icône du titre"
              value={section.icon_style ?? "none"}
              options={iconStyles.map((style) => ({
                value: style,
                label: ICON_STYLE_LABELS[style] ?? style,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  icon_style: value as SectionSettings["icon_style"],
                })
              }
            />
            <label className={PANEL_TOGGLE_CLASS}>
              <span className="text-xs font-medium text-foreground">
                Ligne sous le titre
              </span>
              <input
                type="checkbox"
                checked={section.heading_line ?? true}
                onChange={(event) =>
                  updateSection(index, { heading_line: event.target.checked })
                }
              />
            </label>
          </div>

          {supportsDates && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ToolbarSelect
                  value={section.title_subtitle_order ?? "title_first"}
                  ariaLabel={`Ordre titre sous-titre ${section.type}`}
                  options={titleSubtitleOrders.map((order) => ({
                    value: order,
                    label:
                      order === "subtitle_first"
                        ? "Organisation d'abord"
                        : "Titre d'abord",
                  }))}
                  onChange={(value) =>
                    updateSection(index, {
                      title_subtitle_order:
                        value as SectionSettings["title_subtitle_order"],
                    })
                  }
                  triggerClassName={PANEL_INPUT_CLASS}
                />
                <ToolbarSelect
                  value={section.date_location_position ?? "inline"}
                  ariaLabel={`Position dates lieux ${section.type}`}
                  options={dateLocationPositions.map((position) => ({
                    value: position,
                    label: DATE_LOCATION_POSITION_LABELS[position] ?? position,
                  }))}
                  onChange={(value) =>
                    updateSection(index, {
                      date_location_position:
                        value as SectionSettings["date_location_position"],
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
            </>
          )}

          {SKILL_LIKE_SECTION_TYPES.has(section.type) && (
            <VisualOptionGroup
              label="Présentation"
              value={section.skill_style ?? "tags"}
              options={skillStyles.map((style) => ({
                value: style,
                label: SKILL_STYLE_LABELS[style] ?? style,
              }))}
              onChange={(value) =>
                updateSection(index, {
                  skill_style: value as SectionSettings["skill_style"],
                })
              }
              columns={3}
            />
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
  headingStyles,
  headingCapitalization,
  titleSubtitleOrders,
  dateLocationPositions,
  skillStyles,
  iconStyles,
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
                  headingStyles={headingStyles}
                  headingCapitalization={headingCapitalization}
                  titleSubtitleOrders={titleSubtitleOrders}
                  dateLocationPositions={dateLocationPositions}
              skillStyles={skillStyles}
              iconStyles={iconStyles}
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
