export type SystemDiagnosticsPayload = {
  item?: {
    api?: {
      status?: string;
      checks?: Record<string, { ok?: boolean }>;
    };
    renderer?: {
      status?: string;
      reachable?: boolean;
      url?: string | null;
      checks?: Record<string, { ok?: boolean }>;
      error?: string | null;
    };
    ollama?: {
      status?: string;
      reachable?: boolean;
      base_url?: string;
      model_count?: number;
      items?: Array<{ id: string; label: string }>;
      error?: string | null;
    };
    storage?: {
      logs_dir?: string;
      storage_dir?: string;
      chroma_db_dir?: string;
    };
    runtime?: {
      renderer_url?: string;
      ollama_api_base?: string;
      log_level?: string;
      [key: string]: unknown;
    };
  };
};

export type DiagnosticsCard = {
  id: "api" | "renderer" | "ollama" | "storage";
  label: string;
  state: "ready" | "degraded";
  value: string;
  meta: string;
};

export function summarizeSystemDiagnostics(payload: SystemDiagnosticsPayload | null | undefined): {
  cards: DiagnosticsCard[];
  paths: {
    logs_dir: string;
    storage_dir: string;
    chroma_db_dir: string;
  };
  runtime: {
    renderer_url: string;
    ollama_api_base: string;
    log_level: string;
  };
} {
  const item = payload?.item ?? {};
  const api = item.api ?? {};
  const renderer = item.renderer ?? {};
  const ollama = item.ollama ?? {};
  const storage = item.storage ?? {};
  const runtime = item.runtime ?? {};
  const apiChecks = Object.entries(api.checks ?? {});
  const apiReady = api.status === "ready" && apiChecks.every(([, check]) => check?.ok !== false);
  const rendererReady = renderer.reachable === true && renderer.status === "ready";
  const ollamaReady = ollama.reachable === true && (ollama.status === "ready" || ollama.status === "degraded");

  return {
    cards: [
      {
        id: "api",
        label: "API gateway",
        state: apiReady ? "ready" : "degraded",
        value: api.status === "ready" ? "Ready" : (api.status ?? "Unknown"),
        meta: apiChecks.length
          ? `${apiChecks.filter(([, check]) => check?.ok).length}/${apiChecks.length} checks passing`
          : "No checks reported",
      },
      {
        id: "renderer",
        label: "Renderer",
        state: rendererReady ? "ready" : "degraded",
        value: renderer.reachable ? (renderer.status ?? "Ready") : "Unavailable",
        meta: renderer.error || renderer.url || "No renderer metadata",
      },
      {
        id: "ollama",
        label: "Ollama",
        state: ollamaReady ? "ready" : "degraded",
        value: `${ollama.model_count ?? 0} models`,
        meta: ollama.error || ollama.base_url || "No Ollama metadata",
      },
      {
        id: "storage",
        label: "Storage",
        state: storage.storage_dir && storage.chroma_db_dir ? "ready" : "degraded",
        value: storage.storage_dir ? "Paths configured" : "Missing paths",
        meta: storage.storage_dir || "No storage path",
      },
    ],
    paths: {
      logs_dir: storage.logs_dir ?? "",
      storage_dir: storage.storage_dir ?? "",
      chroma_db_dir: storage.chroma_db_dir ?? "",
    },
    runtime: {
      renderer_url: runtime.renderer_url ?? "",
      ollama_api_base: runtime.ollama_api_base ?? "",
      log_level: runtime.log_level ?? "",
    },
  };
}
