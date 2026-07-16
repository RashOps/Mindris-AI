"use client";

import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { GhostMode } from "@/components/GhostMode";
import { StylePanel } from "@/components/StylePanel";
import { JobInsightsPanel } from "@/components/JobInsightsPanel";
import { CoverLetterModal } from "@/components/CoverLetterModal";
import { useCVStore } from "@/store/useCVStore";
import { cvDataFromImport, resumeNameFromImport, type CompanyInsight, type JobInsights } from "@/store/useCVStore";
import { useEffect, useState, useRef, useCallback } from "react";
import { apiUrl, rendererUrl, apiHeaders, jsonHeaders } from "@/lib/api";
import { resolveTemplateRenderPayload } from "@/lib/templates";
import { Download, Upload } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CvBuilderHeader } from "./components/CvBuilderHeader";
import type { HeaderMenuAction } from "./components/HeaderActionMenu";

type DragPayload =
  | { kind: "skill"; skill: string }
  | { kind: "skillGroup"; groupId: string }
  | { kind: "bullet"; bullet: string }
  | { kind: "experience"; expId: string };

type JobResultPayload = Partial<JobInsights> & {
  company_insight?: CompanyInsight;
};

type ResumeExportFormat = "json" | "markdown" | "html" | "docx" | "latex" | "typst";
type HeaderMenuId = "upload" | "download";
type EditorTab = "structure" | "style";

const RESUME_EXPORTS: Record<
  ResumeExportFormat,
  { endpoint: string; extension: string; label: string }
> = {
  json: { endpoint: "export-json", extension: "json", label: "JSON" },
  markdown: { endpoint: "export-markdown", extension: "md", label: "Markdown" },
  html: { endpoint: "export-html", extension: "html", label: "HTML" },
  docx: { endpoint: "export-docx", extension: "docx", label: "DOCX" },
  latex: { endpoint: "export-latex", extension: "tex", label: "LaTeX" },
  typst: { endpoint: "export-typst", extension: "typ", label: "Typst" },
};

function asDragPayload(value: unknown): DragPayload | null {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value as DragPayload;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

export default function AppPage() {
  const {
    setIsOptimizing, replaceCVData, cvData,
    setJobInsights, jobInsights,
    updateSkillGroup, updateExperience,
    appSettings,
    loadResumes,
    resumes, activeResumeId, setActiveResume,
    createResume, duplicateResume, deleteResume,
    createResumeLocale, activateResumeLocale, deleteResumeLocale,
    renameResume,
    flushResumeSave, retryResumeSave,
    resumeSaveStatus, resumeSaveError, lastResumeSavedAt,
  } = useCVStore();

  const [jobUrl, setJobUrl]       = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("structure");
  const [showInsights, setShowInsights] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<HeaderMenuId | null>(null);
  const [localeToCreate, setLocaleToCreate] = useState<"" | "fr" | "en" | "de" | "es">("");
  const [toast, setToast]         = useState<string | null>(null);

  const pdfInputRef  = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, ms = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    void loadResumes().catch((err: unknown) => {
      showToast(errorMessage(err, "Failed to load resumes"), 6000);
    });
  }, [loadResumes]);

  useEffect(() => {
    if (!activeHeaderMenu) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerMenuRef.current?.contains(event.target as Node)) {
        setActiveHeaderMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveHeaderMenu(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeHeaderMenu]);

  const activeResume = resumes.find((resume) => resume.id === activeResumeId);
  const activeLocale = activeResume?.multilingual.activeLocale ?? activeResume?.locale ?? "fr";
  const availableLocales = activeResume?.multilingual.availableLocales ?? [activeLocale];
  const inactiveLocales = (["fr", "en", "de", "es"] as const).filter(
    (locale) => !availableLocales.includes(locale),
  );
  const saveStatusText =
    resumeSaveStatus === "dirty"
      ? "Unsaved changes"
      : resumeSaveStatus === "saving"
        ? "Saving..."
        : resumeSaveStatus === "error"
          ? "Save failed"
          : lastResumeSavedAt
            ? "Saved"
            : "Loaded";
  const saveStatusColor =
    resumeSaveStatus === "error"
      ? "#b91c1c"
      : resumeSaveStatus === "dirty" || resumeSaveStatus === "saving"
        ? "#92400e"
        : "#047857";

  // ── dnd-kit sensors ────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ── Global drag end handler ────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData = asDragPayload(active.data.current);
    const dropData = asDragPayload(over.data.current);

    // Skill tag → skill group
    if (dragData?.kind === "skill" && dropData?.kind === "skillGroup") {
      const group = cvData.skills.find((g) => g.id === dropData.groupId);
      if (group && !group.skills.includes(dragData.skill)) {
        updateSkillGroup(group.id, { skills: [...group.skills, dragData.skill] });
        showToast(`"${dragData.skill}" added to ${group.category}`);
      }
    }

    // Bullet → experience description
    if (dragData?.kind === "bullet" && dropData?.kind === "experience") {
      const exp = cvData.experience.find((e) => e.id === dropData.expId);
      if (exp) {
        const existing = exp.description_markdown;
        const updated  = existing ? `${existing}\n- ${dragData.bullet}` : `- ${dragData.bullet}`;
        updateExperience(exp.id, { description_markdown: updated });
        showToast("Bullet added to experience");
      }
    }
  }, [cvData, updateSkillGroup, updateExperience]);

  // ── Job Result callback (from GhostMode SSE) ──────────────────────────────

  const handleCompanyResult = useCallback((data: JobResultPayload) => {
    const insight = data.company_insight;
    if (!insight) return;
    const current = useCVStore.getState().jobInsights;
    if (current) setJobInsights({ ...current, company_insight: insight });
  }, [setJobInsights]);
  const handleJobResult = useCallback((data: JobResultPayload) => {
    const insights: JobInsights = {
      job_title:       typeof data.job_title === "string" ? data.job_title : "Unknown Role",
      company:         typeof data.company === "string" ? data.company : "",
      hard_skills:     stringArray(data.hard_skills),
      soft_skills:     stringArray(data.soft_skills),
      drafted_bullets: stringArray(data.drafted_bullets),
      raw_markdown:    typeof data.raw_markdown === "string" ? data.raw_markdown : "",
      score:           typeof data.score === "number" ? data.score : 0,
      ats_report:      data.ats_report,
      company_insight: data.company_insight,
    };
    setJobInsights(insights);
    setShowInsights(true);
    showToast("Job insights ready — see panel");
  }, [setJobInsights]);

  // ── PDF Upload ─────────────────────────────────────────────────────────────
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    showToast("Parsing PDF (10-30s)...", 30000);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", appSettings.optimize_llm.provider);
      formData.append("model_name", appSettings.optimize_llm.model_name);
      formData.append("ingestion_mode", appSettings.pdf_ingestion_mode);
      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), { method: "POST", headers: apiHeaders(), body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Upload failed"); }
      const data = await res.json();
      if (data.cv_data) replaceCVData(data.cv_data);
      showToast("PDF indexed. Editor and RAG updated.");
    } catch (err: unknown) {
      showToast(errorMessage(err, "Upload failed"), 6000);
    } finally {
      setIsUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  // ── JSON Upload ────────────────────────────────────────────────────────────
  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const importedCV = cvDataFromImport(jsonData);
      if (!importedCV) throw new Error("Invalid CV JSON");
      replaceCVData(importedCV);
      const importedName = resumeNameFromImport(jsonData);
      if (importedName) renameResume(activeResumeId, importedName);
      await fetch(apiUrl("/api/v1/cv/current"), {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: importedCV,
          source: "json",
        }),
      });
      showToast("JSON CV indexed.");
    } catch (err: unknown) {
      showToast(errorMessage(err, "Failed to parse or upload JSON."), 5000);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  const handleExportResume = async (format: ResumeExportFormat) => {
    await flushResumeSave();
    const exportConfig = RESUME_EXPORTS[format];
    const localeQuery = activeLocale ? `?locale=${encodeURIComponent(activeLocale)}` : "";
    const response = await fetch(apiUrl(`/api/v1/resumes/${activeResumeId}/${exportConfig.endpoint}${localeQuery}`), {
      headers: apiHeaders(),
    });
    if (!response.ok) throw new Error(`${exportConfig.label} export failed`);
    const blob = await response.blob();
    const activeResume = resumes.find((resume) => resume.id === activeResumeId);
    const name = activeResume?.name || cvData.profile.full_name || "mindris_cv";
    triggerBlobDownload(
      blob,
      `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`,
    );
    showToast(`Resume ${exportConfig.label} exported`);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    showToast("Generating PDF...", 30000);
    try {
      await flushResumeSave();
      const resolved = await resolveTemplateRenderPayload(
        cvData,
        cvData.global_settings.template_id || "modern",
      );
      const res = await fetch(rendererUrl("/render/pdf"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: resolved.cv_data,
          template_id: resolved.template_id,
          return_buffer: true,
        }),
      });
      if (!res.ok) throw new Error("Render failed");
      const blob = await res.blob();
      triggerBlobDownload(
        blob,
        `${cvData.profile.full_name.replace(/\s+/g, "_")}_CV.pdf`,
      );
      showToast("PDF downloaded.");
    } catch (err: unknown) {
      showToast(errorMessage(err, "Render failed"), 5000);
    }
  };

  // ── Optimize ───────────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!jobUrl.trim()) return;
    setIsOptimizing(true);
    setShowGhost(true);
    setJobId(null);
    try {
      const res = await fetch(apiUrl("/api/v1/optimize"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          job_url:    jobUrl,
          provider:   appSettings.optimize_llm.provider,
          model_name: appSettings.optimize_llm.model_name,
        }),
      });
      if (!res.ok) throw new Error("Failed to start pipeline");
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err: unknown) {
      showToast(errorMessage(err, "Failed to start pipeline"), 5000);
      setIsOptimizing(false);
      setShowGhost(false);
    }
  };

  const handleGhostDone  = () => { setIsOptimizing(false); showToast("CV optimized. Check the preview."); };
  const handleGhostError = () => { setIsOptimizing(false); showToast("Pipeline failed.", 6000); };

  const { isOptimizing } = useCVStore();
  const uploadActions: HeaderMenuAction[] = [
    {
      label: "PDF",
      hint: isUploading ? "Parsing..." : "Import resume",
      disabled: isUploading,
      onSelect: () => pdfInputRef.current?.click(),
    },
    {
      label: "JSON",
      hint: "Import structured data",
      onSelect: () => jsonInputRef.current?.click(),
    },
  ];
  const downloadActions: HeaderMenuAction[] = [
    {
      label: "PDF",
      hint: "Print-ready export",
      onSelect: () => {
        void handleExportPDF();
      },
    },
    {
      label: "DOCX",
      hint: "Recruiter format",
      onSelect: () => {
        void handleExportResume("docx").catch((err: unknown) => {
          showToast(errorMessage(err, "DOCX export failed"), 6000);
        });
      },
    },
    {
      label: "JSON",
      hint: "Structured data",
      onSelect: () => {
        void handleExportResume("json").catch((err: unknown) => {
          showToast(errorMessage(err, "JSON export failed"), 6000);
        });
      },
    },
    {
      label: "Markdown",
      hint: "GitHub-friendly",
      onSelect: () => {
        void handleExportResume("markdown").catch((err: unknown) => {
          showToast(errorMessage(err, "Markdown export failed"), 6000);
        });
      },
    },
    {
      label: "HTML",
      hint: "Web profile",
      onSelect: () => {
        void handleExportResume("html").catch((err: unknown) => {
          showToast(errorMessage(err, "HTML export failed"), 6000);
        });
      },
    },
    {
      label: "LaTeX",
      hint: "Portable source",
      onSelect: () => {
        void handleExportResume("latex").catch((err: unknown) => {
          showToast(errorMessage(err, "LaTeX export failed"), 6000);
        });
      },
    },
    {
      label: "Typst",
      hint: "Portable source",
      onSelect: () => {
        void handleExportResume("typst").catch((err: unknown) => {
          showToast(errorMessage(err, "Typst export failed"), 6000);
        });
      },
    },
  ];
  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main className="app-page flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl max-w-sm animate-in slide-in-from-top-2 duration-300">
            {toast}
          </div>
        )}

        <input type="file" accept=".pdf" className="hidden" ref={pdfInputRef} onChange={handlePdfUpload} />
        <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />

        <CvBuilderHeader
          activeResumeId={activeResumeId}
          resumes={resumes.map((resume) => ({ id: resume.id, name: resume.name }))}
          activeResumeName={activeResume?.name ?? ""}
          activeLocale={activeLocale}
          availableLocales={availableLocales}
          inactiveLocales={[...inactiveLocales]}
          localeToCreate={localeToCreate}
          canDeleteLocale={Boolean(availableLocales.length > 1 && activeLocale !== activeResume?.multilingual.defaultLocale)}
          isUploading={isUploading}
          isOptimizing={isOptimizing}
          showGhost={showGhost}
          showInsights={showInsights}
          jobUrl={jobUrl}
          resumeSaveStatus={resumeSaveStatus}
          saveStatusText={saveStatusText}
          saveStatusColor={saveStatusColor}
          resumeSaveError={resumeSaveError}
          activeHeaderMenu={activeHeaderMenu}
          headerMenuRef={headerMenuRef}
          uploadActions={uploadActions}
          downloadActions={downloadActions}
          uploadIcon={isUploading ? <span className="h-3.5 w-3.5 rounded-full border border-sky-500 border-t-transparent animate-spin" /> : <Upload className="h-4 w-4 text-slate-600" />}
          downloadIcon={<Download className="h-4 w-4 text-slate-600" />}
          insightsBadge={Boolean(jobInsights)}
          onSelectResume={setActiveResume}
          onRenameResume={(name) => renameResume(activeResumeId, name)}
          onCreateResume={() => {
            void createResume("Untitled CV")
              .then(() => showToast("New blank CV created"))
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Create failed"), 6000);
              });
          }}
          onDuplicateResume={() => {
            void duplicateResume()
              .then(() => showToast("CV duplicated"))
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Duplicate failed"), 6000);
              });
          }}
          onDeleteResume={() => {
            void deleteResume(activeResumeId)
              .then(() => showToast(resumes.length > 1 ? "CV deleted" : "Keep at least one CV"))
              .catch((err: unknown) => {
                showToast(errorMessage(err, "Delete failed"), 6000);
              });
          }}
          onActivateLocale={(locale) => {
            if (locale === activeLocale) return;
            void activateResumeLocale(locale).then(() => {
              showToast(`${locale.toUpperCase()} variant active`);
            }).catch((err: unknown) => {
              showToast(errorMessage(err, "Locale switch failed"), 6000);
            });
          }}
          onSetLocaleToCreate={setLocaleToCreate}
          onCreateLocale={() => {
            if (!localeToCreate) return;
            void createResumeLocale(localeToCreate, activeLocale).then(() => {
              showToast(`${localeToCreate.toUpperCase()} variant created`);
              setLocaleToCreate("");
            }).catch((err: unknown) => {
              showToast(errorMessage(err, "Locale creation failed"), 6000);
            });
          }}
          onDeleteLocale={() => {
            void deleteResumeLocale(activeLocale).then(() => {
              showToast(`${activeLocale.toUpperCase()} variant deleted`);
            }).catch((err: unknown) => {
              showToast(errorMessage(err, "Locale delete failed"), 6000);
            });
          }}
          onRetrySave={() => {
            if (resumeSaveStatus === "error") {
              void retryResumeSave().catch((err: unknown) => {
                showToast(errorMessage(err, "Save retry failed"), 6000);
              });
            }
          }}
          onChangeJobUrl={setJobUrl}
          onOptimize={handleOptimize}
          onToggleUploadMenu={() => setActiveHeaderMenu((current) => current === "upload" ? null : "upload")}
          onToggleDownloadMenu={() => setActiveHeaderMenu((current) => current === "download" ? null : "download")}
          onCloseHeaderMenu={() => setActiveHeaderMenu(null)}
          onToggleGhost={() => setShowGhost((v) => !v)}
          onToggleInsights={() => setShowInsights((v) => !v)}
          onOpenCoverLetter={() => setShowCoverLetter(true)}
        />

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden bg-muted/40">

          {/* Editor */}
          <div className={`flex h-full flex-col overflow-hidden border-r border-border bg-card transition-all duration-300 ${showGhost || showInsights ? "w-[32%]" : "w-[45%]"}`}>
            <div className="shrink-0 border-b border-border bg-card px-4 py-2">
              <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setEditorTab("structure")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editorTab === "structure"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Structure
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("style")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    editorTab === "style"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Style
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden px-3 py-3">
              {editorTab === "structure" ? <Editor /> : <StylePanel variant="embedded" />}
            </div>
          </div>

          {/* Ghost Mode */}
          {showGhost && (
            <div className="flex h-full w-[34%] flex-col overflow-hidden border-r border-border bg-card">
              <div className="shrink-0 border-b border-border bg-card px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ghost Mode</p>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <GhostMode
                  jobId={jobId}
                  onDone={handleGhostDone}
                  onError={handleGhostError}
                  onJobResult={handleJobResult}
                  onCompanyResult={handleCompanyResult}
                />
              </div>
            </div>
          )}

          {/* Job insights */}
          {showInsights && (
            <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
              <JobInsightsPanel
                open={showInsights}
                onClose={() => setShowInsights(false)}
                variant="embedded"
              />
            </div>
          )}

          {/* Preview */}
          <div className="flex h-full flex-1 flex-col overflow-hidden bg-muted/20">
            <div className="shrink-0 border-b border-border bg-card px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Live Preview</p>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <LivePreview />
            </div>
          </div>
        </div>

        {/* Drawers (outside main flow) */}
        <CoverLetterModal open={showCoverLetter} onClose={() => setShowCoverLetter(false)} />

      </main>
    </DndContext>
  );
}
