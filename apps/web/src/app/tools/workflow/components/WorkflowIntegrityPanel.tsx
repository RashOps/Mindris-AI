"use client";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import {
  integrityTone,
  repairActionLabel,
  type OpportunityIntegrity,
} from "../workflow-model";

interface WorkflowIntegrityPanelProps {
  busyAction: string | null;
  integrity: OpportunityIntegrity;
  onRepair: (action: string) => void;
}

export function WorkflowIntegrityPanel({
  busyAction,
  integrity,
  onRepair,
}: WorkflowIntegrityPanelProps) {
  const { messages } = useI18n();
  const copy = messages.pages.workflow;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{copy.integrity}</p>
          <p className="text-xs text-muted-foreground">
            {copy.integrityDescription}
          </p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            integrityTone(integrity.status)
          }`}
        >
          {integrity.status === "degraded" ? copy.needsRepair : copy.healthy}
        </span>
      </div>

      {integrity.issues.length === 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {copy.noIntegrityIssue}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {integrity.issues.map((issue) => (
            <div
              key={issue.code}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  {issue.artifact}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  {issue.severity}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{issue.message}</p>
              {Object.keys(issue.metadata ?? {}).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                  {JSON.stringify(issue.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {integrity.repair_actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {integrity.repair_actions.map((action) => (
            <Button
              key={action}
              variant="outline"
              className="h-9"
              data-testid={`workflow-repair-${action}`}
              disabled={busyAction === `repair:${action}`}
              onClick={() => onRepair(action)}
            >
              {busyAction === `repair:${action}` ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {repairActionLabel(action)}
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
