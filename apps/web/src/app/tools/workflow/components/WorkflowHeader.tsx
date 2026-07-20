"use client";

import { Briefcase, FileText, GitBranch } from "lucide-react";

export function WorkflowHeader({
  opportunities,
  jobs,
  resumes,
}: {
  opportunities: number;
  jobs: number;
  resumes: number;
}) {
  return (
    <header className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Parcours guidé
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GitBranch size={18} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Workflow de candidature
                  <sup className="ml-1 inline-flex translate-y-[-0.45em] rounded-full border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.14em] text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300">
                    Beta
                  </sup>
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Pipeline beta piloté par le backend, de l’offre importée à la candidature prête.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:gap-3">
          {[
            {
              label: "Opportunités",
              value: opportunities,
              icon: GitBranch,
            },
            { label: "Offres", value: jobs, icon: Briefcase },
            { label: "CV sauvegardés", value: resumes, icon: FileText },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-xl border border-border bg-muted/40 px-2 py-2 xl:px-3 xl:py-3"
              >
                <div className="mb-1 flex items-center justify-between xl:mb-2">
                  <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground xl:text-xs">
                    {metric.label}
                  </p>
                  <Icon size={14} className="hidden text-muted-foreground xl:block" />
                </div>
                <p className="text-lg font-semibold text-foreground xl:text-2xl">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
