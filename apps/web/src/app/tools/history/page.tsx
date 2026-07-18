"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Filter, History, Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { apiUrl, jsonHeaders } from "@/lib/api";
import { openCoverLetterInMarkdown } from "@/lib/cover-letters";
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
  { id: "all", label: "Tous" },
  { id: "job_scrape", label: "Offres" },
  { id: "resume_revision", label: "Révisions" },
  { id: "cover_letter", label: "Lettres" },
  { id: "ats_report", label: "ATS" },
  { id: "opportunity", label: "Workflow" },
  { id: "tracker_event", label: "Tracker" },
  { id: "llm_run", label: "Runs LLM" },
];

function formatTimestamp(value: string): string {
  if (!value) return "Inconnu";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
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
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "cover_letter":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "tracker_event":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "opportunity":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "resume_revision":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "job_scrape":
      return "border-border bg-muted text-foreground";
    default:
      return "border-border bg-card text-foreground";
  }
}

export default function HistoryPage() {
  const router = useRouter();
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
  const selectedCoverLetterId =
    selectedItem?.subject_type === "cover_letter"
      ? Number(selectedItem.subject_id)
      : null;

  const clearHistory = useCallback(async () => {
    const confirmed = window.confirm(
      "Supprimer définitivement tout l’historique ? Les offres, rapports ATS, lettres, événements Workflow, éléments Tracker et révisions seront supprimés. Les CV sources restent conservés.",
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
      setNotice("Historique unifié supprimé définitivement.");
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
                    Historique d’activité
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Journal chronologique des offres, rapports ATS, lettres,
                    révisions, suivis Tracker et exécutions IA.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void clearHistory()}
                disabled={clearing || loading || items.length === 0}
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? "Suppression..." : "Vider l’historique"}
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Filter size={14} />
                <span>Filtrer</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSubjectType(option.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      subjectType === option.id
                        ? "border-primary bg-primary text-primary-foreground"
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
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {notice}
          </div>
        )}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Activité récente · {items.length}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Chargement du journal…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Aucune activité pour ce filtre.
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
                Détails de lignée
              </p>
            </div>
            {!selectedItem ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Sélectionne une ligne pour inspecter les artefacts liés.
              </div>
            ) : (
              <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Élément sélectionné
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {selectedItem.title}
                  </p>
                  {selectedItem.summary && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedItem.summary}
                    </p>
                  )}
                  {selectedCoverLetterId ? (
                    <button
                      type="button"
                      onClick={() => {
                        void openCoverLetterInMarkdown(selectedCoverLetterId)
                          .then(() => router.push("/tools/markdown"))
                          .catch((openError: unknown) => {
                            setError(
                              openError instanceof Error
                                ? openError.message
                                : "Ouverture de la lettre impossible.",
                            );
                          });
                      }}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Ouvrir dans Markdown PDF
                      <ArrowRight size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Runtime
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      Provider : {selectedItem.provider || "n/a"}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      Modèle : {selectedItem.model_name || "n/a"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Métadonnées
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
                    Artefacts liés
                  </p>
                  {selectedItem.links.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aucun artefact lié enregistré pour cet élément.
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
