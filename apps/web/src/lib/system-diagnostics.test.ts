import { describe, expect, test } from "bun:test";

import { summarizeSystemDiagnostics } from "./system-diagnostics";

describe("system diagnostics helpers", () => {
  test("summarizes ready and degraded runtime services for configuration UI", () => {
    const summary = summarizeSystemDiagnostics({
      item: {
        api: {
          status: "ready",
          checks: {
            storage: { ok: true },
            sqlite: { ok: true },
          },
        },
        renderer: {
          status: "unreachable",
          reachable: false,
          url: "http://localhost:4000",
          checks: {},
          error: "connection refused",
        },
        ollama: {
          status: "ready",
          reachable: true,
          base_url: "http://localhost:11434",
          model_count: 2,
          items: [
            { id: "llama3.2", label: "llama3.2" },
            { id: "phi4", label: "phi4" },
          ],
        },
        storage: {
          logs_dir: "/tmp/logs",
          storage_dir: "/tmp/storage",
          chroma_db_dir: "/tmp/chroma",
        },
        runtime: {
          renderer_url: "http://localhost:4000",
          service_timeout_seconds: 10,
          pipeline_timeout_seconds: 30,
          max_pdf_upload_bytes: 10485760,
          ollama_api_base: "http://localhost:11434",
          llm_num_ctx: 8192,
          scraper_timeout_ms: 15000,
          scraper_headless: true,
          scraper_strategy: "playwright",
          scraper_proxy_fallback: false,
          log_level: "INFO",
        },
      },
    });

    expect(summary.cards.find((card) => card.id === "api")?.state).toBe("ready");
    expect(summary.cards.find((card) => card.id === "renderer")?.state).toBe("degraded");
    expect(summary.cards.find((card) => card.id === "renderer")?.meta).toContain("connection refused");
    expect(summary.cards.find((card) => card.id === "ollama")?.value).toBe("2 models");
    expect(summary.paths.logs_dir).toBe("/tmp/logs");
  });
});
