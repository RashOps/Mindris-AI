"use client";

import type { Dispatch, SetStateAction } from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SettingsSection } from "./SettingsSection";
import { SECRET_ROWS } from "./types";
import type { SecretSlot } from "./types";

export function SecretSlotsSection({
  secretInputs,
  setSecretInputs,
  secretStatus,
  secretSaving,
  onSave,
}: {
  secretInputs: Record<SecretSlot, string>;
  setSecretInputs: Dispatch<SetStateAction<Record<SecretSlot, string>>>;
  secretStatus: Record<string, { configured: boolean; masked: boolean }>;
  secretSaving: boolean;
  onSave: () => void;
}) {
  return (
    <SettingsSection title="Secret slots" icon={<KeyRound size={16} />}>
      <div className="space-y-3">
        {SECRET_ROWS.map((row) => (
          <div
            key={row.slot}
            className="grid gap-2 rounded-lg border border-border bg-card p-3 md:grid-cols-[160px,1fr,120px] md:items-center"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
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
              className="app-input h-10"
            />
            <div className="text-xs text-muted-foreground">
              {secretStatus[row.slot]?.configured ? "configured" : "missing"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onSave} disabled={secretSaving}>
          {secretSaving ? "Saving…" : "Save secret slots"}
        </Button>
      </div>
    </SettingsSection>
  );
}
