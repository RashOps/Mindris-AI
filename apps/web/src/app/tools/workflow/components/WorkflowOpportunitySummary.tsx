"use client";

import { ArrowRight, FileBadge2, FileText, ListTodo } from "lucide-react";

import {
  formatTimestamp,
  integrityTone,
  type OpportunityIntegrity,
  type OpportunityItem,
} from "../workflow-model";
import { useI18n } from "@/i18n/I18nProvider";

interface WorkflowOpportunitySummaryProps {
  integrity: OpportunityIntegrity;
  selected: OpportunityItem;
}

export function WorkflowOpportunitySummary({
  integrity,
  selected,
}: WorkflowOpportunitySummaryProps) {
  const { messages } = useI18n();
  const copy = messages.pages.workflow;
  const stats = [
    { label: "CV", value: selected.resume_id ? `#${selected.resume_id}` : copy.missing, icon: FileText },
    { label: "ATS", value: selected.ats_report_id ? `#${selected.ats_report_id}` : copy.missing, icon: FileBadge2 },
    { label: copy.letter, value: selected.cover_letter_id ? `#${selected.cover_letter_id}` : copy.missing, icon: FileText },
    { label: copy.tracker, value: selected.application_id ? `#${selected.application_id}` : copy.missing, icon: ListTodo },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid={`workflow-selected-${selected.id}`}
              className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              #{selected.id}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {copy.states[selected.current_state]}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                integrityTone(integrity.status)
              }`}
            >
              {integrity.status === "degraded" ? copy.degradedIntegrity : copy.healthyIntegrity}
            </span>
            <span className="text-xs text-muted-foreground">
              {copy.updated} {formatTimestamp(selected.last_transition_at)}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {selected.role}
          </h2>
          <p className="text-sm text-muted-foreground">{selected.company}</p>
          {selected.source_url && (
            <a
              href={selected.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 underline-offset-4 hover:underline"
            >
              {copy.sourceJob}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <Icon size={14} className="text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
