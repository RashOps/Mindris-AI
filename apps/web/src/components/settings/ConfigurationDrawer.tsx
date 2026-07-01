"use client";

import { useMemo, useState } from "react";
import { Cloud, HardDrive, KeyRound, Loader2, Settings2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiUrl, jsonHeaders } from "@/lib/api";
import {
  type AppSettings,
  type LLMProvider,
  systemConfigurationToAppSettings,
  useCVStore,
} from "@/store/useCVStore";

type ProviderStatus = Record<
  string,
  { configured: boolean; mode: "local" | "cloud"; reason: string }
>;

type Catalogue = Record<string, Array<{ id: string; label: string }>>;

type SecretSlot =
  | "groq_api_key"
  | "gemini_api_key"
  | "openai_api_key"
  | "mistral_api_key"
  | "llama_cloud_api_key"
  | "scrape_do_api_key"
  | "scrapingbee_api_key";

type SystemConfigurationPayload = {
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

const TASK_ROWS = [
  { key: "optimize_llm", backendKey: "optimize", label: "CV optimization" },
  { key: "cover_letter_llm", backendKey: "cover_letter", label: "Cover letter" },
  { key: "ats_llm", backendKey: "ats_score", label: "ATS scoring" },
  { key: "patch_llm", backendKey: "patch", label: "Patch generation" },
] as const;

const SECRET_ROWS: Array<{ slot: SecretSlot; label: string; hint: string }> = [
  { slot: "groq_api_key", label: "Groq", hint: "Cloud inference" },
  { slot: "gemini_api_key", label: "Gemini", hint: "Google models" },
  { slot: "openai_api_key", label: "OpenAI", hint: "GPT providers" },
  { slot: "mistral_api_key", label: "Mistral", hint: "Mistral API" },
  { slot: "llama_cloud_api_key", label: "LlamaParse", hint: "Cloud PDF parsing" },
  { slot: "scrape_do_api_key", label: "Scrape.do", hint: "Proxy scraping" },
  { slot: "scrapingbee_api_key", label: "ScrapingBee", hint: "Proxy scraping" },
];

function taskLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function ConfigurationDrawer() {
  const { appSettings, setAppSettings, hydrateAppSettings } = useCVStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secretSaving, setSecretSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<Catalogue>({});
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({});
  const [secretStatus, setSecretStatus] = useState<Record<string, { configured: boolean; masked: boolean }>>({});
  const [draftSettings, setDraftSettings] = useState<AppSettings>(appSettings);
  const [secretInputs, setSecretInputs] = useState<Record<SecretSlot, string>>({
    groq_api_key: "",
    gemini_api_key: "",
    openai_api_key: "",
    mistral_api_key: "",
    llama_cloud_api_key: "",
    scrape_do_api_key: "",
    scrapingbee_api_key: "",
  });

  const providerList = useMemo(
    () =>
      Object.keys(catalogue).length
        ? (Object.keys(catalogue) as LLMProvider[])
        : ["groq", "gemini", "openai", "mistral", "ollama"],
    [catalogue],
  );

  async function loadConfiguration() {
    setLoading(true);
    setError(null);
    try {
      const [catalogueResponse, configResponse, ollamaResponse] = await Promise.all([
        fetch(apiUrl("/api/v1/llm/catalogue"), { headers: jsonHeaders() }),
        fetch(apiUrl("/api/v1/system/configuration"), { headers: jsonHeaders() }),
        fetch(apiUrl("/api/v1/system/ollama-models"), { headers: jsonHeaders() }),
      ]);
      const catalogueData = catalogueResponse.ok ? await catalogueResponse.json() : null;
      const configData = configResponse.ok
        ? ((await configResponse.json()) as SystemConfigurationPayload)
        : null;
      const ollamaData = ollamaResponse.ok ? await ollamaResponse.json() : null;

      const nextCatalogue: Catalogue = { ...(catalogueData?.catalogue ?? {}) };
      if (Array.isArray(ollamaData?.items) && ollamaData.items.length > 0) {
        nextCatalogue.ollama = ollamaData.items;
      }
      setCatalogue(nextCatalogue);
      setProviderStatus(configData?.item?.llm?.providers ?? catalogueData?.providers ?? {});
      setSecretStatus(configData?.item?.secrets ?? {});
      if (configData?.item) {
        const nextSettings = systemConfigurationToAppSettings(configData.item);
        setDraftSettings(nextSettings);
        setAppSettings(nextSettings);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load configuration.");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfiguration() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/v1/system/configuration"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          defaults: {
            optimize: draftSettings.optimize_llm,
            cover_letter: draftSettings.cover_letter_llm,
            ats_score: draftSettings.ats_llm,
            patch: draftSettings.patch_llm,
          },
          pdf_ingestion_mode: draftSettings.pdf_ingestion_mode,
        }),
      });
      if (!response.ok) {
        throw new Error(`Configuration save failed (${response.status}).`);
      }
      const data = (await response.json()) as SystemConfigurationPayload;
      const nextSettings = systemConfigurationToAppSettings(data.item);
      setAppSettings(nextSettings);
      await hydrateAppSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Configuration save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSecrets() {
    const entries = Object.entries(secretInputs).filter(([, value]) => value.trim());
    if (entries.length === 0) return;
    setSecretSaving(true);
    setError(null);
    try {
      await Promise.all(
        entries.map(([slot, value]) =>
          fetch(apiUrl(`/api/v1/system/secrets/${slot}`), {
            method: "PUT",
            headers: jsonHeaders(),
            body: JSON.stringify({ value }),
          }).then((response) => {
            if (!response.ok) {
              throw new Error(`Secret update failed for ${slot}.`);
            }
            return response.json();
          }),
        ),
      );
      setSecretInputs({
        groq_api_key: "",
        gemini_api_key: "",
        openai_api_key: "",
        mistral_api_key: "",
        llama_cloud_api_key: "",
        scrape_do_api_key: "",
        scrapingbee_api_key: "",
      });
      await loadConfiguration();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Secret update failed.");
    } finally {
      setSecretSaving(false);
    }
  }

  function updateTask(
    taskKey: (typeof TASK_ROWS)[number]["key"],
    patch: Partial<AppSettings[typeof taskKey]>,
  ) {
    setDraftSettings((current) => ({
      ...current,
      [taskKey]: {
        ...current[taskKey],
        ...patch,
      },
    }));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setDraftSettings(appSettings);
          void loadConfiguration();
        }
      }}
    >
      <SheetTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Settings2 size={16} />
            Configuration
          </Button>
        }
      />
      <SheetContent className="w-full border-slate-200 bg-white p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-slate-200">
          <SheetTitle className="flex items-center gap-2 text-slate-950">
            <ShieldCheck size={18} />
            Configuration
          </SheetTitle>
          <SheetDescription className="text-slate-500">
            Backend-owned runtime settings, provider defaults and write-only secret slots.
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading runtime configuration…
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Cloud size={16} />
                  Task model defaults
                </div>
                <div className="space-y-4">
                  {TASK_ROWS.map((task) => {
                    const current = draftSettings[task.key];
                    const models = catalogue[current.provider] ?? [
                      { id: current.model_name, label: current.model_name },
                    ];
                    const meta = providerStatus[current.provider];
                    return (
                      <div key={task.key} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[180px,1fr,1fr,110px] md:items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{task.label}</p>
                          <p className="text-xs text-slate-500">{taskLabel(task.backendKey)}</p>
                        </div>
                        <select
                          value={current.provider}
                          onChange={(event) => {
                            const provider = event.target.value as LLMProvider;
                            const firstModel = catalogue[provider]?.[0]?.id ?? current.model_name;
                            updateTask(task.key, { provider, model_name: firstModel });
                          }}
                          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                        >
                          {providerList.map((provider) => (
                            <option
                              key={provider}
                              value={provider}
                              disabled={providerStatus[provider]?.configured === false}
                            >
                              {provider}
                            </option>
                          ))}
                        </select>
                        <select
                          value={current.model_name}
                          onChange={(event) => updateTask(task.key, { model_name: event.target.value })}
                          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                        >
                          {models.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-slate-500">
                          {meta?.configured ? meta.mode : "setup required"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <HardDrive size={16} />
                  Ingestion and local runtime
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pdf-ingestion-mode">PDF ingestion mode</Label>
                    <select
                      id="pdf-ingestion-mode"
                      value={draftSettings.pdf_ingestion_mode}
                      onChange={(event) =>
                        setDraftSettings((current) => ({
                          ...current,
                          pdf_ingestion_mode: event.target.value as AppSettings["pdf_ingestion_mode"],
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                    >
                      <option value="auto">Auto</option>
                      <option value="llama_parse">LlamaParse</option>
                      <option value="local_text">Full local text</option>
                    </select>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-900">Provider status</p>
                    <div className="mt-2 space-y-1">
                      {providerList.map((provider) => (
                        <div key={provider} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{provider}</span>
                          <span>{providerStatus[provider]?.configured ? providerStatus[provider]?.mode : "missing"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => void saveConfiguration()} disabled={saving}>
                    {saving ? "Saving…" : "Save configuration"}
                  </Button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <KeyRound size={16} />
                  Secret slots
                </div>
                <div className="space-y-3">
                  {SECRET_ROWS.map((row) => (
                    <div key={row.slot} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[160px,1fr,120px] md:items-center">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.hint}</p>
                      </div>
                      <Input
                        type="password"
                        value={secretInputs[row.slot]}
                        onChange={(event) =>
                          setSecretInputs((current) => ({
                            ...current,
                            [row.slot]: event.target.value,
                          }))
                        }
                        placeholder={
                          secretStatus[row.slot]?.configured
                            ? "Configured on backend"
                            : "Paste secret value"
                        }
                        className="h-10 border-slate-300 bg-white text-slate-900"
                      />
                      <div className="text-xs text-slate-500">
                        {secretStatus[row.slot]?.configured ? "configured" : "missing"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => void saveSecrets()} disabled={secretSaving}>
                    {secretSaving ? "Saving…" : "Save secret slots"}
                  </Button>
                </div>
              </section>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
