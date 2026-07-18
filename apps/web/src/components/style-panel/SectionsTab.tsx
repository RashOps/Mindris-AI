/* eslint-disable react-hooks/refs -- dnd-kit exposes ref/listener bindings that are intentionally spread during render. */
import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  type DragEndEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { GlobalSettings } from "@/store/useCVStore";

import {
  PANEL_INPUT_CLASS,
  PANEL_MUTED_CARD_CLASS,
  PANEL_TOGGLE_CLASS,
} from "./constants";
import { SectionLabel } from "./controls";
import { VisualOptionGroup } from "./visual-controls";
import {
  moveSectionToPlacement,
  moveSectionWithinPlacement,
  placementOf,
  sectionsForPlacement,
  type SectionPlacement,
} from "./section-placement";

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
const DISPLAY_MODE_LABELS: Record<string, string> = {
  list: "Liste",
  compact: "Compact",
  timeline: "Chronologie",
  cards: "Cartes",
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
  supportsTwoColumns: boolean;
  updateSection: (index: number, patch: Partial<SectionSettings>) => void;
  replaceSections: (sections: SectionSettings[]) => void;
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

export function SectionCard({
  section,
  index,
  sectionModes,
  sectionDetails,
  headingStyles,
  headingCapitalization,
  titleSubtitleOrders,
  dateLocationPositions,
  skillStyles,
  iconStyles,
  updateSection,
  canTransfer,
  onTransfer,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  section: SectionSettings;
  index: number;
  sectionModes: string[];
  sectionDetails: string[];
  headingStyles: string[];
  headingCapitalization: string[];
  titleSubtitleOrders: string[];
  dateLocationPositions: string[];
  skillStyles: string[];
  iconStyles: string[];
  updateSection: (index: number, patch: Partial<SectionSettings>) => void;
  canTransfer: boolean;
  onTransfer: () => void;
  onMove: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const placement = placementOf(section);
  const sortable = useSortable({ id: section.id, data: { placement } });
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
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-sm font-semibold text-foreground">
            {section.label}
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            {DISPLAY_MODE_LABELS[section.display_mode ?? "list"] ??
              section.display_mode ??
              "Liste"}
          </span>
        </button>
        {canTransfer ? (
          <button
            type="button"
            onClick={onTransfer}
            aria-label={`Déplacer ${section.label} vers la colonne ${placement === "main" ? "secondaire" : "principale"}`}
            title={`Déplacer vers la colonne ${placement === "main" ? "secondaire" : "principale"}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {placement === "main" ? (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() =>
            updateSection(index, { visible: !(section.visible ?? true) })
          }
          aria-pressed={section.visible ?? true}
          aria-label={`${section.visible ?? true ? "Masquer" : "Afficher"} la section ${section.label}`}
          title={
            section.visible ?? true
              ? "Masquer la section"
              : "Afficher la section"
          }
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {section.visible ?? true ? (
            <Eye className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <SectionAdvancedSettings>
          <input
            value={section.label}
            onChange={(event) =>
              updateSection(index, { label: event.target.value })
            }
            aria-label={`Libellé section ${section.type}`}
            className={PANEL_INPUT_CLASS}
          />

          <div className="grid gap-2">
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
              <div className="grid gap-3">
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
                <VisualOptionGroup
                  label="Position des dates et lieux"
                  value={section.date_location_position ?? "inline"}
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
              onClick={() => onMove(-1)}
              disabled={!canMoveUp}
              className="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Monter
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={!canMoveDown}
              className="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-muted-foreground disabled:opacity-40"
            >
              Descendre
            </button>
          </div>
        </SectionAdvancedSettings>
      )}
    </div>
  );
}

export function SectionAdvancedSettings({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mt-3 grid gap-2">{children}</div>;
}

export function SectionLane({
  placement,
  title,
  description,
  sections,
  children,
}: {
  placement: SectionPlacement;
  title: string;
  description: string;
  sections: SectionSettings[];
  children: React.ReactNode;
}) {
  const droppable = useDroppable({
    id: `section-lane-${placement}`,
    data: { placement },
  });

  return (
    <section
      ref={droppable.setNodeRef}
      aria-label={title}
      className={`min-w-0 rounded-xl border p-2 transition-colors ${
        droppable.isOver
          ? "border-violet-500 bg-violet-50/70 dark:bg-violet-950/30"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="mb-2 px-1">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <SortableContext
        items={sections.map((section) => section.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-16 space-y-2">
          {children}
          {sections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-2 py-5 text-center text-[11px] text-muted-foreground">
              Dépose une section ici
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export function SectionPlacementBoard({
  sections,
  twoColumns,
  renderCard,
}: {
  sections: SectionSettings[];
  twoColumns: boolean;
  renderCard: (section: SectionSettings) => React.ReactNode;
}) {
  const mainSections = sectionsForPlacement(sections, "main");
  const sidebarSections = sectionsForPlacement(sections, "sidebar");

  if (!twoColumns) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Ce modèle utilise une seule colonne. Tu peux modifier l’ordre des
          sections, mais pas leur répartition.
        </div>
        <SectionLane
          placement="main"
          title="Ordre des sections"
          description="Du haut vers le bas dans le CV"
          sections={sections}
        >
          {sections.map(renderCard)}
        </SectionLane>
      </div>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SectionLane
        placement="main"
        title="Colonne principale"
        description="Expériences et contenu prioritaire"
        sections={mainSections}
      >
        {mainSections.map(renderCard)}
      </SectionLane>
      <SectionLane
        placement="sidebar"
        title="Colonne secondaire"
        description="Compétences et informations courtes"
        sections={sidebarSections}
      >
        {sidebarSections.map(renderCard)}
      </SectionLane>
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
  supportsTwoColumns,
  updateSection,
  replaceSections,
}: SectionsTabProps) {
  const sections = settings.sections ?? [];
  const twoColumns =
    supportsTwoColumns &&
    settings.layout?.columns === 2 &&
    settings.layout?.sidebar_position !== "none" &&
    sectionPlacements.includes("sidebar");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const over = event.over;
    if (!over) return;
    const overId = String(over.id);
    const placement = over.data.current?.placement as
      | SectionPlacement
      | undefined;
    if (!placement) return;
    const activeSection = sections.find((section) => section.id === activeId);
    if (!activeSection) return;
    const targetPlacement = twoColumns ? placement : placementOf(activeSection);
    replaceSections(
      moveSectionToPlacement(
        sections,
        activeId,
        targetPlacement,
        overId.startsWith("section-lane-") ? undefined : overId,
      ),
    );
  };

  return (
    <section>
      <SectionLabel>Organisation des sections</SectionLabel>
      <p className="mb-3 text-xs text-muted-foreground">
        Fais glisser les sections pour les ordonner, ou utilise les flèches
        pour changer de colonne.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={handleDragEnd}
      >
        <SectionPlacementBoard
          sections={sections}
          twoColumns={twoColumns}
          renderCard={(section) => {
            const index = sections.findIndex((item) => item.id === section.id);
            const lane = twoColumns
              ? sectionsForPlacement(sections, placementOf(section))
              : sections;
            const laneIndex = lane.findIndex((item) => item.id === section.id);
            return (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                sectionModes={sectionModes}
                sectionDetails={sectionDetails}
                headingStyles={headingStyles}
                headingCapitalization={headingCapitalization}
                titleSubtitleOrders={titleSubtitleOrders}
                dateLocationPositions={dateLocationPositions}
                skillStyles={skillStyles}
                iconStyles={iconStyles}
                updateSection={updateSection}
                canTransfer={twoColumns}
                onTransfer={() =>
                  replaceSections(
                    moveSectionToPlacement(
                      sections,
                      section.id,
                      placementOf(section) === "main" ? "sidebar" : "main",
                    ),
                  )
                }
                onMove={(delta) =>
                  replaceSections(
                    moveSectionWithinPlacement(sections, section.id, delta),
                  )
                }
                canMoveUp={laneIndex > 0}
                canMoveDown={laneIndex < lane.length - 1}
              />
            );
          }}
        />
      </DndContext>
    </section>
  );
}
