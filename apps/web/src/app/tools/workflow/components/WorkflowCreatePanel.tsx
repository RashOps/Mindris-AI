"use client";

import { Loader2, Sparkles } from "lucide-react";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type JobItem } from "../workflow-model";

interface WorkflowCreatePanelProps {
  busyAction: string | null;
  canCreate: boolean;
  createMode: "job" | "manual";
  jobs: JobItem[];
  manualCompany: string;
  manualRole: string;
  manualUrl: string;
  notes: string;
  selectedJobId: string;
  onCreate: () => void;
  onCreateModeChange: (mode: "job" | "manual") => void;
  onManualCompanyChange: (value: string) => void;
  onManualRoleChange: (value: string) => void;
  onManualUrlChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSelectedJobIdChange: (value: string) => void;
}

export function WorkflowCreatePanel({
  busyAction,
  canCreate,
  createMode,
  jobs,
  manualCompany,
  manualRole,
  manualUrl,
  notes,
  selectedJobId,
  onCreate,
  onCreateModeChange,
  onManualCompanyChange,
  onManualRoleChange,
  onManualUrlChange,
  onNotesChange,
  onSelectedJobIdChange,
}: WorkflowCreatePanelProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">Créer une opportunité</p>
        <div className="flex w-fit rounded-lg border border-border bg-muted/40 p-1">
          {(["job", "manual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onCreateModeChange(mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                createMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {mode === "job" ? "Depuis une offre" : "Manuel"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        {createMode === "job" ? (
          <ToolbarSelect
            value={selectedJobId}
            ariaLabel="Sélectionner une offre importée"
            placeholder="Sélectionner une offre"
            options={[
              { value: "", label: "Sélectionner une offre" },
              ...jobs.map((job) => ({
                value: String(job.id),
                label: `${job.company} - ${job.title}`,
              })),
            ]}
            onChange={onSelectedJobIdChange}
            triggerClassName="app-select h-10 w-full px-3 text-sm"
            menuClassName="min-w-full"
          />
        ) : (
          <>
            <Input
              value={manualCompany}
              onChange={(event) => onManualCompanyChange(event.target.value)}
              placeholder="Entreprise"
              className="app-input h-10"
            />
            <Input
              value={manualRole}
              onChange={(event) => onManualRoleChange(event.target.value)}
              placeholder="Poste"
              className="app-input h-10"
            />
            <Input
              value={manualUrl}
              onChange={(event) => onManualUrlChange(event.target.value)}
              placeholder="URL source (optionnel)"
              className="app-input h-10"
            />
          </>
        )}
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Notes internes"
          className="app-textarea min-h-24 w-full px-3 py-2 text-sm"
        />
        <Button onClick={onCreate} disabled={!canCreate || busyAction === "create"} className="h-10 w-full">
          {busyAction === "create" ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
          Créer le workflow
        </Button>
      </div>
    </section>
  );
}
