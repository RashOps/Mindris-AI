import { describe, expect, test } from "bun:test";

import { guideSections } from "./guide-content";

describe("localized guide content", () => {
  test("keeps stable section ids and complete English content", () => {
    const french = guideSections("fr");
    const english = guideSections("en");

    expect(english.map((section) => section.id)).toEqual(
      french.map((section) => section.id),
    );
    expect(english.every((section) => section.items.length > 0)).toBe(true);
    expect(english.every((section) => section.checklist.length > 0)).toBe(true);
    expect(english[0]?.title).toBe("Mindris in one loop");
  });
});
