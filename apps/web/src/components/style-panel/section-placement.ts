import type { GlobalSettings } from "@/store/useCVStore";

export type SectionSettings = NonNullable<GlobalSettings["sections"]>[number];
export type SectionPlacement = "main" | "sidebar";

export function placementOf(section: SectionSettings): SectionPlacement {
  return section.placement === "sidebar" ? "sidebar" : "main";
}

export function sectionsForPlacement(
  sections: SectionSettings[],
  placement: SectionPlacement,
): SectionSettings[] {
  return sections.filter((section) => placementOf(section) === placement);
}

export function moveSectionToPlacement(
  sections: SectionSettings[],
  activeId: string,
  placement: SectionPlacement,
  overId?: string,
): SectionSettings[] {
  const activeIndex = sections.findIndex((section) => section.id === activeId);
  if (activeIndex < 0) return sections;

  const next = [...sections];
  const [active] = next.splice(activeIndex, 1);
  const moved = { ...active, placement };
  const overIndex = overId
    ? next.findIndex((section) => section.id === overId)
    : -1;

  if (overIndex >= 0) {
    next.splice(overIndex, 0, moved);
    return next;
  }

  let lastPlacementIndex = -1;
  next.forEach((section, index) => {
    if (placementOf(section) === placement) lastPlacementIndex = index;
  });
  next.splice(lastPlacementIndex + 1, 0, moved);
  return next;
}

export function moveSectionWithinPlacement(
  sections: SectionSettings[],
  activeId: string,
  delta: -1 | 1,
): SectionSettings[] {
  const active = sections.find((section) => section.id === activeId);
  if (!active) return sections;
  const lane = sectionsForPlacement(sections, placementOf(active));
  const laneIndex = lane.findIndex((section) => section.id === activeId);
  const target = lane[laneIndex + delta];
  if (!target) return sections;
  return moveSectionToPlacement(
    sections,
    activeId,
    placementOf(active),
    delta > 0 ? lane[laneIndex + 2]?.id : target.id,
  );
}
