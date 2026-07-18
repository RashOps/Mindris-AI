"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileBadge2,
  FileText,
  ListTodo,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import { openCoverLetterInMarkdown } from "@/lib/cover-letters";
import { WorkflowHeader } from "./components/WorkflowHeader";
import {
  STATE_LABELS,
  STATE_ORDER,
  formatTimestamp,
  integrityTone,
  repairActionLabel,
  requestJson,
  stateTone,
  type ApplicationItem,
  type AtsReportItem,
  type CoverLetterItem,
  type JobItem,
  type OpportunityItem,
  type ResumeItem,
} from "./workflow-model";
export default function WorkflowPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [atsReports, setAtsReports] = useState<AtsReportItem[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"job" | "manual">("job");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeId, setResumeId] = useState<string>("");
  const [resumeLocale, setResumeLocale] = useState("fr");
  const [atsReportId, setAtsReportId] = useState<string>("");
  const [coverLetterId, setCoverLetterId] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowData, jobsData, resumesData, atsData, lettersData, trackerData] =
        await Promise.all([
          requestJson<{ items: OpportunityItem[] }>("/api/v1/workflows/opportunities"),
          requestJson<{ items: JobItem[] }>("/api/v1/history/jobs"),
          requestJson<{ items: ResumeItem[] }>("/api/v1/resumes"),
          requestJson<{ items: AtsReportItem[] }>("/api/v1/history/ats-reports"),
          requestJson<{ items: CoverLetterItem[] }>("/api/v1/history/cover-letters"),
          requestJson<{ items: ApplicationItem[] }>("/api/v1/tracker/applications"),
        ]);
      setOpportunities(Array.isArray(workflowData.items) ? workflowData.items : []);
      setJobs(Array.isArray(jobsData.items) ? jobsData.items : []);
      setResumes(Array.isArray(resumesData.items) ? resumesData.items : []);
      setAtsReports(Array.isArray(atsData.items) ? atsData.items : []);
      setCoverLetters(Array.isArray(lettersData.items) ? lettersData.items : []);
      setApplications(Array.isArray(trackerData.items) ? trackerData.items : []);
      setSelectedId((current) => {
        if (current && workflowData.items.some((item) => item.id === current)) return current;
        return workflowData.items[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load workflow.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);
  const selected = useMemo(
    () => opportunities.find((item) => item.id === selectedId) ?? opportunities[0] ?? null,
    [opportunities, selectedId],
  );
  useEffect(() => {
    if (!selected) return;
    const timeoutId = window.setTimeout(() => {
      setResumeId(selected.resume_id ? String(selected.resume_id) : "");
      setResumeLocale(selected.resume_locale ?? "fr");
      setAtsReportId(selected.ats_report_id ? String(selected.ats_report_id) : "");
      setCoverLetterId(selected.cover_letter_id ? String(selected.cover_letter_id) : "");
      setApplicationId(selected.application_id ? String(selected.application_id) : "");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selected]);
  const filteredAtsReports = selected?.job_id
    ? atsReports.filter((item) => item.job_id === selected.job_id)
    : atsReports;
  const filteredCoverLetters = selected?.job_id
    ? coverLetters.filter((item) => item.job_id === selected.job_id)
    : coverLetters;
  const filteredApplications = selected?.job_id
    ? applications.filter((item) => item.job_id === selected.job_id)
    : applications;
  const activeCoverLetterId = coverLetterId
    ? Number(coverLetterId)
    : selected?.cover_letter_id ?? null;
  const canCreate =
    createMode === "job"
      ? Boolean(selectedJobId)
      : Boolean(manualCompany.trim() && manualRole.trim());
  async function runAction(
    action: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    setBusyAction(action);
    setError(null);
    try {
      await callback();
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action workflow impossible.");
    } finally {
      setBusyAction(null);
    }
  }
  async function openActiveCoverLetter(): Promise<void> {
    if (!activeCoverLetterId) return;
    await openCoverLetterInMarkdown(activeCoverLetterId);
    router.push("/tools/markdown");
  }
  const selectedResume = resumes.find((item) => item.id === Number(resumeId));
  const localeOptions = selectedResume?.multilingual?.availableLocales?.length
    ? selectedResume.multilingual.availableLocales
    : [selectedResume?.multilingual?.activeLocale ?? selectedResume?.locale ?? "fr"];
  const integrity = selected?.integrity ?? {
    status: "healthy" as const,
    issues: [],
    repair_actions: [],
  };
  const readinessItems = selected
    ? [
        {
          label: "CV adapté",
          done: Boolean(selected.resume_id),
          detail: selected.resume_id ? `CV #${selected.resume_id}${selected.resume_locale ? ` · ${selected.resume_locale.toUpperCase()}` : ""}` : "Lier un CV avant de candidater.",
          icon: FileText,
        },
        {
          label: "Score ATS",
          done: Boolean(selected.ats_report_id),
          detail: selected.ats_report_id ? `Rapport #${selected.ats_report_id}` : "Analyser le CV contre l’offre.",
          icon: FileBadge2,
        },
        {
          label: "Lettre",
          done: Boolean(selected.cover_letter_id),
          detail: selected.cover_letter_id ? `Lettre #${selected.cover_letter_id}` : "Générer ou lier une lettre.",
          icon: FileText,
        },
        {
          label: "Suivi",
          done: Boolean(selected.application_id),
          detail: selected.application_id ? `Tracker #${selected.application_id}` : "Créer une entrée tracker.",
          icon: ListTodo,
        },
      ]
    : [];
  const readyCount = readinessItems.filter((item) => item.done).length;
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        <WorkflowHeader
          opportunities={opportunities.length}
          jobs={jobs.length}
          resumes={resumes.length}
        />
        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-foreground">Créer une opportunité</p>
                <div className="flex w-fit rounded-lg border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setCreateMode("job")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      createMode === "job" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Depuis une offre
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode("manual")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      createMode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Manuel
                  </button>
                </div>
              </div>
              <div className="min-w-0 space-y-3">
                {createMode === "job" ? (
                  <ToolbarSelect
                    value={selectedJobId}
                    ariaLabel="Sélectionner une offre importée"
                    placeholder="Sélectionner une offre"
                    options={[
                      { value: "", label: "Sélectionner une offre" },
                      ...jobs.map((job) => ({
                        value: String(job.id),
                        label: `${job.company} - ${job.title}`,
                      })),
                    ]}
                    onChange={setSelectedJobId}
                    triggerClassName="app-select h-10 w-full px-3 text-sm"
                    menuClassName="min-w-full"
                  />
                ) : (
                  <>
                    <Input
                      value={manualCompany}
                      onChange={(event) => setManualCompany(event.target.value)}
                      placeholder="Entreprise"
                      className="app-input h-10"
                    />
                    <Input
                      value={manualRole}
                      onChange={(event) => setManualRole(event.target.value)}
                      placeholder="Poste"
                      className="app-input h-10"
                    />
                    <Input
                      value={manualUrl}
                      onChange={(event) => setManualUrl(event.target.value)}
                      placeholder="URL source (optionnel)"
                      className="app-input h-10"
                    />
                  </>
                )}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Notes internes"
                  className="app-textarea min-h-24 w-full px-3 py-2 text-sm"
                />
                <Button
                  onClick={() =>
                    void runAction("create", async () => {
                      await requestJson("/api/v1/workflows/opportunities", {
                        method: "POST",
                        body: JSON.stringify(
                          createMode === "job"
                            ? { job_id: Number(selectedJobId), notes }
                            : {
                                company: manualCompany.trim(),
                                role: manualRole.trim(),
                                source_url: manualUrl.trim() || null,
                                notes,
                              },
                        ),
                      });
                      setNotes("");
                      setManualCompany("");
                      setManualRole("");
                      setManualUrl("");
                      setSelectedJobId("");
                    })
                  }
                  disabled={!canCreate || busyAction === "create"}
                  className="h-10 w-full"
                >
                  {busyAction === "create" ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                  Créer le workflow
                </Button>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Opportunités actives</p>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  Chargement des workflows...
                </div>
              ) : opportunities.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Aucune opportunité. Démarrez depuis une offre importée ou créez une fiche manuelle.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {opportunities.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      data-testid={`workflow-card-${item.id}`}
                      className={`w-full px-4 py-4 text-left transition-colors hover:bg-accent ${
                        selected?.id === item.id ? "bg-accent" : "bg-card"
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
                          {STATE_LABELS[item.current_state]}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            integrityTone(item.integrity?.status)
                          }`}
                        >
                          {item.integrity?.status === "degraded" ? "À réparer" : "Sain"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </aside>
          <section className="min-w-0 space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-sm">
                Sélectionnez une opportunité pour piloter les prochaines étapes.
              </div>
            ) : (
              <>
                <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-testid={`workflow-selected-${selected.id}`}
                          className="rounded-full border border-border bg-background px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          #{selected.id}
                        </span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                          {STATE_LABELS[selected.current_state]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            integrityTone(integrity.status)
                          }`}
                        >
                          {integrity.status === "degraded" ? "Intégrité dégradée" : "Intégrité saine"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Mis à jour {formatTimestamp(selected.last_transition_at)}
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {selected.role}
                      </h2>
                      <p className="text-sm text-muted-foreground">{selected.company}</p>
                      {selected.source_url && (
                        <a
                          href={selected.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-sm text-blue-700 underline-offset-4 hover:underline"
                        >
                          Offre source
                          <ArrowRight size={14} />
                        </a>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
                      {[
                        { label: "CV", value: selected.resume_id ? `#${selected.resume_id}` : "Manquant", icon: FileText },
                        { label: "ATS", value: selected.ats_report_id ? `#${selected.ats_report_id}` : "Manquant", icon: FileBadge2 },
                        { label: "Lettre", value: selected.cover_letter_id ? `#${selected.cover_letter_id}` : "Manquant", icon: FileText },
                        { label: "Tracker", value: selected.application_id ? `#${selected.application_id}` : "Manquant", icon: ListTodo },
                      ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                          <div key={stat.label} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {stat.label}
                              </p>
                              <Icon size={14} className="text-muted-foreground" />
                            </div>
                            <p className="text-base font-semibold text-foreground">{stat.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Prêt à candidater ?</p>
                      <p className="text-xs text-muted-foreground">
                        {readyCount}/4 éléments nécessaires sont liés à cette opportunité.
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {selected.job_id ? `Filtré par offre #${selected.job_id}` : "Opportunité manuelle"}
                    </span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {readinessItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className={`rounded-xl border px-3 py-3 ${
                            item.done
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-border bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon
                              size={16}
                              className={item.done ? "mt-0.5 text-emerald-600 dark:text-emerald-300" : "mt-0.5 text-muted-foreground"}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{item.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-foreground">État du workflow</p>
                  <div className="grid gap-2 xl:grid-cols-7">
                    {STATE_ORDER.map((state) => {
                      const active = selected.current_state === state;
                      const done =
                        selected.transitions.some((transition) => transition.state === state) && !active;
                      return (
                        <div
                          key={state}
                          className={`rounded-xl border px-3 py-3 text-xs font-medium ${stateTone(active, done)}`}
                        >
                          {STATE_LABELS[state]}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Intégrité</p>
                      <p className="text-xs text-muted-foreground">
                        Contrôle backend des liens et actions de réparation limitées.
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        integrityTone(integrity.status)
                      }`}
                    >
                      {integrity.status === "degraded" ? "dégradé" : "sain"}
                    </span>
                  </div>

                  {integrity.issues.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                      Aucun lien dégradé détecté pour cette opportunité.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {integrity.issues.map((issue) => (
                        <div
                          key={issue.code}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                              {issue.artifact}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              {issue.severity}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">{issue.message}</p>
                          {Object.keys(issue.metadata ?? {}).length > 0 && (
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                              {JSON.stringify(issue.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {integrity.repair_actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {integrity.repair_actions.map((action) => (
                        <Button
                          key={action}
                          variant="outline"
                          className="h-9"
                          data-testid={`workflow-repair-${action}`}
                          disabled={busyAction === `repair:${action}`}
                          onClick={() =>
                            void runAction(`repair:${action}`, async () => {
                              await requestJson(
                                `/api/v1/workflows/opportunities/${selected.id}/repair`,
                                {
                                  method: "POST",
                                  body: JSON.stringify({ action }),
                                },
                              );
                            })
                          }
                        >
                          {busyAction === `repair:${action}` ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          {repairActionLabel(action)}
                        </Button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-foreground">Actions à faire</p>
                    <div className="min-w-0 space-y-3">
                      <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CV</p>
                        <div className="flex min-w-0 flex-col gap-2 xl:flex-row">
                          <ToolbarSelect
                            value={resumeId}
                            ariaLabel="Sélectionner un CV"
                            placeholder="Sélectionner un CV"
                            options={[
                              { value: "", label: "Sélectionner un CV" },
                              ...resumes.map((resume) => ({
                                value: String(resume.id),
                                label: resume.name,
                              })),
                            ]}
                            onChange={setResumeId}
                            triggerClassName="app-select h-10 w-full px-3 text-sm"
                          />
                          <ToolbarSelect
                            value={resumeLocale}
                            ariaLabel="Sélectionner la langue du CV"
                            options={localeOptions.map((locale) => ({
                              value: locale,
                              label: locale.toUpperCase(),
                            }))}
                            onChange={setResumeLocale}
                            triggerClassName="app-select h-10 min-w-[120px] px-3 text-sm"
                            menuClassName="min-w-32"
                          />
                        </div>
                        <Button
                          className="mt-2 h-9 w-full"
                          disabled={!resumeId || busyAction === "resume"}
                          onClick={() =>
                            void runAction("resume", async () => {
                              await requestJson(`/api/v1/workflows/opportunities/${selected.id}/resume-link`, {
                                method: "POST",
                                body: JSON.stringify({
                                  resume_id: Number(resumeId),
                                  locale: resumeLocale,
                                }),
                              });
                            })
                          }
                        >
                          {busyAction === "resume" ? <Loader2 className="animate-spin" /> : <FileText size={16} />}
                          Lier le CV
                        </Button>
                      </div>

                      <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score ATS</p>
                          <span className="text-[11px] text-muted-foreground">
                            {filteredAtsReports.length} rapport{filteredAtsReports.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <ToolbarSelect
                          value={atsReportId}
                          ariaLabel="Sélectionner un rapport ATS"
                          placeholder="Sélectionner un rapport ATS"
                          options={[
                            { value: "", label: "Sélectionner un rapport ATS" },
                            ...filteredAtsReports.map((report) => ({
                              value: String(report.id),
                              label: `#${report.id} · ${report.mode} · ${report.score}/100`,
                            })),
                          ]}
                          onChange={setAtsReportId}
                          triggerClassName="app-select h-10 w-full px-3 text-sm"
                        />
                        <Button
                          className="mt-2 h-9 w-full"
                          disabled={!atsReportId || busyAction === "ats"}
                          onClick={() =>
                            void runAction("ats", async () => {
                              await requestJson(`/api/v1/workflows/opportunities/${selected.id}/ats-link`, {
                                method: "POST",
                                body: JSON.stringify({ ats_report_id: Number(atsReportId) }),
                              });
                            })
                          }
                        >
                          {busyAction === "ats" ? <Loader2 className="animate-spin" /> : <FileBadge2 size={16} />}
                          Lier le rapport ATS
                        </Button>
                      </div>

                      <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lettre</p>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {filteredCoverLetters.length} lettre{filteredCoverLetters.length > 1 ? "s" : ""}
                          </span>
                          {activeCoverLetterId ? (
                            <button
                              type="button"
                              onClick={() => {
                                void openActiveCoverLetter().catch((openError: unknown) => {
                                  setError(
                                    openError instanceof Error
                                      ? openError.message
                                      : "Ouverture de la lettre impossible.",
                                  );
                                });
                              }}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Ouvrir
                            </button>
                          ) : null}
                        </div>
                        <ToolbarSelect
                          value={coverLetterId}
                          ariaLabel="Sélectionner une lettre"
                          placeholder="Sélectionner une lettre"
                          options={[
                            { value: "", label: "Sélectionner une lettre" },
                            ...filteredCoverLetters.map((letter) => ({
                              value: String(letter.id),
                              label: `#${letter.id} - ${formatTimestamp(letter.generated_at)}`,
                            })),
                          ]}
                          onChange={setCoverLetterId}
                          triggerClassName="app-select h-10 w-full px-3 text-sm"
                        />
                        <Button
                          className="mt-2 h-9 w-full"
                          disabled={!coverLetterId || busyAction === "letter"}
                          onClick={() =>
                            void runAction("letter", async () => {
                              await requestJson(`/api/v1/workflows/opportunities/${selected.id}/cover-letter-link`, {
                                method: "POST",
                                body: JSON.stringify({ cover_letter_id: Number(coverLetterId) }),
                              });
                            })
                          }
                        >
                          {busyAction === "letter" ? <Loader2 className="animate-spin" /> : <FileText size={16} />}
                          Lier la lettre
                        </Button>
                      </div>

                      <div className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracker</p>
                          <span className="text-[11px] text-muted-foreground">
                            {filteredApplications.length} entrée{filteredApplications.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <ToolbarSelect
                          value={applicationId}
                          ariaLabel="Sélectionner une candidature"
                          placeholder="Créer une entrée tracker"
                          options={[
                            { value: "", label: "Créer une entrée tracker" },
                            ...filteredApplications.map((application) => ({
                              value: String(application.id),
                              label: `#${application.id} - ${application.company} - ${application.role}`,
                            })),
                          ]}
                          onChange={setApplicationId}
                          triggerClassName="app-select h-10 w-full px-3 text-sm"
                        />
                        <div className="mt-2 grid gap-2 xl:grid-cols-2">
                          <Button
                            className="h-9 w-full"
                            disabled={busyAction === "tracker-create"}
                            onClick={() =>
                              void runAction("tracker-create", async () => {
                                await requestJson(`/api/v1/workflows/opportunities/${selected.id}/tracker-link`, {
                                  method: "POST",
                                  body: JSON.stringify({ create: true, status: "wishlist" }),
                                });
                              })
                            }
                          >
                            {busyAction === "tracker-create" ? <Loader2 className="animate-spin" /> : <ListTodo size={16} />}
                            Créer le tracker
                          </Button>
                          <Button
                            variant="outline"
                            className="h-9 w-full"
                            disabled={!applicationId || busyAction === "tracker-attach"}
                            onClick={() =>
                              void runAction("tracker-attach", async () => {
                                await requestJson(`/api/v1/workflows/opportunities/${selected.id}/tracker-link`, {
                                  method: "POST",
                                  body: JSON.stringify({ application_id: Number(applicationId) }),
                                });
                              })
                            }
                          >
                            {busyAction === "tracker-attach" ? <Loader2 className="animate-spin" /> : <ArrowRight size={16} />}
                            Lier l’existant
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Journal</p>
                      <Button
                        className="h-9"
                        disabled={busyAction === "ready"}
                        onClick={() =>
                          void runAction("ready", async () => {
                            await requestJson(`/api/v1/workflows/opportunities/${selected.id}/ready`, {
                              method: "POST",
                            });
                          })
                        }
                      >
                        {busyAction === "ready" ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Marquer prêt
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {selected.transitions.map((transition) => (
                        <div key={transition.id} className="rounded-xl border border-border bg-muted/40 px-3 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {STATE_LABELS[transition.state]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(transition.created_at)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {transition.action}
                          </p>
                          {Object.keys(transition.metadata ?? {}).length > 0 && (
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                              {JSON.stringify(transition.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
