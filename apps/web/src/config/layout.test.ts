import { describe, expect, test } from "bun:test";

import { APP_SIDEBAR_SECTIONS } from "./layout";

describe("app shell sidebar layout", () => {
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
});
