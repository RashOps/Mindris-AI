"use client";

import { Briefcase, CheckCircle2, CircleDot, Clock3, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TrackerHeader({
  metrics,
  draft,
  query,
  isSubmitting,
  canCreate,
  onDraftChange,
  onQueryChange,
  onCreate,
}: {
  metrics: {
    totalCount: number;
    appliedCount: number;
    interviewCount: number;
    offerCount: number;
  };
  draft: { company: string; role: string; url: string };
  query: string;
  isSubmitting: boolean;
  canCreate: boolean;
  onDraftChange: (patch: Partial<{ company: string; role: string; url: string }>) => void;
  onQueryChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <header className="mb-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Applications</p>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Job Tracker</h1>
              <p className="text-sm text-muted-foreground">Backend-owned pipeline for applications, interviews, and offers.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total", value: metrics.totalCount, icon: CircleDot },
            { label: "Applied", value: metrics.appliedCount, icon: Clock3 },
            { label: "Interview", value: metrics.interviewCount, icon: Search },
            { label: "Offers", value: metrics.offerCount, icon: CheckCircle2 },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                  <Icon size={14} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold">{metric.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:flex-1">
          <Input
            value={draft.company}
            onChange={(e) => onDraftChange({ company: e.target.value })}
            placeholder="Company"
            data-testid="tracker-company-input"
            className="app-input h-10"
          />
          <Input
            value={draft.role}
            onChange={(e) => onDraftChange({ role: e.target.value })}
            placeholder="Role"
            data-testid="tracker-role-input"
            className="app-input h-10"
          />
          <Input
            value={draft.url}
            onChange={(e) => onDraftChange({ url: e.target.value })}
            placeholder="Job URL"
            data-testid="tracker-url-input"
            className="app-input h-10"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search applications"
            className="app-input h-10 w-full sm:min-w-[260px]"
          />
          <Button
            onClick={onCreate}
            disabled={isSubmitting || !canCreate}
            data-testid="tracker-add-button"
            className="h-10 w-full cursor-pointer px-4 disabled:cursor-not-allowed sm:w-auto"
            title={!canCreate ? "Company and role are required" : "Add application"}
          >
            <Plus size={16} />
            {isSubmitting ? "Adding..." : "Add application"}
          </Button>
        </div>
      </div>
    </header>
  );
}
