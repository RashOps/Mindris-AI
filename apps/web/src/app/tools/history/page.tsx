"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, History, Link2, Loader2 } from "lucide-react";

import { apiUrl, jsonHeaders } from "@/lib/api";
import {
  normalizeHistoryLedgerItem,
  type HistoryLedgerItem,
} from "@/store/useCVStore";

const SUBJECT_OPTIONS: Array<{
  id:
    | "all"
    | "job_scrape"
    | "resume_revision"
    | "cover_letter"
    | "ats_report"
    | "opportunity"
    | "tracker_event"
    | "llm_run";
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "job_scrape", label: "Jobs" },
  { id: "resume_revision", label: "Revisions" },
  { id: "cover_letter", label: "Letters" },
  { id: "ats_report", label: "ATS" },
  { id: "opportunity", label: "Workflow" },
  { id: "tracker_event", label: "Tracker" },
  { id: "llm_run", label: "LLM runs" },
];

function formatTimestamp(value: string): string {
  if (!value) return "Unknown";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function subjectTone(subjectType: HistoryLedgerItem["subject_type"]): string {
  switch (subjectType) {
    case "ats_report":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "cover_letter":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "tracker_event":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "opportunity":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "resume_revision":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "job_scrape":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-white text-slate-700 border-slate-200";
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [subjectType, setSubjectType] =
    useState<(typeof SUBJECT_OPTIONS)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams();
      if (subjectType !== "all") params.set("subject_type", subjectType);
      const res = await fetch(
        apiUrl(`/api/v1/history/ledger${params.size ? `?${params.toString()}` : ""}`),
        { headers: jsonHeaders() },
      );
      if (!res.ok) throw new Error("Unable to load unified history.");
      const data = (await res.json()) as { items?: HistoryLedgerItem[] };
      setItems(
        Array.isArray(data.items)
          ? data.items.map((item) => normalizeHistoryLedgerItem(item))
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load unified history.",
      );
    } finally {
      setLoading(false);
    }
  }, [subjectType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  const clearHistory = useCallback(async () => {
    const confirmed = window.confirm(
      "Delete all history artifacts permanently? This clears jobs, ATS reports, cover letters, workflow events, tracker history, and resume revisions. Source resumes stay intact.",
    );
    if (!confirmed) return;

    setClearing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(apiUrl("/api/v1/history/ledger"), {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to clear unified history.");
      }
      setSelectedId(null);
      setItems([]);
      setNotice("Unified history cleared permanently.");
      await load();
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Unable to clear unified history.",
      );
    } finally {
      setClearing(false);
    }
  }, [load]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-[1500px] px-4 py-4 lg:px-6">
        <header className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Audit
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <History size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Unified Activity History
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Chronological ledger of jobs, ATS reports, cover letters,
                    revisions, tracker items, and model-backed runs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void clearHistory()}
                disabled={clearing || loading || items.length === 0}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? "Clearing..." : "Clear history"}
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Filter size={14} />
                <span>Filter</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSubjectType(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      subjectType === option.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-border bg-card text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Recent activity · {items.length}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Loading activity ledger…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                No activity available for this filter.
              </div>
            ) : (
              <div className="max-h-[calc(100vh-18rem)] divide-y divide-border overflow-y-auto">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-accent ${
                      selectedItem?.id === item.id ? "bg-accent" : "bg-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${subjectTone(item.subject_type)}`}
                      >
                        {item.subject_type.replace("_", " ")}
                      </span>
                      {item.status && (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {item.status}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      {item.summary && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Lineage details
              </p>
            </div>
            {!selectedItem ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Select a ledger item to inspect its linked artifacts.
              </div>
            ) : (
              <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected item
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedItem.title}
                  </p>
                  {selectedItem.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedItem.summary}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Runtime
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      Provider: {selectedItem.provider || "n/a"}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Model: {selectedItem.model_name || "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Metadata
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {Object.entries(selectedItem.metadata).slice(0, 5).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-medium text-foreground">{key}</span>{" "}
                          {String(value)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Linked artifacts
                  </p>
                  {selectedItem.links.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No linked artifacts recorded for this item.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedItem.links.map((link, index) => (
                        <div
                          key={`${link.subject_type}-${link.subject_id}-${index}`}
                          className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Link2 size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {link.subject_type.replace("_", " ")} #{link.subject_id}
                            </p>
                            <p className="text-xs text-muted-foreground">{link.relation}</p>
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
