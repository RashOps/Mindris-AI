import { describe, expect, test } from "bun:test";

import {
  APP_NAV_ITEMS,
  APP_SIDEBAR_SECTIONS,
  nextDesktopSidebarCompactState,
  resolveDesktopSidebarLayout,
  SIDEBAR_WIDTH_EXPANDED,
} from "./layout";

describe("app shell sidebar layout", () => {
  test("exposes guide as a first-class tool route instead of a drawer-only utility", () => {
    const guide = APP_NAV_ITEMS.find((item) => item.id === "guide");

    expect(guide?.href).toBe("/tools/guide");
    expect(guide?.label).toBe("Guide");
  });

  test("places configuration above local services", () => {
    const ids = APP_SIDEBAR_SECTIONS.map((section) => section.id);

    expect(ids).toContain("configuration");
    expect(ids).toContain("local-services");
    expect(ids.indexOf("configuration") < ids.indexOf("local-services")).toBe(true);
  });

  test("keeps configuration visible as an icon entry when the sidebar collapses", () => {
    const configuration = APP_SIDEBAR_SECTIONS.find((section) => section.id === "configuration");
    const localServices = APP_SIDEBAR_SECTIONS.find((section) => section.id === "local-services");

    expect(configuration?.collapseMode).toBe("icon");
    expect(localServices?.collapseMode).toBe("hidden");
  });

  test("keeps desktop content reserve width stable when the sidebar compacts", () => {
    const expanded = resolveDesktopSidebarLayout(false);
    const compact = resolveDesktopSidebarLayout(true);

    expect(expanded.reserveWidth).toBe(SIDEBAR_WIDTH_EXPANDED);
    expect(compact.reserveWidth).toBe(SIDEBAR_WIDTH_EXPANDED);
    expect(expanded.asideWidth).toBe(SIDEBAR_WIDTH_EXPANDED);
    expect(compact.asideWidth).toBe(SIDEBAR_WIDTH_EXPANDED);
  });

  test("keeps auto-collapse behavior independent from layout reserve width", () => {
    expect(nextDesktopSidebarCompactState(true, "pointer-enter")).toBe(false);
    expect(nextDesktopSidebarCompactState(false, "pointer-leave")).toBe(true);
    expect(nextDesktopSidebarCompactState(true, "focus-enter")).toBe(false);
    expect(nextDesktopSidebarCompactState(false, "manual-toggle")).toBe(true);
  });
});
