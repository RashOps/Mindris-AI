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
            Automation
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GitBranch size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Opportunity Workflow</h1>
              <p className="text-sm text-muted-foreground">
                Backend-owned pipeline from scraped job to ready-to-apply application.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Open opportunities", value: opportunities, icon: GitBranch },
            { label: "Jobs available", value: jobs, icon: Briefcase },
            { label: "Saved resumes", value: resumes, icon: FileText },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </p>
                  <Icon size={14} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
}
