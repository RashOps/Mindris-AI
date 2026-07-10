"use client";

import type { Dispatch, SetStateAction } from "react";
import { HardDrive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AppSettings } from "@/store/useCVStore";

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
  return (
    <SettingsSection title="Ingestion and local runtime" icon={<HardDrive size={16} />}>
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
            className="app-select h-10 w-full px-3 text-sm"
          >
            <option value="auto">Auto</option>
            <option value="llama_parse">LlamaParse</option>
            <option value="local_text">Full local text</option>
          </select>
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
