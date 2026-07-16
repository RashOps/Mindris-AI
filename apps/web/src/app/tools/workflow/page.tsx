"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { apiUrl, jsonHeaders } from "@/lib/api";
import { WorkflowHeader } from "./components/WorkflowHeader";

type WorkflowState =
  | "scrape_completed"
  | "opportunity_created"
  | "resume_linked"
  | "cover_letter_linked"
  | "ats_report_linked"
  | "tracker_entry_created"
  | "ready_to_apply";

interface JobItem {
  id: number;
  title: string;
  company: string;
  url: string;
  scraped_at: string;
}

interface ResumeItem {
  id: number;
  name: string;
  locale: string;
  updatedAt?: string;
  multilingual?: {
    activeLocale?: string;
    availableLocales?: string[];
  };
}

interface AtsReportItem {
  id: number;
  job_id?: number | null;
  score: number;
  mode: "standard" | "strict";
  summary: string;
  generated_at: string;
}

interface CoverLetterItem {
  id: number;
  job_id?: number | null;
  markdown_content: string;
  generated_at: string;
}

interface ApplicationItem {
  id: number;
  job_id?: number | null;
  company: string;
  role: string;
  status: string;
  updated_at: string;
}

interface WorkflowTransition {
  id: number;
  state: WorkflowState;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface OpportunityIntegrityIssue {
  code: string;
  severity: string;
  artifact: string;
  message: string;
  metadata: Record<string, unknown>;
}

interface OpportunityIntegrity {
  status: "healthy" | "degraded";
  issues: OpportunityIntegrityIssue[];
  repair_actions: string[];
}

interface OpportunityItem {
  id: number;
  job_id?: number | null;
  source_url?: string | null;
  company: string;
  role: string;
  current_state: WorkflowState;
  resume_id?: number | null;
  resume_locale?: string | null;
  ats_report_id?: number | null;
  cover_letter_id?: number | null;
  application_id?: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  last_transition_at: string;
  transitions: WorkflowTransition[];
  next_actions: string[];
  linked_artifacts?: Record<string, unknown>;
  integrity?: OpportunityIntegrity;
}

const STATE_ORDER: WorkflowState[] = [
  "scrape_completed",
  "opportunity_created",
  "resume_linked",
  "ats_report_linked",
  "cover_letter_linked",
  "tracker_entry_created",
  "ready_to_apply",
];

const STATE_LABELS: Record<WorkflowState, string> = {
  scrape_completed: "Scrape completed",
  opportunity_created: "Opportunity created",
  resume_linked: "Resume linked",
  ats_report_linked: "ATS linked",
  cover_letter_linked: "Cover letter linked",
  tracker_entry_created: "Tracker entry created",
  ready_to_apply: "Ready to apply",
};

function formatTimestamp(value?: string | null): string {
  if (!value) return "n/a";
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...jsonHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.detail === "string"
          ? payload.detail
          : "Request failed.",
    );
  }
  return payload as T;
}

function stateTone(active: boolean, done: boolean): string {
  if (active) return "border-blue-600 bg-blue-600 text-white";
  if (done) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-border bg-card text-muted-foreground";
}

function integrityTone(status?: string): string {
  if (status === "degraded") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function repairActionLabel(action: string): string {
  switch (action) {
    case "detach_missing_application":
      return "Detach missing tracker";
    case "detach_missing_resume":
      return "Detach missing resume";
    case "detach_missing_ats_report":
      return "Detach missing ATS";
    case "detach_missing_cover_letter":
      return "Detach missing letter";
    case "reset_resume_locale":
      return "Reset resume locale";
    case "sync_application_links":
      return "Sync tracker links";
    default:
      return action;
  }
}

export default function WorkflowPage() {
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
      setError(actionError instanceof Error ? actionError.message : "Workflow action failed.");
    } finally {
      setBusyAction(null);
    }
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

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6">
        <WorkflowHeader
          opportunities={opportunities.length}
          jobs={jobs.length}
          resumes={resumes.length}
        />

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 2xl:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Create opportunity</p>
                <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                  <button
                    type="button"
                    onClick={() => setCreateMode("job")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      createMode === "job" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    From job
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode("manual")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      createMode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    Manual
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {createMode === "job" ? (
                  <select
                    value={selectedJobId}
                    onChange={(event) => setSelectedJobId(event.target.value)}
                    className="app-select h-10 w-full px-3 text-sm"
                  >
                    <option value="">Select scraped job</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.company} - {job.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <Input
                      value={manualCompany}
                      onChange={(event) => setManualCompany(event.target.value)}
                      placeholder="Company"
                      className="app-input h-10"
                    />
                    <Input
                      value={manualRole}
                      onChange={(event) => setManualRole(event.target.value)}
                      placeholder="Role"
                      className="app-input h-10"
                    />
                    <Input
                      value={manualUrl}
                      onChange={(event) => setManualUrl(event.target.value)}
                      placeholder="Source URL (optional)"
                      className="app-input h-10"
                    />
                  </>
                )}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Operator notes"
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
                  Create workflow
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Active opportunities</p>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  Loading workflows...
                </div>
              ) : opportunities.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No opportunities yet. Start from a scraped job or create one manually.
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
                          {item.integrity?.status === "degraded" ? "Needs repair" : "Healthy"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </aside>

          <section className="space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-sm">
                Select an opportunity to drive the next workflow step.
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
                          {integrity.status === "degraded" ? "Integrity degraded" : "Integrity healthy"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Updated {formatTimestamp(selected.last_transition_at)}
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
                          Source job
                          <ArrowRight size={14} />
                        </a>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
                      {[
                        { label: "Resume", value: selected.resume_id ? `#${selected.resume_id}` : "Missing", icon: FileText },
                        { label: "ATS", value: selected.ats_report_id ? `#${selected.ats_report_id}` : "Missing", icon: FileBadge2 },
                        { label: "Letter", value: selected.cover_letter_id ? `#${selected.cover_letter_id}` : "Missing", icon: FileText },
                        { label: "Tracker", value: selected.application_id ? `#${selected.application_id}` : "Missing", icon: ListTodo },
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
                  <p className="mb-3 text-sm font-semibold text-foreground">Workflow state</p>
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
                      <p className="text-sm font-semibold text-foreground">Integrity</p>
                      <p className="text-xs text-muted-foreground">
                        Backend-owned workflow health and bounded recovery actions.
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        integrityTone(integrity.status)
                      }`}
                    >
                      {integrity.status}
                    </span>
                  </div>

                  {integrity.issues.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                      No degraded workflow links detected for this opportunity.
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

                <section className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-foreground">Next actions</p>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resume</p>
                        <div className="flex flex-col gap-2 xl:flex-row">
                          <select
                            value={resumeId}
                            onChange={(event) => setResumeId(event.target.value)}
                            className="app-select h-10 w-full px-3 text-sm"
                          >
                            <option value="">Select resume</option>
                            {resumes.map((resume) => (
                              <option key={resume.id} value={resume.id}>
                                {resume.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={resumeLocale}
                            onChange={(event) => setResumeLocale(event.target.value)}
                            className="app-select h-10 min-w-[120px] px-3 text-sm"
                          >
                            {localeOptions.map((locale) => (
                              <option key={locale} value={locale}>
                                {locale.toUpperCase()}
                              </option>
                            ))}
                          </select>
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
                          Link resume
                        </Button>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ATS report</p>
                        <select
                          value={atsReportId}
                          onChange={(event) => setAtsReportId(event.target.value)}
                          className="app-select h-10 w-full px-3 text-sm"
                        >
                          <option value="">Select ATS report</option>
                          {filteredAtsReports.map((report) => (
                            <option key={report.id} value={report.id}>
                              #{report.id} - {report.mode} - {report.score}
                            </option>
                          ))}
                        </select>
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
                          Link ATS report
                        </Button>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover letter</p>
                        <select
                          value={coverLetterId}
                          onChange={(event) => setCoverLetterId(event.target.value)}
                          className="app-select h-10 w-full px-3 text-sm"
                        >
                          <option value="">Select cover letter</option>
                          {filteredCoverLetters.map((letter) => (
                            <option key={letter.id} value={letter.id}>
                              #{letter.id} - {formatTimestamp(letter.generated_at)}
                            </option>
                          ))}
                        </select>
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
                          Link cover letter
                        </Button>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracker</p>
                        <select
                          value={applicationId}
                          onChange={(event) => setApplicationId(event.target.value)}
                          className="app-select h-10 w-full px-3 text-sm"
                        >
                          <option value="">Create new tracker entry</option>
                          {applications.map((application) => (
                            <option key={application.id} value={application.id}>
                              #{application.id} - {application.company} - {application.role}
                            </option>
                          ))}
                        </select>
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
                            Create tracker
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
                            Attach existing
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Transition log</p>
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
                        Mark ready
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
