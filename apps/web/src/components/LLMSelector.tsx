"use client";

import { useEffect, useState } from "react";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { ToolbarSelect } from "@/components/ToolbarSelect";
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
  variant?: "default" | "toolbar";
}

export function LLMSelector({ taskKey, label = "Model", variant = "default" }: LLMSelectorProps) {
  const { appSettings, setAppSettings } = useCVStore();
  const [catalogue, setCatalogue] = useState<Catalogue>({});
  const [providersStatus, setProvidersStatus] = useState<ProviderStatus>({});
  const current = appSettings[taskKey];
  const isToolbar = variant === "toolbar";
  const selectClass = isToolbar
    ? "app-select h-9 px-2 text-xs"
    : "app-select h-9 px-2 text-xs";

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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className={`${isToolbar ? "text-xs" : "text-[10px] uppercase"} tracking-wider text-muted-foreground`}>{label}</span>
      <ToolbarSelect
        value={current.provider}
        ariaLabel={`${label} provider`}
        options={providers.map((provider) => ({
          value: provider,
          label: provider,
          hint: providersStatus[provider]?.mode,
          disabled: providersStatus[provider]?.configured === false,
        }))}
        onChange={(value) => {
          const provider = value as LLMProvider;
          const first = catalogue[provider]?.[0]?.id ?? current.model_name;
          update({ provider, model_name: first });
        }}
        triggerClassName={`${selectClass} min-w-22`}
      />
      <ToolbarSelect
        value={current.model_name}
        ariaLabel={`${label} model`}
        options={models.map((model) => ({ value: model.id, label: model.label }))}
        onChange={(value) => update({ model_name: value })}
        triggerClassName={`${selectClass} w-40`}
        menuClassName="min-w-64"
      />
      {providerMeta && (
        <span
          className={`shrink-0 text-[10px] ${
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
