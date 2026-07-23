"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, CircleDot, Clock3, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { messages } = useI18n();
  const copy = messages.pages.tracker;
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <header className="mb-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{copy.applications}</p>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase size={18} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Tracker</h1>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 xl:gap-3">
          {[
            { label: copy.total, value: metrics.totalCount, icon: CircleDot },
            { label: copy.sentPlural, value: metrics.appliedCount, icon: Clock3 },
            { label: copy.interviews, value: metrics.interviewCount, icon: Search },
            { label: copy.offer, value: metrics.offerCount, icon: CheckCircle2 },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-border bg-muted/40 px-2 py-2 xl:px-3 xl:py-3">
                <div className="mb-1 flex items-center justify-between xl:mb-2">
                  <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground xl:text-xs">{metric.label}</p>
                  <Icon size={14} className="hidden text-muted-foreground xl:block" />
                </div>
                <p className="text-lg font-semibold xl:text-2xl">{metric.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex min-w-0 gap-2 xl:hidden">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={copy.searchApplication}
          className="app-input h-10 min-w-0 flex-1 xl:max-w-sm"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCreateOpen((current) => !current)}
          className="h-10 shrink-0 xl:hidden"
          aria-expanded={isCreateOpen}
        >
          {isCreateOpen ? <X size={16} /> : <Plus size={16} />}
          {isCreateOpen ? copy.close : copy.add}
        </Button>
      </div>

      <div className={`${isCreateOpen ? "flex" : "hidden"} mt-3 flex-col gap-3 xl:flex xl:flex-row xl:items-center`}>
        <div className="grid gap-2 sm:grid-cols-3 xl:flex xl:flex-1">
          <Input
            value={draft.company}
            onChange={(e) => onDraftChange({ company: e.target.value })}
            placeholder={copy.company}
            data-testid="tracker-company-input"
            className="app-input h-10"
          />
          <Input
            value={draft.role}
            onChange={(e) => onDraftChange({ role: e.target.value })}
            placeholder={copy.role}
            data-testid="tracker-role-input"
            className="app-input h-10"
          />
          <Input
            value={draft.url}
            onChange={(e) => onDraftChange({ url: e.target.value })}
            placeholder={copy.jobUrl}
            data-testid="tracker-url-input"
            className="app-input h-10"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={messages.common.search}
            className="app-input hidden h-10 w-full xl:block xl:min-w-[260px]"
          />
          <Button
            onClick={onCreate}
            disabled={isSubmitting || !canCreate}
            data-testid="tracker-add-button"
            className="h-10 w-full cursor-pointer px-4 disabled:cursor-not-allowed sm:w-auto"
            title={!canCreate ? copy.requiredCompanyRole : copy.newApplication}
          >
            <Plus size={16} />
            {isSubmitting ? copy.adding : copy.add}
          </Button>
        </div>
      </div>
    </header>
  );
}
