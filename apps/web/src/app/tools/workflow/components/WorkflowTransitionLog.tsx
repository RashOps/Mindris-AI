"use client";

import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatTimestamp,
  type WorkflowTransition,
} from "../workflow-model";
import { useI18n } from "@/i18n/I18nProvider";

interface WorkflowTransitionLogProps {
  busyAction: string | null;
  transitions: WorkflowTransition[];
  onMarkReady: () => void;
}

export function WorkflowTransitionLog({
  busyAction,
  transitions,
  onMarkReady,
}: WorkflowTransitionLogProps) {
  const { messages } = useI18n();
  const copy = messages.pages.workflow;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{copy.log}</p>
        <Button className="h-9" disabled={busyAction === "ready"} onClick={onMarkReady}>
          {busyAction === "ready" ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />}
          {copy.markReady}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {transitions.map((transition) => (
          <div key={transition.id} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {copy.states[transition.state]}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(transition.created_at)}
              </p>
            </div>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {transition.action}
            </p>
            {Object.keys(transition.metadata ?? {}).length > 0 && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                {JSON.stringify(transition.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
