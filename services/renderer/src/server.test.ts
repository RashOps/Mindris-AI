import { describe, expect, test } from "bun:test";
import { resolveRendererPort } from "./server";

describe("resolveRendererPort", () => {
  test("uses PORT from the environment when it is valid", () => {
    expect(resolveRendererPort("4010")).toBe(4010);
  });

  test("falls back to 4000 when PORT is missing or invalid", () => {
    expect(resolveRendererPort(undefined)).toBe(4000);
    expect(resolveRendererPort("0")).toBe(4000);
    expect(resolveRendererPort("bad")).toBe(4000);
  });
});
