"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import {
  formatTimestamp,
  integrityTone,
  type OpportunityItem,
} from "../workflow-model";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { locale, messages } = useI18n();
  const copy = messages.pages.workflow;
  const [query, setQuery] = useState("");
  const filteredOpportunities = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return opportunities;
    return opportunities.filter((item) =>
      `${item.role} ${item.company}`.toLocaleLowerCase(locale).includes(needle),
    );
  }, [locale, opportunities, query]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{copy.activeOpportunities}</p>
          <span className="text-xs text-muted-foreground">
            {filteredOpportunities.length}/{opportunities.length}
          </span>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.searchOpportunity}
            className="app-input h-9 w-full pl-9 text-xs"
          />
        </label>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          {copy.loading}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {copy.noOpportunity}
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {copy.noSearchResult}
        </div>
      ) : (
        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">
          {filteredOpportunities.map((item) => (
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
                  {copy.states[item.current_state]}
                </p>
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    integrityTone(item.integrity?.status)
                  }`}
                >
                  {item.integrity?.status === "degraded" ? copy.needsRepair : copy.healthy}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
