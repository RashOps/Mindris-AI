"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageBody, StatusBanner } from "@/components/layout/PagePrimitives";
import { Button } from "@/components/ui/button";
import { PdfIngestionModeSelect } from "@/components/PdfIngestionModeSelect";
import {
  cvDataFromImport,
  resumeNameFromImport,
  useCVStore,
  type CVData,
} from "@/store/useCVStore";
import { apiHeaders, apiUrl, jsonHeaders } from "@/lib/api";
import { fetchResumeTemplates, type ResumeTemplate } from "@/lib/templates";

const FALLBACK_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Balanced two-column layout for tech, product, and business profiles.",
    status: "ready",
    category: "tech",
    accent: "#2563eb",
    layout: "two-column",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense one-page format for experienced profiles and long histories.",
    status: "ready",
    category: "senior",
    accent: "#0f766e",
    layout: "two-column",
  },
  {
    id: "ats",
    name: "ATS Strict",
    description: "Single-column, low-decoration template for ATS-friendly CVs.",
    status: "ready",
    category: "ats",
    accent: "#475569",
    layout: "single",
  },
  {
    id: "student",
    name: "Student",
    description: "Education-first template for internships and first roles.",
    status: "ready",
    category: "student",
    accent: "#7c3aed",
    layout: "single",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Editorial template for marketing, design, and content roles.",
    status: "ready",
    category: "creative",
    accent: "#e11d48",
    layout: "two-column",
  },
  {
    id: "opensource",
    name: "Open Source",
    description: "Community-made template for developers, GitHub links, and OSS contributions.",
    status: "community",
    category: "developer",
    accent: "#0f766e",
    layout: "two-column",
    base_template_id: "modern",
    author: "Mindris Community",
  },
  {
    id: "bilingual",
    name: "Bilingual FR/EN",
    description: "Community template tuned for bilingual CVs and international applications.",
    status: "community",
    category: "international",
    accent: "#7c3aed",
    layout: "two-column",
    base_template_id: "compact",
    author: "Mindris Community",
  },
];

type ResumeExportFormat = "json" | "markdown" | "html";

type ResumeRevision = {
  id: string;
  resumeId: string;
  revision: number;
  name: string;
  templateId: string;
  locale: string;
  source: string;
  label?: string | null;
  createdAt: string;
};

type ResumeRevisionChange = {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
};

type ResumeRevisionSectionSummary = {
  section: string;
  label: string;
  status: "added" | "removed" | "changed" | "unchanged";
  beforeCount: number;
  afterCount: number;
};

type ResumeRevisionCompare = {
  resumeId: string;
  baseRevision: ResumeRevision;
  targetRevision: ResumeRevision;
  changeCount: number;
  sectionSummaries: ResumeRevisionSectionSummary[];
  changes: ResumeRevisionChange[];
};

const RESUME_EXPORTS: Record<
  ResumeExportFormat,
  { endpoint: string; extension: string; label: string }
> = {
  json: { endpoint: "export-json", extension: "json", label: "JSON" },
  markdown: { endpoint: "export-markdown", extension: "md", label: "Markdown" },
  html: { endpoint: "export-html", extension: "html", label: "HTML" },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function downloadResume(id: string, name: string, format: ResumeExportFormat) {
  const exportConfig = RESUME_EXPORTS[format];
  const response = await fetch(apiUrl(`/api/v1/resumes/${id}/${exportConfig.endpoint}`), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(`${exportConfig.label} export failed`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

function fileNameToResumeName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported CV";
}

export default function DashboardPage() {
  const router = useRouter();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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
  const [revisions, setRevisions] = useState<ResumeRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<ResumeRevisionCompare | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const showStatus = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 3500);
  }, []);

  const saveStatusText =
    resumeSaveStatus === "dirty"
      ? "Unsaved changes"
      : resumeSaveStatus === "saving"
        ? "Saving..."
        : resumeSaveStatus === "error"
          ? "Save failed"
          : "Saved";

  useEffect(() => {
    void loadResumes().catch((err: unknown) => {
      showStatus(err instanceof Error ? err.message : "Resume loading failed");
    });
  }, [loadResumes, showStatus]);

  useEffect(() => {
    void fetchResumeTemplates()
      .then((items) => {
        if (items.length > 0) setTemplates(items);
      })
      .catch((err: unknown) => {
        showStatus(err instanceof Error ? err.message : "Template loading failed");
      });
  }, [showStatus]);

  useEffect(() => {
    const loadRevisions = async () => {
      if (!activeResumeId) return;
      setRevisionsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/v1/resumes/${activeResumeId}/revisions`), {
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
  }, [activeResumeId, showStatus]);

  const openResume = (id: string) => {
    setActiveResume(id);
    router.push("/tools/cv-creator");
  };

  const createFromTemplate = async (templateId: string, name: string) => {
    const id = await createResume(`${name} CV`, templateId);
    openResume(id);
  };

  const createSnapshot = async () => {
    if (!activeResumeId) return;
    const response = await fetch(apiUrl(`/api/v1/resumes/${activeResumeId}/revisions`), {
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
    if (!activeResumeId) return;
    const response = await fetch(
      apiUrl(`/api/v1/resumes/${activeResumeId}/revisions/${revision}/restore`),
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
    if (!activeResumeId) return;
    setCompareLoading(true);
    try {
      const response = await fetch(
        apiUrl(
          `/api/v1/resumes/${activeResumeId}/revisions/compare?base_revision=${baseRevision}&target_revision=${targetRevision}`
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

  return (
    <AppShell
      title="Resume Library"
      description="Create, import, duplicate and export backend-backed resumes."
      actions={
        <>
              <button
                onClick={() => {
                  if (resumeSaveStatus === "error") {
                    void retryResumeSave().catch((err: unknown) => {
                      showStatus(err instanceof Error ? err.message : "Save retry failed");
                    });
                  }
                }}
                className="hidden h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-sm sm:inline-flex sm:items-center"
                title={resumeSaveError ?? "Backend save status"}
              >
                {saveStatusText}
              </button>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleJsonImport(file);
                  e.currentTarget.value = "";
                }}
              />
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePdfImport(file);
                  e.currentTarget.value = "";
                }}
              />
              <PdfIngestionModeSelect compact />
              <Button
                variant="outline"
                onClick={() => jsonInputRef.current?.click()}
              >
                <Upload size={15} />
                JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isImportingPdf}
              >
                <FileText size={15} />
                {isImportingPdf ? "Parsing..." : "PDF"}
              </Button>
              <Button
                onClick={() => void createFromTemplate("modern", "Untitled")}
              >
                <Plus size={15} />
                New CV
              </Button>
        </>
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
                  <p className="text-sm text-slate-500">Drafts persisted by the backend API.</p>
                </div>
                <p className="text-sm text-slate-500">
                  {isResumeLibraryLoading ? "Loading..." : `${resumes.length} saved`}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <button
                  onClick={() => void createFromTemplate("modern", "Untitled")}
                  className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center transition-colors hover:border-slate-400"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Plus size={20} />
                  </div>
                  <p className="text-sm font-semibold">Create blank CV</p>
                  <p className="mt-1 max-w-48 text-xs leading-5 text-slate-500">
                    Start from a clean structured resume and customize it section by section.
                  </p>
                </button>

                {resumes.map((resume) => (
                  <article
                    key={resume.id}
                    className="flex min-h-52 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <input
                          value={resume.name}
                          onChange={(e) => renameResume(resume.id, e.target.value)}
                          className="w-full rounded border-none bg-transparent p-0 text-sm font-semibold outline-none"
                        />
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {resume.cvData.profile.title || "No target title yet"}
                        </p>
                      </div>
                      {resume.id === activeResumeId && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="rounded-md bg-slate-50 p-2">
                        <p className="font-medium text-slate-700">Template</p>
                        <p className="mt-1 capitalize">{resume.templateId}</p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-2">
                        <p className="font-medium text-slate-700">Updated</p>
                        <p className="mt-1">{formatDate(resume.updatedAt)}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        onClick={() => openResume(resume.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-2.5 text-xs font-semibold text-white"
                      >
                        Open <ArrowRight size={13} />
                      </button>
                      <button
                        onClick={() => {
                          void duplicateResume(resume.id).catch((err: unknown) => {
                            showStatus(err instanceof Error ? err.message : "Duplicate failed");
                          });
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700"
                      >
                        <Copy size={13} /> Duplicate
                      </button>
                      {(["json", "markdown", "html"] as const).map((format) => (
                        <button
                          key={format}
                          onClick={() => {
                            const exportConfig = RESUME_EXPORTS[format];
                            void downloadResume(resume.id, resume.name, format)
                              .then(() => showStatus(`${exportConfig.label} resume exported`))
                              .catch((err: unknown) => {
                                showStatus(
                                  err instanceof Error
                                    ? err.message
                                    : `${exportConfig.label} export failed`
                                );
                              });
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700"
                        >
                          <Download size={13} /> {RESUME_EXPORTS[format].label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          void deleteResume(resume.id).catch((err: unknown) => {
                            showStatus(err instanceof Error ? err.message : "Delete failed");
                          });
                        }}
                        disabled={resumes.length <= 1}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-100 px-2.5 text-xs font-medium text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Start from a template</h2>
                    <p className="text-sm text-slate-500">Backend-owned templates plus community presets.</p>
                  </div>
                  <LayoutTemplate className="text-slate-400" size={20} />
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Ready</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {templates.filter((template) => template.status === "ready").map((template) => (
                        <button
                          key={template.id}
                          onClick={() => void createFromTemplate(template.id, template.name)}
                          className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors enabled:hover:border-slate-300"
                        >
                          <div
                            className="mb-3 h-24 rounded-md border border-slate-200"
                            style={{
                              background: `linear-gradient(135deg, ${template.accent}18, white 55%)`,
                            }}
                          >
                            <div className="h-full p-3">
                              <div className="mb-2 h-3 w-24 rounded-full" style={{ background: template.accent }} />
                              <div className="mb-1 h-2 w-32 rounded-full bg-slate-200" />
                              <div className="h-2 w-20 rounded-full bg-slate-200" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{template.name}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-600">
                              {template.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Community</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {templates.filter((template) => template.status === "community").map((template) => (
                        <button
                          key={template.id}
                          onClick={() => void createFromTemplate(template.id, template.name)}
                          className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors enabled:hover:border-slate-300"
                        >
                          <div
                            className="mb-3 h-24 rounded-md border border-slate-200"
                            style={{
                              background: `linear-gradient(135deg, ${template.accent}18, white 55%)`,
                            }}
                          >
                            <div className="h-full p-3">
                              <div className="mb-2 h-3 w-24 rounded-full" style={{ background: template.accent }} />
                              <div className="mb-1 h-2 w-32 rounded-full bg-slate-200" />
                              <div className="h-2 w-20 rounded-full bg-slate-200" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{template.name}</p>
                            <span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-medium capitalize text-violet-700">
                              community
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FolderOpen size={18} className="text-slate-500" />
                  <h2 className="text-base font-semibold">MVP1 status</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <FileJson size={16} className="mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-medium">API-backed resume library</p>
                      <p className="text-xs leading-5 text-slate-500">Create, duplicate, import, export, and keep multiple CV drafts via backend endpoints.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <LayoutTemplate size={16} className="mt-0.5 text-indigo-600" />
                    <div>
                      <p className="font-medium">Template gallery</p>
                      <p className="text-xs leading-5 text-slate-500">Five ready templates are exposed by the backend and reused by the renderer.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="mt-0.5 text-slate-600" />
                    <div>
                      <p className="font-medium">Builder remains focused</p>
                      <p className="text-xs leading-5 text-slate-500">Open any resume to edit structure, style, live preview, and export PDF.</p>
                    </div>
                  </div>
                </div>
                <div className="my-4 border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Versioning</p>
                      <p className="text-xs leading-5 text-slate-500">
                        {revisionsLoading ? "Loading snapshots..." : `${revisions.length} snapshots available`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        void createSnapshot().catch((err: unknown) => {
                          showStatus(err instanceof Error ? err.message : "Snapshot failed");
                        });
                      }}
                      className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Save version
                    </button>
                  </div>
                  <div className="space-y-2">
                      {revisions.slice(0, 4).map((revision) => (
                        <div key={revision.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800">
                            v{revision.revision} {revision.label ? `· ${revision.label}` : ""}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
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
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
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
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                          >
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                    {revisions.length === 0 && (
                      <p className="text-xs leading-5 text-slate-500">
                        No snapshots yet. Save one to pin a baseline.
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Comparison</p>
                      <p className="text-xs leading-5 text-slate-500">
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
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {compareResult ? (
                    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800">
                          {compareResult.changeCount} field changes
                        </p>
                        <p className="text-[11px] text-slate-500">
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
                              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-800">{item.label}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.beforeCount} → {item.afterCount}
                                </p>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                                {item.status}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="space-y-2">
                        {compareResult.changes.slice(0, 6).map((change) => (
                          <div key={`${change.kind}-${change.path}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                            <p className="text-xs font-medium text-slate-800">{change.path}</p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {change.kind}
                            </p>
                          </div>
                        ))}
                        {compareResult.changes.length === 0 && (
                          <p className="text-xs leading-5 text-slate-500">No structural changes detected.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-slate-500">
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
