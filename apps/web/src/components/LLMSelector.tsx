"use client";

import { useEffect, useState } from "react";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { useCVStore, type AppSettings, type LLMProvider } from "@/store/useCVStore";

type TaskKey = "optimize_llm" | "cover_letter_llm" | "ats_llm" | "patch_llm";
type Catalogue = Record<string, { id: string; label: string }[]>;
type ProviderStatus = Record<
  string,
  { configured: boolean; mode: "local" | "cloud"; reason: string }
>;

interface LLMSelectorProps {
  taskKey: TaskKey;
  label?: string;
}

export function LLMSelector({ taskKey, label = "Model" }: LLMSelectorProps) {
  const { appSettings, setAppSettings } = useCVStore();
  const [catalogue, setCatalogue] = useState<Catalogue>({});
  const [providersStatus, setProvidersStatus] = useState<ProviderStatus>({});
  const current = appSettings[taskKey];

  useEffect(() => {
    fetch(apiUrl("/api/v1/llm/catalogue"), { headers: jsonHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.catalogue) setCatalogue(data.catalogue);
        if (data?.providers) setProvidersStatus(data.providers);
      })
      .catch(() => {
        setCatalogue({});
        setProvidersStatus({});
      });
  }, []);

  const providers = Object.keys(catalogue).length
    ? Object.keys(catalogue)
    : ["groq", "gemini", "openai", "mistral", "ollama"];
  const models = catalogue[current.provider] ?? [{ id: current.model_name, label: current.model_name }];
  const providerMeta = providersStatus[current.provider];

  const update = (next: { provider?: LLMProvider; model_name?: string }) => {
    setAppSettings({ [taskKey]: { ...current, ...next } } as Partial<AppSettings>);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={current.provider}
        onChange={(event) => {
          const provider = event.target.value as LLMProvider;
          const first = catalogue[provider]?.[0]?.id ?? current.model_name;
          update({ provider, model_name: first });
        }}
        className="app-select h-9 cursor-pointer px-2 text-xs"
      >
        {providers.map((provider) => (
          <option
            key={provider}
            value={provider}
            disabled={providersStatus[provider]?.configured === false}
          >
            {provider}
          </option>
        ))}
      </select>
      <select
        value={current.model_name}
        onChange={(event) => update({ model_name: event.target.value })}
        className="app-select h-9 max-w-44 cursor-pointer px-2 text-xs"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>{model.label}</option>
        ))}
      </select>
      {providerMeta && (
        <span
          className={`text-[10px] ${
            providerMeta.configured ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"
          }`}
          title={providerMeta.reason || undefined}
        >
          {providerMeta.configured ? providerMeta.mode : "setup required"}
        </span>
      )}
    </div>
  );
}
