"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { openCoverLetterInMarkdown } from "@/lib/cover-letters";
import { WorkflowActionsPanel } from "./components/WorkflowActionsPanel";
import { WorkflowCreatePanel } from "./components/WorkflowCreatePanel";
import { WorkflowHeader } from "./components/WorkflowHeader";
import { WorkflowIntegrityPanel } from "./components/WorkflowIntegrityPanel";
import { WorkflowOpportunityList } from "./components/WorkflowOpportunityList";
import { WorkflowOpportunitySummary } from "./components/WorkflowOpportunitySummary";
import { WorkflowReadinessChecklist } from "./components/WorkflowReadinessChecklist";
import { WorkflowStateTimeline } from "./components/WorkflowStateTimeline";
import { WorkflowTransitionLog } from "./components/WorkflowTransitionLog";
import {
  requestJson,
  type ApplicationItem,
  type AtsReportItem,
  type CoverLetterItem,
  type JobItem,
  type OpportunityItem,
  type ResumeItem,
  type WorkflowActionRunner,
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
  const [selectedJobId, setSelectedJobId] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [resumeLocale, setResumeLocale] = useState("fr");
  const [atsReportId, setAtsReportId] = useState("");
  const [coverLetterId, setCoverLetterId] = useState("");
  const [applicationId, setApplicationId] = useState("");

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
  const selectedResume = resumes.find((item) => item.id === Number(resumeId));
  const localeOptions = selectedResume?.multilingual?.availableLocales?.length
    ? selectedResume.multilingual.availableLocales
    : [selectedResume?.multilingual?.activeLocale ?? selectedResume?.locale ?? "fr"];
  const integrity = selected?.integrity ?? {
    status: "healthy" as const,
    issues: [],
    repair_actions: [],
  };

  const runAction: WorkflowActionRunner = async (action, callback) => {
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
  };

  const createWorkflow = () => {
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
    });
  };

  const openActiveCoverLetter = () => {
    if (!activeCoverLetterId) return;
    void openCoverLetterInMarkdown(activeCoverLetterId)
      .then(() => router.push("/tools/markdown"))
      .catch((openError: unknown) => {
        setError(openError instanceof Error ? openError.message : "Ouverture de la lettre impossible.");
      });
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
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[360px,minmax(0,1fr)]">
          <aside className="min-w-0 space-y-4">
            <WorkflowCreatePanel
              busyAction={busyAction}
              canCreate={canCreate}
              createMode={createMode}
              jobs={jobs}
              manualCompany={manualCompany}
              manualRole={manualRole}
              manualUrl={manualUrl}
              notes={notes}
              selectedJobId={selectedJobId}
              onCreate={createWorkflow}
              onCreateModeChange={setCreateMode}
              onManualCompanyChange={setManualCompany}
              onManualRoleChange={setManualRole}
              onManualUrlChange={setManualUrl}
              onNotesChange={setNotes}
              onSelectedJobIdChange={setSelectedJobId}
            />
            <WorkflowOpportunityList
              loading={loading}
              opportunities={opportunities}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />
          </aside>

          <section className="min-w-0 space-y-4">
            {!selected ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-8 text-sm text-muted-foreground shadow-sm">
                Sélectionnez une opportunité pour piloter les prochaines étapes.
              </div>
            ) : (
              <>
                <WorkflowOpportunitySummary integrity={integrity} selected={selected} />
                <WorkflowReadinessChecklist selected={selected} />
                <WorkflowStateTimeline selected={selected} />
                <WorkflowIntegrityPanel
                  busyAction={busyAction}
                  integrity={integrity}
                  onRepair={(action) =>
                    void runAction(`repair:${action}`, async () => {
                      await requestJson(`/api/v1/workflows/opportunities/${selected.id}/repair`, {
                        method: "POST",
                        body: JSON.stringify({ action }),
                      });
                    })
                  }
                />

                <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                  <WorkflowActionsPanel
                    activeCoverLetterId={activeCoverLetterId}
                    applicationId={applicationId}
                    atsReportId={atsReportId}
                    busyAction={busyAction}
                    coverLetterId={coverLetterId}
                    filteredApplications={filteredApplications}
                    filteredAtsReports={filteredAtsReports}
                    filteredCoverLetters={filteredCoverLetters}
                    localeOptions={localeOptions}
                    resumeId={resumeId}
                    resumeLocale={resumeLocale}
                    resumes={resumes}
                    onApplicationIdChange={setApplicationId}
                    onAtsReportIdChange={setAtsReportId}
                    onCoverLetterIdChange={setCoverLetterId}
                    onCreateTracker={() =>
                      void runAction("tracker-create", async () => {
                        await requestJson(`/api/v1/workflows/opportunities/${selected.id}/tracker-link`, {
                          method: "POST",
                          body: JSON.stringify({ create: true, status: "wishlist" }),
                        });
                      })
                    }
                    onLinkAtsReport={() =>
                      void runAction("ats", async () => {
                        await requestJson(`/api/v1/workflows/opportunities/${selected.id}/ats-link`, {
                          method: "POST",
                          body: JSON.stringify({ ats_report_id: Number(atsReportId) }),
                        });
                      })
                    }
                    onLinkCoverLetter={() =>
                      void runAction("letter", async () => {
                        await requestJson(`/api/v1/workflows/opportunities/${selected.id}/cover-letter-link`, {
                          method: "POST",
                          body: JSON.stringify({ cover_letter_id: Number(coverLetterId) }),
                        });
                      })
                    }
                    onLinkResume={() =>
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
                    onLinkTracker={() =>
                      void runAction("tracker-attach", async () => {
                        await requestJson(`/api/v1/workflows/opportunities/${selected.id}/tracker-link`, {
                          method: "POST",
                          body: JSON.stringify({ application_id: Number(applicationId) }),
                        });
                      })
                    }
                    onOpenCoverLetter={openActiveCoverLetter}
                    onResumeIdChange={setResumeId}
                    onResumeLocaleChange={setResumeLocale}
                  />
                  <WorkflowTransitionLog
                    busyAction={busyAction}
                    transitions={selected.transitions}
                    onMarkReady={() =>
                      void runAction("ready", async () => {
                        await requestJson(`/api/v1/workflows/opportunities/${selected.id}/ready`, {
                          method: "POST",
                        });
                      })
                    }
                  />
                </section>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
