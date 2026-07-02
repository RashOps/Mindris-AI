import { describe, expect, test } from "bun:test";

import { APP_SIDEBAR_SECTIONS } from "./layout";

describe("app shell sidebar layout", () => {
  test("places configuration above local services", () => {
    const ids = APP_SIDEBAR_SECTIONS.map((section) => section.id);

    expect(ids).toContain("configuration");
    expect(ids).toContain("local-services");
    expect(ids.indexOf("configuration") < ids.indexOf("local-services")).toBe(true);
  });
});
