"use client";

import { Cloud } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import type { AppSettings, LLMProvider } from "@/store/useCVStore";

import { SettingsSection } from "./SettingsSection";
import { providerConfigured, taskLabel } from "./helpers";
import type { Catalogue, ProviderList, ProviderStatus } from "./types";
import { TASK_ROWS } from "./types";

export function TaskModelDefaultsSection({
  draftSettings,
  catalogue,
  providerStatus,
  providerList,
  updateTask,
}: {
  draftSettings: AppSettings;
  catalogue: Catalogue;
  providerStatus: ProviderStatus;
  providerList: ProviderList;
  updateTask: (
    taskKey: (typeof TASK_ROWS)[number]["key"],
    patch: Partial<AppSettings[(typeof TASK_ROWS)[number]["key"]]>,
  ) => void;
}) {
  return (
    <SettingsSection title="Task model defaults" icon={<Cloud size={16} />}>
      <div className="space-y-4">
        {TASK_ROWS.map((task) => {
          const current = draftSettings[task.key];
          const models = catalogue[current.provider] ?? [
            { id: current.model_name, label: current.model_name },
          ];
          const meta = providerStatus[current.provider];

          return (
            <div
              key={task.key}
              className="grid gap-2 rounded-lg border border-border bg-card p-3 md:grid-cols-[180px,1fr,1fr,110px] md:items-center"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{task.label}</p>
                <p className="text-xs text-muted-foreground">{taskLabel(task.backendKey)}</p>
              </div>
              <ToolbarSelect
                value={current.provider}
                ariaLabel={`${task.label} provider`}
                options={providerList.map((provider) => ({
                  value: provider,
                  label: provider,
                  disabled: !providerConfigured(providerStatus, provider),
                }))}
                onChange={(value) => {
                  const provider = value as LLMProvider;
                  const firstModel = catalogue[provider]?.[0]?.id ?? current.model_name;
                  updateTask(task.key, { provider, model_name: firstModel });
                }}
                triggerClassName="app-select h-10 px-3 text-sm"
              />
              <ToolbarSelect
                value={current.model_name}
                ariaLabel={`${task.label} model`}
                options={models.map((model) => ({ value: model.id, label: model.label }))}
                onChange={(value) => updateTask(task.key, { model_name: value })}
                triggerClassName="app-select h-10 px-3 text-sm"
                menuClassName="min-w-64"
              />
              <div className="text-xs text-muted-foreground">
                {meta?.configured ? meta.mode : "setup required"}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}
