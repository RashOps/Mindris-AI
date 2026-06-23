"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
];

const NAV_ITEMS = [
  { label: "Resumes", href: "/dashboard", active: true },
  { label: "Builder", href: "/tools/cv-creator", active: false },
  { label: "ATS", href: "/tools/ats-score", active: false },
  { label: "Tracker", href: "/tools/tracker", active: false },
  { label: "Markdown PDF", href: "/tools/markdown", active: false },
] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function downloadResume(id: string, name: string) {
  const response = await fetch(apiUrl(`/api/v1/resumes/${id}/export-json`), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error("JSON export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_") || "mindris_cv"}.json`;
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

  const showStatus = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 3500);
  };

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
  }, [loadResumes]);

  useEffect(() => {
    void fetchResumeTemplates()
      .then((items) => {
        if (items.length > 0) setTemplates(items);
      })
      .catch((err: unknown) => {
        showStatus(err instanceof Error ? err.message : "Template loading failed");
      });
  }, []);

  const openResume = (id: string) => {
    setActiveResume(id);
    router.push("/tools/cv-creator");
  };

  const createFromTemplate = async (templateId: string, name: string) => {
    const id = await createResume(`${name} CV`, templateId);
    openResume(id);
  };

  const importCVData = async (cvData: CVData, name: string) => {
    const id = await importResume(name, cvData, "json");
    await fetch(apiUrl("/api/v1/cv/current"), {
      method: "PUT",
      headers: jsonHeaders(),
      body: JSON.stringify({
        cv_data: cvData,
        source: "json",
      }),
    }).catch(() => undefined);
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

      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), {
        method: "POST",
        headers: apiHeaders(),
        body: form,
      });
      if (!res.ok) throw new Error("PDF import failed");
      const data = await res.json();
      const cvData = cvDataFromImport(data.cv_data);
      if (!cvData) throw new Error("PDF parser returned invalid CV data");
      await importCVData(cvData, cvData.profile.full_name || fileNameToResumeName(file));
      showStatus("PDF resume imported");
    } catch (err: unknown) {
      showStatus(err instanceof Error ? err.message : "PDF import failed");
    } finally {
      setIsImportingPdf(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <Link href="/" className="mb-8 flex items-center gap-3 no-underline">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
              M
            </div>
            <div>
              <p className="text-sm font-semibold">Mindris AI</p>
              <p className="text-xs text-slate-500">Open resume studio</p>
            </div>
          </Link>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors"
                style={{
                  background: item.active ? "#eef2ff" : "transparent",
                  color: item.active ? "#3730a3" : "#475569",
                }}
              >
                {item.label}
                {item.active && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
              <h1 className="text-xl font-semibold tracking-tight">Resume Library</h1>
            </div>
            <div className="flex items-center gap-2">
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
              <button
                onClick={() => jsonInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm"
              >
                <Upload size={15} />
                JSON
              </button>
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isImportingPdf}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50"
              >
                <FileText size={15} />
                {isImportingPdf ? "Parsing..." : "PDF"}
              </button>
              <button
                onClick={() => void createFromTemplate("modern", "Untitled")}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm"
              >
                <Plus size={15} />
                New CV
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-6">
            {status && (
              <div className="mb-4 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                {status}
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
                      <button
                        onClick={() => {
                          void downloadResume(resume.id, resume.name)
                            .then(() => showStatus("JSON resume exported"))
                            .catch((err: unknown) => {
                              showStatus(err instanceof Error ? err.message : "JSON export failed");
                            });
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700"
                      >
                        <Download size={13} /> JSON
                      </button>
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
                    <p className="text-sm text-slate-500">Five backend-owned templates ready for MVP1.</p>
                  </div>
                  <LayoutTemplate className="text-slate-400" size={20} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((template) => {
                    const ready = template.status === "ready";
                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          if (ready) void createFromTemplate(template.id, template.name);
                        }}
                        disabled={!ready}
                        className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors enabled:hover:border-slate-300 disabled:opacity-60"
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
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{template.name}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-600">
                            {template.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{template.description}</p>
                      </button>
                    );
                  })}
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
              </aside>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
