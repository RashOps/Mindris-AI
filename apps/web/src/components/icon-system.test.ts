import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DECORATIVE_GLYPHS = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2715}\u{00D7}\u{25A1}\u{25A4}\u{2261}\u{25C9}]/u;

function typescriptReactFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return typescriptReactFiles(path);
    if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".test.tsx")) {
      return [];
    }
    return [path];
  });
}

describe("frontend icon system", () => {
  test("does not use decorative Unicode glyphs as component icons", () => {
    const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const offenders = typescriptReactFiles(sourceRoot)
      .filter((path) => DECORATIVE_GLYPHS.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(`${sourceRoot}\/`, ""));

    expect(offenders).toEqual([]);
  });
});
