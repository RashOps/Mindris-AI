"use client";

import { FileBadge2, FileText, ListTodo } from "lucide-react";

import { formatTimestamp, type OpportunityItem } from "../workflow-model";
import { useI18n } from "@/i18n/I18nProvider";

interface WorkflowReadinessChecklistProps {
  selected: OpportunityItem;
}

export function WorkflowReadinessChecklist({
  selected,
}: WorkflowReadinessChecklistProps) {
  const { messages } = useI18n();
  const copy = messages.pages.workflow;
  const readinessItems = [
    {
      label: copy.tailoredResume,
      done: Boolean(selected.resume_id),
      detail: selected.resume_id
        ? `CV #${selected.resume_id}${selected.linked_artifacts?.resume?.revision ? ` · r${selected.linked_artifacts.resume.revision}` : ""}${selected.resume_locale ? ` · ${selected.resume_locale.toUpperCase()}` : ""}`
        : copy.linkResumeBeforeApply,
      icon: FileText,
    },
    {
      label: copy.atsScore,
      done: Boolean(selected.ats_report_id),
      detail: selected.ats_report_id
        ? `ATS #${selected.ats_report_id}${selected.linked_artifacts?.ats_report?.generated_at ? ` · ${formatTimestamp(selected.linked_artifacts.ats_report.generated_at)}` : ""}`
        : copy.analyzeResume,
      icon: FileBadge2,
    },
    {
      label: copy.letter,
      done: Boolean(selected.cover_letter_id),
      detail: selected.cover_letter_id
        ? `#${selected.cover_letter_id}${selected.linked_artifacts?.cover_letter?.generated_at ? ` · ${formatTimestamp(selected.linked_artifacts.cover_letter.generated_at)}` : ""}`
        : copy.generateLetter,
      icon: FileText,
    },
    {
      label: copy.tracker,
      done: Boolean(selected.application_id),
      detail: selected.application_id
        ? `Tracker #${selected.application_id}${selected.linked_artifacts?.application?.updated_at ? ` · ${formatTimestamp(selected.linked_artifacts.application.updated_at)}` : ""}`
        : copy.createTrackerEntry,
      icon: ListTodo,
    },
  ];
  const readyCount = readinessItems.filter((item) => item.done).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{copy.readiness}</p>
          <p className="text-xs text-muted-foreground">
            {readyCount}/4 éléments nécessaires sont liés à cette opportunité.
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          {selected.job_id ? `${copy.filteredByJob} #${selected.job_id}` : copy.manualOpportunity}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {readinessItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`rounded-xl border px-3 py-3 ${
                item.done
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-border bg-muted/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  size={16}
                  className={item.done ? "mt-0.5 text-emerald-600 dark:text-emerald-300" : "mt-0.5 text-muted-foreground"}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
