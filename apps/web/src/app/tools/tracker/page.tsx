"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCheck,
  ExternalLink,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { compactTrackerSummary, toggleExpandedTrackerCard } from "@/lib/tracker-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackerHeader } from "./components/TrackerHeader";

const STATUSES = [
  { id: "wishlist", label: "À étudier", hint: "Opportunités à qualifier" },
  { id: "applied", label: "Candidaté", hint: "Envoyé, en attente" },
  { id: "interview", label: "Entretien", hint: "Process actif" },
  { id: "offer", label: "Offre", hint: "Décision proche" },
  { id: "rejected", label: "Refusé", hint: "Clôturé pour l’instant" },
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
  reminder_counts?: Record<string, number>;
  next_reminder?: ReminderItem | null;
  reminders?: ReminderItem[];
}

interface ReminderItem {
  id: number;
  application_id: number;
  title: string;
  due_at: string;
  status: "pending" | "completed" | "dismissed";
  notes: string;
  completed_at?: string | null;
}

interface TrackerResponse {
  columns?: Record<string, ApplicationItem[]>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "short", day: "2-digit" }).format(new Date(value));
}

function statTone(status: Status): string {
  switch (status) {
    case "offer":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "interview":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "applied":
      return "border-border bg-muted text-muted-foreground";
    case "rejected":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
}

export default function TrackerPage() {
  const [columns, setColumns] = useState<Record<string, ApplicationItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ company: "", role: "", url: "" });
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [reminderDrafts, setReminderDrafts] = useState<
    Record<number, { title: string; dueAt: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canCreate = Boolean(draft.company.trim() && draft.role.trim());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/tracker/applications"), { headers: jsonHeaders() });
      if (!res.ok) throw new Error("Chargement du tracker impossible");
      const data = (await res.json()) as TrackerResponse;
      setColumns(data.columns ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur Tracker");
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
    if (!canCreate) {
      setError("Entreprise et poste sont obligatoires.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/v1/tracker/applications"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          company: draft.company.trim(),
          role: draft.role.trim(),
          url: draft.url.trim() || null,
          status: "wishlist",
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(
          typeof detail?.detail === "string"
            ? detail.detail
            : "Création de candidature impossible",
        );
      }
      setDraft({ company: "", role: "", url: "" });
      setExpandedIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création Tracker impossible");
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
      if (!res.ok) throw new Error("Déplacement de candidature impossible");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Déplacement Tracker impossible");
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/tracker/applications/${id}`), {
        method: "DELETE",
        headers: jsonHeaders(),
      });
      if (!res.ok) throw new Error("Suppression de candidature impossible");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression Tracker impossible");
    }
  };

  const createReminder = async (applicationId: number) => {
    const draftState = reminderDrafts[applicationId] ?? { title: "", dueAt: "" };
    if (!draftState.title.trim() || !draftState.dueAt.trim()) {
      setError("Titre et date de relance sont obligatoires.");
      return;
    }
    try {
      const res = await fetch(
        apiUrl(`/api/v1/tracker/applications/${applicationId}/reminders`),
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            title: draftState.title.trim(),
            due_at: draftState.dueAt,
          }),
        },
      );
      if (!res.ok) throw new Error("Création de relance impossible");
      setReminderDrafts((current) => ({
        ...current,
        [applicationId]: { title: "", dueAt: "" },
      }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de relance impossible");
    }
  };

  const updateReminderStatus = async (
    applicationId: number,
    reminderId: number,
    status: ReminderItem["status"],
  ) => {
    try {
      const res = await fetch(
        apiUrl(`/api/v1/tracker/applications/${applicationId}/reminders/${reminderId}`),
        {
          method: "PATCH",
          headers: jsonHeaders(),
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error("Mise à jour de relance impossible");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour de relance impossible");
    }
  };

  const deleteReminder = async (applicationId: number, reminderId: number) => {
    try {
      const res = await fetch(
        apiUrl(`/api/v1/tracker/applications/${applicationId}/reminders/${reminderId}`),
        {
          method: "DELETE",
          headers: jsonHeaders(),
        },
      );
      if (!res.ok) throw new Error("Suppression de relance impossible");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression de relance impossible");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6">
        <TrackerHeader
          metrics={metrics}
          draft={draft}
          query={query}
          isSubmitting={isSubmitting}
          canCreate={canCreate}
          onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          onQueryChange={setQuery}
          onCreate={create}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground shadow-sm">
            Chargement du tracker...
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-5">
            {STATUSES.map((status) => {
              const itemsForStatus = filteredColumns[status.id] ?? [];
              const tone = statTone(status.id);
              return (
                <section
                  key={status.id}
                  className="flex min-h-[72vh] w-full min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="min-w-0 border-b border-border px-4 py-4">
                    <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">{status.label}</h2>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
                      >
                        {itemsForStatus.length}
                      </span>
                    </div>
                    <p className="min-w-0 text-xs text-muted-foreground">{status.hint}</p>
                  </div>

                  <div className="min-w-0 flex-1 space-y-3 p-3">
                    {itemsForStatus.length === 0 ? (
                      <div className="flex h-full min-w-0 items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
                        Aucune candidature dans cette colonne.
                      </div>
                    ) : (
                      itemsForStatus.map((item, index) => {
                        const itemTone = statTone(item.status);
                        const expanded = expandedIds.includes(item.id);
                        const summaryBadges = compactTrackerSummary({
                          notes: item.notes,
                          reminderCounts: item.reminder_counts,
                          nextReminderLabel: item.next_reminder?.due_at
                            ? formatDate(item.next_reminder.due_at)
                            : null,
                        });
                        return (
                          <article key={item.id} className="rounded-lg border border-border bg-muted/40 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{item.role}</p>
                                <p className="truncate text-xs text-muted-foreground">{item.company}</p>
                              </div>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${itemTone}`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                              {summaryBadges.map((badge) => (
                                <span
                                  key={badge}
                                  className="inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>

                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex max-w-full cursor-pointer items-center gap-1.5 truncate text-xs text-muted-foreground no-underline hover:text-foreground"
                              >
                                <ExternalLink size={12} />
                                {item.url}
                              </a>
                            )}

                            {expanded && item.notes && (
                              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.notes}</p>
                            )}

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedIds((current) =>
                                    toggleExpandedTrackerCard(current, item.id),
                                  )
                                }
                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                              >
                                {expanded ? "Masquer" : "Détails"}
                              </button>
                              {item.applied_at && (
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                  Envoyé {formatDate(item.applied_at)}
                                </p>
                              )}
                            </div>

                            {expanded && (
                            <div className="mt-3 rounded-lg border border-border bg-card p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  <BellRing size={12} />
                                  Relances
                                </div>
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {item.reminder_counts?.pending ?? 0} en attente
                                </span>
                              </div>

                              {item.reminders && item.reminders.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                  {item.reminders.slice(0, 3).map((reminder) => (
                                    <div
                                      key={reminder.id}
                                      className="rounded-md border border-border bg-muted/40 px-2 py-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="truncate text-xs font-semibold text-foreground">
                                            {reminder.title}
                                          </p>
                                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <CalendarClock size={11} />
                                            {formatDate(reminder.due_at)}
                                          </p>
                                        </div>
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                            reminder.status === "completed"
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                              : reminder.status === "dismissed"
                                                ? "border-border bg-muted text-muted-foreground"
                                                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                          }`}
                                        >
                                          {reminder.status}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {reminder.status === "pending" && (
                                          <>
                                            <button
                                              onClick={() =>
                                                void updateReminderStatus(item.id, reminder.id, "completed")
                                              }
                                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-emerald-500/30 bg-card px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                                            >
                                              <CheckCheck size={11} />
                                              Fait
                                            </button>
                                            <button
                                              onClick={() =>
                                                void updateReminderStatus(item.id, reminder.id, "dismissed")
                                              }
                                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
                                            >
                                              <X size={11} />
                                              Ignorer
                                            </button>
                                          </>
                                        )}
                                        <button
                                          onClick={() => void deleteReminder(item.id, reminder.id)}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-destructive/30 bg-card px-2 py-1 text-[11px] font-medium text-destructive"
                                        >
                                          <Trash2 size={11} />
                                          Supprimer
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                  Aucune relance planifiée.
                                </p>
                              )}

                              <div className="mt-2 grid gap-2">
                                <Input
                                  value={reminderDrafts[item.id]?.title ?? ""}
                                  onChange={(event) =>
                                    setReminderDrafts((current) => ({
                                      ...current,
                                      [item.id]: {
                                        title: event.target.value,
                                        dueAt: current[item.id]?.dueAt ?? "",
                                      },
                                    }))
                                  }
                                  placeholder="Titre de relance"
                                  className="app-input h-9 text-xs"
                                />
                                <Input
                                  type="datetime-local"
                                  value={reminderDrafts[item.id]?.dueAt ?? ""}
                                  onChange={(event) =>
                                    setReminderDrafts((current) => ({
                                      ...current,
                                      [item.id]: {
                                        title: current[item.id]?.title ?? "",
                                        dueAt: event.target.value,
                                      },
                                    }))
                                  }
                                  className="app-input h-9 text-xs"
                                />
                                <Button
                                  onClick={() => void createReminder(item.id)}
                                  variant="outline"
                                  className="h-8 justify-center text-xs"
                                >
                                  <Plus size={12} />
                                  Ajouter une relance
                                </Button>
                              </div>
                            </div>
                            )}

                            {expanded && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {STATUSES.filter((candidate) => candidate.id !== item.status).map((target) => (
                                <button
                                  key={target.id}
                                  onClick={() => move(item, target.id, index)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                  <ArrowRight size={11} />
                                  {target.label}
                                </button>
                              ))}
                              <button
                                onClick={() => void remove(item.id)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-destructive/30 bg-card px-2 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                              >
                                <Trash2 size={11} />
                                Supprimer
                              </button>
                            </div>
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
