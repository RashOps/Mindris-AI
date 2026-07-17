import type { AppSettings, LLMProvider } from "@/store/useCVStore";
import { summarizeSystemDiagnostics, type SystemDiagnosticsPayload } from "@/lib/system-diagnostics";

export type ProviderStatus = Record<
  string,
  { configured: boolean; mode: "local" | "cloud"; reason: string }
>;

export type Catalogue = Record<string, Array<{ id: string; label: string }>>;

export type SecretSlot =
  | "groq_api_key"
  | "gemini_api_key"
  | "openai_api_key"
  | "mistral_api_key"
  | "llama_cloud_api_key"
  | "scrape_do_api_key"
  | "scrapingbee_api_key";

export type SystemConfigurationPayload = {
  item: {
    app?: {
      defaults?: Record<string, { provider?: string; model_name?: string }>;
      pdf_ingestion_mode?: AppSettings["pdf_ingestion_mode"];
    };
    llm?: {
      providers?: ProviderStatus;
    };
    secrets?: Record<string, { configured: boolean; masked: boolean }>;
  };
};

export type DiagnosticsCard = ReturnType<typeof summarizeSystemDiagnostics>["cards"][number];

export const TASK_ROWS = [
  { key: "optimize_llm", backendKey: "optimize", label: "CV optimization" },
  { key: "cover_letter_llm", backendKey: "cover_letter", label: "Cover letter" },
  { key: "ats_llm", backendKey: "ats_score", label: "ATS scoring" },
  { key: "patch_llm", backendKey: "patch", label: "Patch generation" },
] as const;

export const SECRET_ROWS: Array<{ slot: SecretSlot; label: string; hint: string }> = [
  { slot: "groq_api_key", label: "Groq", hint: "Cloud inference" },
  { slot: "gemini_api_key", label: "Gemini", hint: "Google models" },
  { slot: "openai_api_key", label: "OpenAI", hint: "GPT providers" },
  { slot: "mistral_api_key", label: "Mistral", hint: "Mistral API" },
  { slot: "llama_cloud_api_key", label: "LlamaParse", hint: "Cloud PDF parsing" },
  { slot: "scrape_do_api_key", label: "Scrape.do", hint: "Proxy scraping" },
  { slot: "scrapingbee_api_key", label: "ScrapingBee", hint: "Proxy scraping" },
];

export type SettingsDraftTaskKey = (typeof TASK_ROWS)[number]["key"];
export type SettingsTaskValue = AppSettings[SettingsDraftTaskKey];
export type ProviderList = LLMProvider[];
export type DiagnosticsPayload = SystemDiagnosticsPayload;
