"use client";

import type { Dispatch, SetStateAction } from "react";
import { HardDrive, ShieldCheck } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AppSettings } from "@/store/useCVStore";
import { useI18n } from "@/i18n/I18nProvider";

import { SettingsSection } from "./SettingsSection";
import type { ProviderList, ProviderStatus } from "./types";

export function RuntimeConfigurationSection({
  draftSettings,
  setDraftSettings,
  providerList,
  providerStatus,
  saving,
  onSave,
}: {
  draftSettings: AppSettings;
  setDraftSettings: Dispatch<SetStateAction<AppSettings>>;
  providerList: ProviderList;
  providerStatus: ProviderStatus;
  saving: boolean;
  onSave: () => void;
}) {
  const { messages } = useI18n();
  return (
    <SettingsSection title="Ingestion et interface" icon={<HardDrive size={16} />}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>{messages.privacy.modeLabel}</Label>
          <ToolbarSelect
            value={draftSettings.privacy_mode}
            ariaLabel={messages.privacy.modeLabel}
            options={[
              { value: "local_strict", label: messages.privacy.local },
              { value: "private_cloud", label: messages.privacy.privateCloud },
              {
                value: "full_context_cloud",
                label: messages.privacy.fullCloud,
              },
            ]}
            onChange={(value) =>
              setDraftSettings((current) => ({
                ...current,
                privacy_mode: value as AppSettings["privacy_mode"],
                telemetry_enabled:
                  value === "local_strict"
                    ? false
                    : current.telemetry_enabled,
              }))
            }
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />
            <p>
              {draftSettings.privacy_mode === "local_strict"
                ? messages.privacy.strictDescription
                : draftSettings.privacy_mode === "private_cloud"
                  ? messages.privacy.privateDescription
                  : messages.privacy.fullDescription}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>PDF ingestion mode</Label>
          <ToolbarSelect
            value={draftSettings.pdf_ingestion_mode}
            ariaLabel="PDF ingestion mode"
            options={[
              { value: "auto", label: "Auto" },
              { value: "llama_parse", label: "LlamaParse" },
              { value: "local_text", label: "Full local text" },
            ]}
            onChange={(value) =>
              setDraftSettings((current) => ({
                ...current,
                pdf_ingestion_mode: value as AppSettings["pdf_ingestion_mode"],
              }))
            }
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Langue de l’interface</Label>
          <ToolbarSelect
            value={draftSettings.ui_locale}
            ariaLabel="Langue de l’interface"
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
            onChange={(value) =>
              setDraftSettings((current) => ({
                ...current,
                ui_locale: value as AppSettings["ui_locale"],
              }))
            }
            triggerClassName="app-select h-10 w-full px-3 text-sm"
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-sm font-medium text-foreground">Provider status</p>
          <div className="mt-2 space-y-1">
            {providerList.map((provider) => (
              <div key={provider} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{provider}</span>
                <span>{providerStatus[provider]?.configured ? providerStatus[provider]?.mode : "missing"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>
    </SettingsSection>
  );
}
