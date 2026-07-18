"use client";

import { Loader2 } from "lucide-react";

import {
  STATE_LABELS,
  formatTimestamp,
  integrityTone,
  type OpportunityItem,
} from "../workflow-model";

interface WorkflowOpportunityListProps {
  loading: boolean;
  opportunities: OpportunityItem[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
}

export function WorkflowOpportunityList({
  loading,
  opportunities,
  selectedId,
  onSelect,
}: WorkflowOpportunityListProps) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Opportunités actives</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Chargement des workflows...
        </div>
      ) : opportunities.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Aucune opportunité. Démarrez depuis une offre importée ou créez une fiche manuelle.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {opportunities.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              data-testid={`workflow-card-${item.id}`}
              className={`w-full px-4 py-4 text-left transition-colors hover:bg-accent ${
                selectedId === item.id ? "bg-accent" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  #{item.id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(item.last_transition_at)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{item.role}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.company}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {STATE_LABELS[item.current_state]}
                </p>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    integrityTone(item.integrity?.status)
                  }`}
                >
                  {item.integrity?.status === "degraded" ? "À réparer" : "Sain"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
