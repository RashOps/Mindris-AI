"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileJson,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Plus,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageBody, StatusBanner } from "@/components/layout/PagePrimitives";
import {
  cvDataFromImport,
  resumeNameFromImport,
  useCVStore,
  type CVData,
} from "@/store/useCVStore";
import { apiHeaders, apiUrl, jsonHeaders } from "@/lib/api";
import {
  FALLBACK_TEMPLATES,
  fileNameToResumeName,
  formatDate,
  type ResumeRevision,
  type ResumeRevisionCompare,
} from "./dashboard-model";
import {
  fetchResumeTemplatePreviewBlob,
  exportResumeTemplatePackage,
  fetchResumeTemplates,
  importResumeTemplatePackage,
  resumeTemplatePreviewUrl,
  templateHandle,
  templatePackageFileName,
  type ResumeTemplate,
} from "@/lib/templates";
import { DashboardActions, ResumeCard, TemplatePreview } from "./dashboard-components";

export default function DashboardPage() {
  const router = useRouter();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const templatePackageInputRef = useRef<HTMLInputElement>(null);
  const {
    resumes,
    activeResumeId,
    isResumeLibraryLoading,
    appSettings,
    loadResumes,
    createResume,
    importResume,
    duplicateResume,
    deleteResume,
    renameResume,
    setActiveResume,
    retryResumeSave,
    resumeSaveStatus,
    resumeSaveError,
  } = useCVStore();
  const [status, setStatus] = useState<string | null>(null);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [templates, setTemplates] = useState<ResumeTemplate[]>(FALLBACK_TEMPLATES);
  const [templatePreviewUrls, setTemplatePreviewUrls] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<ResumeRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<ResumeRevisionCompare | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const showStatus = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 3500);
  }, []);

  const reloadTemplates = useCallback(async () => {
    const items = await fetchResumeTemplates();
    if (items.length > 0) {
      setTemplates(items);
    }
    return items;
  }, []);

  const saveStatusText =
    resumeSaveStatus === "dirty"
      ? "Unsaved changes"
      : resumeSaveStatus === "saving"
        ? "Saving..."
        : resumeSaveStatus === "error"
          ? "Save failed"
          : "Saved";
  const activePersistedResumeId =
    activeResumeId && /^\d+$/.test(String(activeResumeId))
      ? String(activeResumeId)
      : null;

  useEffect(() => {
    void loadResumes().catch((err: unknown) => {
      showStatus(err instanceof Error ? err.message : "Resume loading failed");
    });
  }, [loadResumes, showStatus]);

  useEffect(() => {
    let cancelled = false;

    fetchResumeTemplates()
      .then((items) => {
        if (!cancelled && items.length > 0) {
          setTemplates(items);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          showStatus(err instanceof Error ? err.message : "Template loading failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showStatus]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    void (async () => {
      const entries = await Promise.all(
        templates
          .filter((template) => template.previewAvailable)
          .map(async (template) => {
            try {
              const blob = await fetchResumeTemplatePreviewBlob(template.id);
              const url = URL.createObjectURL(blob);
              createdUrls.push(url);
              return [template.id, url] as const;
            } catch {
              return [template.id, resumeTemplatePreviewUrl(template.id)] as const;
            }
          }),
      );

      if (cancelled) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setTemplatePreviewUrls((current) => {
        Object.values(current)
          .filter((url) => url.startsWith("blob:"))
          .forEach((url) => URL.revokeObjectURL(url));
        return Object.fromEntries(entries);
      });
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [templates]);

  useEffect(() => {
    const loadRevisions = async () => {
      if (!activePersistedResumeId) {
        setRevisions([]);
        return;
      }
      setRevisionsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/v1/resumes/${activePersistedResumeId}/revisions`), {
          headers: apiHeaders(),
        });
        if (!response.ok) throw new Error("Revision loading failed");
        const payload = (await response.json()) as { items?: ResumeRevision[] };
        setRevisions(payload.items ?? []);
      } catch (err: unknown) {
        setRevisions([]);
        showStatus(err instanceof Error ? err.message : "Revision loading failed");
      } finally {
        setRevisionsLoading(false);
      }
    };

    void loadRevisions();
  }, [activePersistedResumeId, showStatus]);

  const openResume = (id: string) => {
    setActiveResume(id);
    router.push("/tools/cv-creator");
  };

  const createFromTemplate = async (templateId: string, name: string) => {
    const id = await createResume(`${name} CV`, templateId);
    openResume(id);
  };

  const createSnapshot = async () => {
    if (!activePersistedResumeId) return;
    const response = await fetch(apiUrl(`/api/v1/resumes/${activePersistedResumeId}/revisions`), {
      method: "POST",
      headers: apiHeaders(),
    });
    if (!response.ok) throw new Error("Snapshot failed");
    const payload = (await response.json()) as { item?: ResumeRevision };
    if (payload.item) {
      const snapshot = payload.item;
      setRevisions((current) => [snapshot, ...current]);
    }
    showStatus("Version snapshot saved");
  };

  const restoreRevision = async (revision: number) => {
    if (!activePersistedResumeId) return;
    const response = await fetch(
      apiUrl(`/api/v1/resumes/${activePersistedResumeId}/revisions/${revision}/restore`),
      {
        method: "POST",
        headers: apiHeaders(),
      }
    );
    if (!response.ok) throw new Error("Restore failed");
    const payload = (await response.json()) as { item?: ResumeRevision };
    await loadResumes();
    if (payload.item) {
      showStatus(`Restored version ${revision}`);
    }
  };

  const compareRevision = async (baseRevision: number, targetRevision: number) => {
    if (!activePersistedResumeId) return;
    setCompareLoading(true);
    try {
      const response = await fetch(
        apiUrl(
          `/api/v1/resumes/${activePersistedResumeId}/revisions/compare?base_revision=${baseRevision}&target_revision=${targetRevision}`
        ),
        {
          headers: apiHeaders(),
        }
      );
      if (!response.ok) throw new Error("Compare failed");
      const payload = (await response.json()) as { item?: ResumeRevisionCompare };
      setCompareResult(payload.item ?? null);
      if (payload.item) {
        showStatus(`Compared v${baseRevision} → v${targetRevision}`);
      }
    } catch (err: unknown) {
      setCompareResult(null);
      showStatus(err instanceof Error ? err.message : "Compare failed");
    } finally {
      setCompareLoading(false);
    }
  };

  const importCVData = async (cvData: CVData, name: string, syncCurrent = true) => {
    const id = await importResume(name, cvData, "json");
    if (syncCurrent) {
      await fetch(apiUrl("/api/v1/cv/current"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: cvData,
          source: "json",
        }),
      }).catch(() => undefined);
    }
    openResume(id);
  };

  const handleJsonImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const cvData = cvDataFromImport(parsed);
      if (!cvData) throw new Error("Invalid CV JSON");
      await importCVData(cvData, resumeNameFromImport(parsed) ?? fileNameToResumeName(file));
      showStatus("JSON resume imported");
    } catch (err: unknown) {
      showStatus(err instanceof Error ? err.message : "JSON import failed");
    }
  };

  const handlePdfImport = async (file: File) => {
    setIsImportingPdf(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("provider", appSettings.optimize_llm.provider);
      form.append("model_name", appSettings.optimize_llm.model_name);
      form.append("ingestion_mode", appSettings.pdf_ingestion_mode);

      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), {
        method: "POST",
        headers: apiHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error("PDF import failed");
      const data = await res.json();
      const cvData = cvDataFromImport(data.cv_data);
      if (!cvData) throw new Error("PDF parser returned invalid CV data");
      await importCVData(cvData, cvData.profile.full_name || fileNameToResumeName(file), false);
      showStatus("PDF resume imported");
    } catch (err: unknown) {
      showStatus(err instanceof Error ? err.message : "PDF import failed");
    } finally {
      setIsImportingPdf(false);
    }
  };

  const handleTemplatePackageImport = async (file: File) => {
    try {
      const item = await importResumeTemplatePackage(file);
      await reloadTemplates();
      showStatus(`Template imported: ${item.name}`);
    } catch (err: unknown) {
      showStatus(err instanceof Error ? err.message : "Template import failed");
    }
  };

  const downloadTemplatePackage = async (template: ResumeTemplate) => {
    const blob = await exportResumeTemplatePackage(template.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templatePackageFileName(template.id);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Resume Library"
      description="Create, import, duplicate and export backend-backed resumes."
      actions={
        <DashboardActions
          saveStatusText={saveStatusText}
          resumeSaveStatus={resumeSaveStatus}
          resumeSaveError={resumeSaveError}
          retryResumeSave={retryResumeSave}
          showStatus={showStatus}
          jsonInputRef={jsonInputRef}
          pdfInputRef={pdfInputRef}
          templatePackageInputRef={templatePackageInputRef}
          handleJsonImport={handleJsonImport}
          handlePdfImport={handlePdfImport}
          handleTemplatePackageImport={handleTemplatePackageImport}
          isImportingPdf={isImportingPdf}
          createFromTemplate={createFromTemplate}
        />
      }
    >
          <PageBody>
            {status && (
              <div className="mb-4">
                <StatusBanner>{status}</StatusBanner>
              </div>
            )}

            <section className="mb-8">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Your resumes</h2>
                  <p className="text-sm text-muted-foreground">Drafts persisted by the backend API.</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isResumeLibraryLoading ? "Loading..." : `${resumes.length} saved`}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <button
                  onClick={() => void createFromTemplate("modern", "Untitled")}
                  className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-5 text-center transition-colors hover:bg-accent"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Plus size={20} />
                  </div>
                  <p className="text-sm font-semibold">Create blank CV</p>
                  <p className="mt-1 max-w-48 text-xs leading-5 text-muted-foreground">
                    Start from a clean structured resume and customize it section by section.
                  </p>
                </button>

                {resumes.map((resume) => (
                  <ResumeCard
                    key={resume.id}
                    resume={resume}
                    activeResumeId={activeResumeId}
                    resumesLength={resumes.length}
                    renameResume={renameResume}
                    openResume={openResume}
                    duplicateResume={duplicateResume}
                    deleteResume={deleteResume}
                    showStatus={showStatus}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Start from a template</h2>
                    <p className="text-sm text-muted-foreground">Backend-owned templates plus community presets.</p>
                  </div>
                  <LayoutTemplate className="text-muted-foreground" size={20} />
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ready</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {templates.filter((template) => template.status === "ready").map((template) => (
                        <button
                          key={template.id}
                          onClick={() => void createFromTemplate(template.id, template.name)}
                          className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors enabled:hover:bg-accent"
                        >
                          <div
                            className="relative mb-3 h-24 overflow-hidden rounded-md border border-border"
                            style={{
                              background: `linear-gradient(135deg, ${template.accent}18, var(--card) 55%)`,
                            }}
                          >
                            <TemplatePreview
                              template={template}
                              previewUrl={templatePreviewUrls[template.id]}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{template.name}</p>
                            <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                              {template.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Community</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {templates.filter((template) => template.status === "community").map((template) => (
                        <div
                          key={template.id}
                          data-testid={`template-card-${templateHandle(template.id)}`}
                          className="rounded-lg border border-border bg-card p-4 text-left shadow-sm"
                        >
                          <div
                            className="relative mb-3 h-24 overflow-hidden rounded-md border border-border"
                            style={{
                              background: `linear-gradient(135deg, ${template.accent}18, var(--card) 55%)`,
                            }}
                          >
                            <TemplatePreview
                              template={template}
                              previewUrl={templatePreviewUrls[template.id]}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{template.name}</p>
                            <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium capitalize text-violet-700">
                              community
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => void createFromTemplate(template.id, template.name)}
                              data-testid={`template-use-${templateHandle(template.id)}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
                            >
                              <Plus size={13} />
                              Use template
                            </button>
                            {template.previewAvailable && (
                              <button
                                onClick={() => {
                                  void downloadTemplatePackage(template).then(() => {
                                    showStatus(`Template exported: ${template.name}`);
                                  }).catch((err: unknown) => {
                                    showStatus(err instanceof Error ? err.message : "Template export failed");
                                  });
                                }}
                                data-testid={`template-export-${templateHandle(template.id)}`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent"
                              >
                                <Download size={13} />
                                Export package
                              </button>
                            )}
                            <span className="inline-flex h-8 items-center rounded-md bg-muted px-2.5 text-[11px] font-medium text-muted-foreground">
                              {template.author ?? "Community"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FolderOpen size={18} className="text-muted-foreground" />
                  <h2 className="text-base font-semibold">MVP1 status</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <FileJson size={16} className="mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-medium">API-backed resume library</p>
                      <p className="text-xs leading-5 text-muted-foreground">Create, duplicate, import, export, and keep multiple CV drafts via backend endpoints.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <LayoutTemplate size={16} className="mt-0.5 text-indigo-600" />
                    <div>
                      <p className="font-medium">Template gallery</p>
                      <p className="text-xs leading-5 text-muted-foreground">Five ready templates are exposed by the backend and reused by the renderer.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Builder remains focused</p>
                      <p className="text-xs leading-5 text-muted-foreground">Open any resume to edit structure, style, live preview, and export PDF.</p>
                    </div>
                  </div>
                </div>
                <div className="my-4 border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Versioning</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {revisionsLoading ? "Loading snapshots..." : `${revisions.length} snapshots available`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        void createSnapshot().catch((err: unknown) => {
                          showStatus(err instanceof Error ? err.message : "Snapshot failed");
                        });
                      }}
                      className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      Save version
                    </button>
                  </div>
                  <div className="space-y-2">
                      {revisions.slice(0, 4).map((revision) => (
                        <div key={revision.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            v{revision.revision} {revision.label ? `· ${revision.label}` : ""}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {revision.templateId} · {formatDate(revision.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {revisions.findIndex((item) => item.id === revision.id) < revisions.length - 1 && (
                            <button
                              onClick={() => {
                                const index = revisions.findIndex((item) => item.id === revision.id);
                                const older = revisions[index + 1];
                                if (!older) return;
                                void compareRevision(older.revision, revision.revision);
                              }}
                              className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
                            >
                              Compare
                            </button>
                          )}
                          <button
                            onClick={() => {
                              void restoreRevision(revision.revision).catch((err: unknown) => {
                                showStatus(err instanceof Error ? err.message : "Restore failed");
                              });
                            }}
                            className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                    {revisions.length === 0 && (
                      <p className="text-xs leading-5 text-muted-foreground">
                        No snapshots yet. Save one to pin a baseline.
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Comparison</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {compareLoading
                          ? "Comparing snapshots..."
                          : compareResult
                            ? `v${compareResult.baseRevision.revision} → v${compareResult.targetRevision.revision}`
                            : "Compare two versions from the list"}
                      </p>
                    </div>
                    {compareResult && (
                      <button
                        onClick={() => setCompareResult(null)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground hover:bg-accent"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {compareResult ? (
                    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">
                          {compareResult.changeCount} field changes
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {compareResult.baseRevision.templateId} → {compareResult.targetRevision.templateId}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {compareResult.sectionSummaries
                          .filter((item) => item.status !== "unchanged")
                          .slice(0, 6)
                          .map((item) => (
                            <div
                              key={item.section}
                              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {item.beforeCount} → {item.afterCount}
                                </p>
                              </div>
                              <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                {item.status}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="space-y-2">
                        {compareResult.changes.slice(0, 6).map((change) => (
                          <div key={`${change.kind}-${change.path}`} className="rounded-md border border-border bg-background px-3 py-2">
                            <p className="text-xs font-medium text-foreground">{change.path}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {change.kind}
                            </p>
                          </div>
                        ))}
                        {compareResult.changes.length === 0 && (
                          <p className="text-xs leading-5 text-muted-foreground">No structural changes detected.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-muted-foreground">
                      Open two snapshots to inspect changes between revisions.
                    </p>
                  )}
                </div>
              </aside>
            </section>
          </PageBody>
    </AppShell>
  );
}
