import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER_DIR = join(SRC_DIR, "..");
const ROOT_DIR = join(RENDERER_DIR, "..", "..");

describe("renderer local development contract", () => {
    test("declares a watch-based dev script for local reload", () => {
        const packageJson = JSON.parse(
            readFileSync(join(RENDERER_DIR, "package.json"), "utf8"),
        ) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.dev).toContain("--watch");
        expect(packageJson.scripts?.dev).toContain("src/server.ts");
    });

    test("local dev harness delegates supervision to the contributor CLI", () => {
        const script = readFileSync(join(ROOT_DIR, "scripts", "dev_local.sh"), "utf8");
        const services = readFileSync(
            join(ROOT_DIR, "scripts", "mindris_cli", "services.py"),
            "utf8",
        );

        expect(script).toContain('exec "$ROOT_DIR/mindris" dev');
        expect(services).toContain('["bun", "run", "dev"]');
    });
});
