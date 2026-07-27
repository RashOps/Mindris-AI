const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const RENDERER_BASE = process.env.NEXT_PUBLIC_RENDERER_URL ?? "http://localhost:4000";

export const RENDERER_BASE_URL = RENDERER_BASE;
export const BROWSER_API_AUTH_MODE = "local-browser-or-header";

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function apiUrl(path: string): string {
  return joinUrl(API_BASE, path);
}

export function rendererUrl(path: string): string {
  return joinUrl(RENDERER_BASE, path);
}

export function apiHeaders(): HeadersInit {
  return {};
}

export function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json", ...apiHeaders() };
}

export type PrivacyConsentDetail = {
  provider: string;
  model: string;
  task: string;
  mode: "private_cloud" | "full_context_cloud";
  categories: string[];
  category_reasons?: Record<string, string>;
  character_count: number;
  approximate_tokens: number;
  policy_version: string;
  examples?: string[];
  provider_metadata?: {
    last_verified_at: string;
    retention_summary: string;
    retention_summary_fr?: string;
    source_url: string;
    stale: boolean;
    legal_notice: string;
    legal_notice_fr?: string;
  };
};

type PrivacyDecision = "continue" | "reduce" | "local" | "cancel";

export type PrivacyConsentEvent = {
  detail: PrivacyConsentDetail;
  resolve: (decision: PrivacyDecision) => void;
};

/**
 * Product API fetch with an interactive retry when the backend requires
 * explicit cloud consent. Business decisions remain backend-owned.
 */
export async function privacyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 428 || typeof window === "undefined") return response;

  const payload = await response.clone().json().catch(() => null);
  const detail = payload?.detail as PrivacyConsentDetail | undefined;
  if (!detail?.provider || !detail.task || !detail.mode) return response;

  const decision = await new Promise<PrivacyDecision>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<PrivacyConsentEvent>("mindris:privacy-consent", {
        detail: { detail, resolve },
      }),
    );
  });

  if (decision === "continue") {
    const consent = await fetch(apiUrl("/api/v1/privacy/consents"), {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify({
        provider: detail.provider,
        task: detail.task,
        mode: detail.mode,
        granted: true,
        acknowledge_full_context: detail.mode === "full_context_cloud",
      }),
    });
    return consent.ok ? privacyFetch(input, init) : response;
  }

  if (decision === "reduce" || decision === "local") {
    const modeResponse = await fetch(apiUrl("/api/v1/system/configuration"), {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify({
        privacy_mode:
          decision === "reduce" ? "private_cloud" : "local_strict",
      }),
    });
    if (modeResponse.ok) {
      window.dispatchEvent(new Event("mindris:privacy-mode-changed"));
      if (decision === "reduce") {
        return privacyFetch(input, init);
      }
    }
  }
  return response;
}

type StreamHandlers = {
  onEvent: (event: string, data: string) => void;
  onError?: (error: Error) => void;
};

function dispatchEventBlock(block: string, handlers: StreamHandlers): void {
  const lines = block.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim() || "message";
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length > 0) {
    handlers.onEvent(eventName, dataLines.join("\n"));
  }
}

export async function connectApiEventStream(
  path: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(apiUrl(path), {
      headers: apiHeaders(),
      signal,
      cache: "no-store",
    });
    if (!response.ok || !response.body) {
      throw new Error(`Event stream failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        if (block.trim()) dispatchEventBlock(block, handlers);
      }
    }

    if (buffer.trim()) {
      dispatchEventBlock(buffer, handlers);
    }
  } catch (error) {
    if (signal.aborted) return;
    handlers.onError?.(
      error instanceof Error ? error : new Error("Event stream failed"),
    );
  }
}
