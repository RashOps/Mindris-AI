import { describe, expect, test } from "bun:test";

import {
  BROWSER_API_AUTH_MODE,
  apiHeaders,
  apiUrl,
  jsonHeaders,
  rendererUrl,
} from "./api";

describe("api transport helpers", () => {
  test("build stable API and renderer URLs", () => {
    expect(apiUrl("/api/v1/system/ready")).toBe("http://localhost:8000/api/v1/system/ready");
    expect(rendererUrl("/ready")).toBe("http://localhost:4000/ready");
  });

  test("do not expose a browser-side API key header", () => {
    expect(apiHeaders()).toEqual({});
    expect(jsonHeaders()).toEqual({ "Content-Type": "application/json" });
    expect(BROWSER_API_AUTH_MODE).toBe("local-browser-or-header");
  });
});
