import { describe, expect, test } from "bun:test";

import {
  normalizeTheme,
  resolvePreferredTheme,
  THEME_STORAGE_KEY,
} from "./ThemeProvider";

describe("theme provider helpers", () => {
  test("exposes the canonical storage key", () => {
    expect(THEME_STORAGE_KEY).toBe("mindris-theme");
  });

  test("normalizes only supported theme values", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe(null);
    expect(normalizeTheme(null)).toBe(null);
  });

  test("prefers stored theme over system preference", () => {
    expect(resolvePreferredTheme("dark", false)).toBe("dark");
    expect(resolvePreferredTheme("light", true)).toBe("light");
  });

  test("falls back to system preference when nothing valid is stored", () => {
    expect(resolvePreferredTheme(null, true)).toBe("dark");
    expect(resolvePreferredTheme(undefined, false)).toBe("light");
    expect(resolvePreferredTheme("invalid", true)).toBe("dark");
  });
});
