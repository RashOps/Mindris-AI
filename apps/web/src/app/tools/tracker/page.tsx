"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Clock3,
  CircleDot,
} from "lucide-react";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUSES = [
  { id: "wishlist", label: "Wishlist", hint: "Opportunities to review" },
  { id: "applied", label: "Applied", hint: "Sent and waiting" },
  { id: "interview", label: "Interview", hint: "Active process" },
  { id: "offer", label: "Offer", hint: "Near decision" },
  { id: "rejected", label: "Rejected", hint: "Closed for now" },
] as const;

type Status = (typeof STATUSES)[number]["id"];

interface ApplicationItem {
  id: number;
  status: Status;
  company: string;
  role: string;
  url?: string;
  notes: string;
  applied_at?: string | null;
  ats_report_id?: number | null;
}

interface TrackerResponse {
  columns?: Record<string, ApplicationItem[]>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(value));
}

function statTone(status: Status): { background: string; border: string; color: string } {
  switch (status) {
    case "offer":
      return { background: "#ecfdf5", border: "#bbf7d0", color: "#166534" };
    case "interview":
      return { background: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" };
    case "applied":
      return { background: "#f8fafc", border: "#e2e8f0", color: "#475569" };
    case "rejected":
      return { background: "#fef2f2", border: "#fecaca", color: "#b91c1c" };
    default:
      return { background: "#faf5ff", border: "#e9d5ff", color: "#7c3aed" };
  }
}

export default function TrackerPage() {
  const [columns, setColumns] = useState<Record<string, ApplicationItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ company: "", role: "", url: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/tracker/applications"), { headers: jsonHeaders() });
      if (!res.ok) throw new Error("Unable to load tracker");
      const data = (await res.json()) as TrackerResponse;
      setColumns(data.columns ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const items = useMemo(() => STATUSES.flatMap((status) => columns[status.id] ?? []), [columns]);
  const filteredColumns = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return columns;
    const next: Record<string, ApplicationItem[]> = {};
    for (const status of STATUSES) {
      next[status.id] = (columns[status.id] ?? []).filter((item) => {
        return [item.company, item.role, item.notes, item.url ?? ""].some((value) =>
          value.toLowerCase().includes(needle),
        );
      });
    }
    return next;
  }, [columns, query]);

  const metrics = useMemo(() => {
    const interviewCount = columns.interview?.length ?? 0;
    const offerCount = columns.offer?.length ?? 0;
    const appliedCount = columns.applied?.length ?? 0;
    const totalCount = items.length;
    return { totalCount, appliedCount, interviewCount, offerCount };
  }, [columns, items.length]);

  const create = async () => {
    if (!draft.company.trim() || !draft.role.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/v1/tracker/applications"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ ...draft, status: "wishlist" }),
      });
      if (!res.ok) throw new Error("Unable to create application");
      setDraft({ company: "", role: "", url: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker create failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const move = async (item: ApplicationItem, status: Status, position: number) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/tracker/applications/${item.id}/move`), {
        method: "PATCH",
        headers: jsonHeaders(),
        body: JSON.stringify({ status, position }),
      });
      if (!res.ok) throw new Error("Unable to move application");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker move failed");
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/tracker/applications/${id}`), {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (!res.ok) throw new Error("Unable to delete application");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tracker delete failed");
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6">
        <header className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Applications</p>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Job Tracker</h1>
                  <p className="text-sm text-slate-500">Backend-owned pipeline for applications, interviews, and offers.</p>
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
                  <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
                      <Icon size={14} className="text-slate-400" />
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
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                placeholder="Company"
                className="h-10 bg-white"
              />
              <Input
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Role"
                className="h-10 bg-white"
              />
              <Input
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                placeholder="Job URL"
                className="h-10 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search applications"
                className="h-10 min-w-[260px] bg-white"
              />
              <Button onClick={create} disabled={isSubmitting} className="h-10 px-4">
                <Plus size={16} />
                {isSubmitting ? "Adding..." : "Add application"}
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
            Loading tracker...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-5">
            {STATUSES.map((status) => {
              const itemsForStatus = filteredColumns[status.id] ?? [];
              const tone = statTone(status.id);
              return (
                <section
                  key={status.id}
                  className="flex min-h-[72vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 px-4 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-semibold">{status.label}</h2>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: tone.background, borderColor: tone.border, color: tone.color }}
                      >
                        {itemsForStatus.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{status.hint}</p>
                  </div>

                  <div className="flex-1 space-y-3 p-3">
                    {itemsForStatus.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-400">
                        No applications in this stage.
                      </div>
                    ) : (
                      itemsForStatus.map((item, index) => {
                        const itemTone = statTone(item.status);
                        return (
                          <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{item.role}</p>
                                <p className="truncate text-xs text-slate-500">{item.company}</p>
                              </div>
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize"
                                style={{
                                  background: itemTone.background,
                                  borderColor: itemTone.border,
                                  color: itemTone.color,
                                }}
                              >
                                {item.status}
                              </span>
                            </div>

                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-slate-500 no-underline hover:text-slate-800"
                              >
                                <ExternalLink size={12} />
                                {item.url}
                              </a>
                            )}

                            {item.notes && (
                              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{item.notes}</p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {STATUSES.filter((candidate) => candidate.id !== item.status).map((target) => (
                                <button
                                  key={target.id}
                                  onClick={() => move(item, target.id, index)}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                                >
                                  <ArrowRight size={11} />
                                  {target.label}
                                </button>
                              ))}
                              <button
                                onClick={() => void remove(item.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:border-red-300"
                              >
                                <Trash2 size={11} />
                                Delete
                              </button>
                            </div>

                            {item.applied_at && (
                              <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-400">
                                Applied {formatDate(item.applied_at)}
                              </p>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
