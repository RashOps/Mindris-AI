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
    | "tracker_event"
    | "llm_run";
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "job_scrape", label: "Jobs" },
  { id: "resume_revision", label: "Revisions" },
  { id: "cover_letter", label: "Letters" },
  { id: "ats_report", label: "ATS" },
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
  const [error, setError] = useState<string | null>(null);
  const [subjectType, setSubjectType] =
    useState<(typeof SUBJECT_OPTIONS)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-[1500px] px-4 py-4 lg:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Audit
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <History size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Unified Activity History
                  </h1>
                  <p className="text-sm text-slate-500">
                    Chronological ledger of jobs, ATS reports, cover letters,
                    revisions, tracker items, and model-backed runs.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
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
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
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

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                Recent activity
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading activity ledger…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No activity available for this filter.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-slate-50 ${
                      selectedItem?.id === item.id ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${subjectTone(item.subject_type)}`}
                      >
                        {item.subject_type.replace("_", " ")}
                      </span>
                      {item.status && (
                        <span className="text-[11px] font-medium text-slate-500">
                          {item.status}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-slate-400">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      {item.summary && (
                        <p className="mt-1 text-sm text-slate-600">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                Lineage details
              </p>
            </div>
            {!selectedItem ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                Select a ledger item to inspect its linked artifacts.
              </div>
            ) : (
              <div className="space-y-4 px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Selected item
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {selectedItem.title}
                  </p>
                  {selectedItem.summary && (
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedItem.summary}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Runtime
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Provider: {selectedItem.provider || "n/a"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Model: {selectedItem.model_name || "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Metadata
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      {Object.entries(selectedItem.metadata).slice(0, 5).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-medium text-slate-900">{key}</span>{" "}
                          {String(value)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Linked artifacts
                  </p>
                  {selectedItem.links.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      No linked artifacts recorded for this item.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {selectedItem.links.map((link, index) => (
                        <div
                          key={`${link.subject_type}-${link.subject_id}-${index}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Link2 size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {link.subject_type.replace("_", " ")} #{link.subject_id}
                            </p>
                            <p className="text-xs text-slate-500">{link.relation}</p>
                          </div>
                          <ArrowRight size={14} className="text-slate-400" />
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
