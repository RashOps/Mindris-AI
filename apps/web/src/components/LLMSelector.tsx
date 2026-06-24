"use client";

import { useEffect, useState } from "react";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { useCVStore, type AppSettings, type LLMProvider } from "@/store/useCVStore";

type TaskKey = keyof AppSettings;
type Catalogue = Record<string, { id: string; label: string }[]>;

interface LLMSelectorProps {
  taskKey: TaskKey;
  label?: string;
}

export function LLMSelector({ taskKey, label = "Model" }: LLMSelectorProps) {
  const { appSettings, setAppSettings } = useCVStore();
  const [catalogue, setCatalogue] = useState<Catalogue>({});
  const current = appSettings[taskKey];

  useEffect(() => {
    fetch(apiUrl("/api/v1/llm/catalogue"), { headers: jsonHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.catalogue && setCatalogue(data.catalogue))
      .catch(() => setCatalogue({}));
  }, []);

  const providers = Object.keys(catalogue).length
    ? Object.keys(catalogue)
    : ["groq", "gemini", "openai", "mistral", "ollama"];
  const models = catalogue[current.provider] ?? [{ id: current.model_name, label: current.model_name }];

  const update = (next: { provider?: LLMProvider; model_name?: string }) => {
    setAppSettings({ [taskKey]: { ...current, ...next } } as Partial<AppSettings>);
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={current.provider}
        onChange={(event) => {
          const provider = event.target.value as LLMProvider;
          const first = catalogue[provider]?.[0]?.id ?? current.model_name;
          update({ provider, model_name: first });
        }}
        className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-500"
      >
        {providers.map((provider) => (
          <option key={provider} value={provider}>{provider}</option>
        ))}
      </select>
      <select
        value={current.model_name}
        onChange={(event) => update({ model_name: event.target.value })}
        className="h-9 max-w-44 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-500"
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>{model.label}</option>
        ))}
      </select>
    </div>
  );
}
