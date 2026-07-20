import type {
  AppSettings,
  LLMConfig,
  LLMProvider,
  PdfIngestionMode,
} from "./types";

export interface BackendTaskConfig {
  provider?: unknown;
  model_name?: unknown;
}

export interface BackendSystemConfiguration {
  app?: {
    defaults?: Record<string, BackendTaskConfig>;
    pdf_ingestion_mode?: unknown;
    ui_locale?: unknown;
  };
  llm?: {
    defaults?: Record<string, BackendTaskConfig>;
    providers?: Record<string, unknown>;
  };
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  optimize_llm: { provider: "groq", model_name: "llama-3.3-70b-versatile" },
  cover_letter_llm: { provider: "groq", model_name: "llama-3.3-70b-versatile" },
  ats_llm: { provider: "groq", model_name: "llama-3.1-8b-instant" },
  patch_llm: { provider: "groq", model_name: "llama-3.3-70b-versatile" },
  pdf_ingestion_mode: "auto",
  ui_locale: "fr",
};

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return DEFAULT_APP_SETTINGS;
  const candidate = value as Partial<AppSettings>;
  return {
    optimize_llm: normalizeLLMConfig(
      candidate.optimize_llm,
      DEFAULT_APP_SETTINGS.optimize_llm,
    ),
    cover_letter_llm: normalizeLLMConfig(
      candidate.cover_letter_llm,
      DEFAULT_APP_SETTINGS.cover_letter_llm,
    ),
    ats_llm: normalizeLLMConfig(
      candidate.ats_llm,
      DEFAULT_APP_SETTINGS.ats_llm,
    ),
    patch_llm: normalizeLLMConfig(
      candidate.patch_llm,
      DEFAULT_APP_SETTINGS.patch_llm,
    ),
    pdf_ingestion_mode: normalizePdfIngestionMode(
      candidate.pdf_ingestion_mode,
      DEFAULT_APP_SETTINGS.pdf_ingestion_mode,
    ),
    ui_locale: candidate.ui_locale === "en" ? "en" : "fr",
  };
}

export function systemConfigurationToAppSettings(
  value: BackendSystemConfiguration | null | undefined,
): AppSettings {
  const defaults = value?.app?.defaults ?? value?.llm?.defaults ?? {};
  return normalizeAppSettings({
    optimize_llm: defaults.optimize,
    cover_letter_llm: defaults.cover_letter,
    ats_llm: defaults.ats_score,
    patch_llm: defaults.patch,
    pdf_ingestion_mode: value?.app?.pdf_ingestion_mode,
    ui_locale: value?.app?.ui_locale,
  });
}

function normalizeLLMConfig(value: unknown, fallback: LLMConfig): LLMConfig {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Partial<LLMConfig>;
  const provider = candidate.provider;
  const model_name = candidate.model_name;
  if (!provider || !model_name || !isLLMProvider(provider)) return fallback;
  return {
    provider,
    model_name:
      typeof model_name === "string" && model_name.trim()
        ? model_name
        : fallback.model_name,
  };
}

function isLLMProvider(value: unknown): value is LLMProvider {
  return (
    value === "groq" ||
    value === "gemini" ||
    value === "openai" ||
    value === "mistral" ||
    value === "ollama"
  );
}

function normalizePdfIngestionMode(
  value: unknown,
  fallback: PdfIngestionMode,
): PdfIngestionMode {
  return value === "auto" || value === "llama_parse" || value === "local_text"
    ? value
    : fallback;
}
