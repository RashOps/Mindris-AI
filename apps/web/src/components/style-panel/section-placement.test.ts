import { describe, expect, test } from "bun:test";

import {
  moveSectionToPlacement,
  moveSectionWithinPlacement,
  type SectionSettings,
} from "./section-placement";

const sections: SectionSettings[] = [
  { id: "experience", type: "experience", label: "Expérience", placement: "main" },
  { id: "projects", type: "projects", label: "Projets", placement: "main" },
  { id: "skills", type: "skills", label: "Compétences", placement: "sidebar" },
  { id: "languages", type: "languages", label: "Langues", placement: "sidebar" },
];

describe("section placement", () => {
  test("moves a section to the secondary column without changing other order", () => {
    const result = moveSectionToPlacement(sections, "experience", "sidebar");

    expect(result.map((section) => section.id)).toEqual([
      "projects",
      "skills",
      "languages",
      "experience",
    ]);
    expect(result.find((section) => section.id === "experience")?.placement).toBe(
      "sidebar",
    );
  });

  test("inserts a transferred section before the drop target", () => {
    const result = moveSectionToPlacement(
      sections,
      "projects",
      "sidebar",
      "languages",
    );

    expect(result.map((section) => section.id)).toEqual([
      "experience",
      "skills",
      "projects",
      "languages",
    ]);
  });

  test("reorders a section only inside its current column", () => {
    const result = moveSectionWithinPlacement(sections, "languages", -1);
    expect(result.map((section) => section.id)).toEqual([
      "experience",
      "projects",
      "languages",
      "skills",
    ]);
  });
});
