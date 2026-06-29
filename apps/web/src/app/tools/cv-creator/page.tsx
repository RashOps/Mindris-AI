"use client";

import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { GhostMode } from "@/components/GhostMode";
import { StylePanel } from "@/components/StylePanel";
import { JobInsightsPanel } from "@/components/JobInsightsPanel";
import { CoverLetterModal } from "@/components/CoverLetterModal";
import { LLMSelector } from "@/components/LLMSelector";
import { useCVStore } from "@/store/useCVStore";
import { cvDataFromImport, resumeNameFromImport, type CompanyInsight, type JobInsights } from "@/store/useCVStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";
import { apiUrl, rendererUrl, apiHeaders, jsonHeaders } from "@/lib/api";
import { ChevronDown, Download, Upload } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

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
type HeaderMenuAction = {
  label: string;
  hint: string;
  disabled?: boolean;
  onSelect: () => void;
};

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

function HeaderActionMenu({
  label,
  icon,
  isOpen,
  onToggle,
  onClose,
  actions,
}: {
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: HeaderMenuAction[];
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={`${label} menu`}
          className="absolute right-0 top-11 z-40 min-w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                onClose();
                action.onSelect();
              }}
              className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm font-medium text-slate-800">{action.label}</span>
              <span className="text-[11px] text-slate-500">{action.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
    renameResume,
    flushResumeSave, retryResumeSave,
    resumeSaveStatus, resumeSaveError, lastResumeSavedAt,
  } = useCVStore();

  const [jobUrl, setJobUrl]       = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<HeaderMenuId | null>(null);
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
    const response = await fetch(apiUrl(`/api/v1/resumes/${activeResumeId}/${exportConfig.endpoint}`), {
      headers: apiHeaders(),
    });
    if (!response.ok) throw new Error(`${exportConfig.label} export failed`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const activeResume = resumes.find((resume) => resume.id === activeResumeId);
    const name = activeResume?.name || cvData.profile.full_name || "mindris_cv";
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Resume ${exportConfig.label} exported`);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    showToast("Generating PDF...", 30000);
    try {
      await flushResumeSave();
      const res = await fetch(rendererUrl("/render/pdf"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: cvData,
          template_id: cvData.global_settings.template_id || "modern",
          return_buffer: true,
        }),
      });
      if (!res.ok) throw new Error("Render failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${cvData.profile.full_name.replace(/\s+/g, "_")}_CV.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
      <main className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-slate-50 text-slate-950">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl max-w-sm animate-in slide-in-from-top-2 duration-300">
            {toast}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="z-30 flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              CV Builder
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <select
              value={activeResumeId}
              onChange={(e) => setActiveResume(e.target.value)}
              className="h-9 min-w-40 max-w-56 cursor-pointer rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none focus:border-slate-500"
              title="Active resume"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.name}
                </option>
              ))}
            </select>
            <input
              value={activeResume?.name ?? ""}
              onChange={(e) => renameResume(activeResumeId, e.target.value)}
              placeholder="Resume name"
              className="h-9 w-40 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
              title="Rename active resume"
            />
            <button
              onClick={() => {
                void createResume("Untitled CV")
                  .then(() => showToast("New blank CV created"))
                  .catch((err: unknown) => {
                    showToast(errorMessage(err, "Create failed"), 6000);
                  });
              }}
              className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              title="Create blank CV"
            >
              New
            </button>
            <button
              onClick={() => {
                void duplicateResume()
                  .then(() => showToast("CV duplicated"))
                  .catch((err: unknown) => {
                    showToast(errorMessage(err, "Duplicate failed"), 6000);
                  });
              }}
              className="h-9 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              title="Duplicate active CV"
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                void deleteResume(activeResumeId)
                  .then(() => showToast(resumes.length > 1 ? "CV deleted" : "Keep at least one CV"))
                  .catch((err: unknown) => {
                    showToast(errorMessage(err, "Delete failed"), 6000);
                  });
              }}
              disabled={resumes.length <= 1}
              className="h-9 cursor-pointer rounded-lg border border-red-100 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              title="Delete active CV"
            >
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2">
          <LLMSelector taskKey="optimize_llm" label="Optimize" />
          <button
            onClick={() => {
              if (resumeSaveStatus === "error") {
                void retryResumeSave().catch((err: unknown) => {
                  showToast(errorMessage(err, "Save retry failed"), 6000);
                });
              }
            }}
            className="h-9 rounded-lg border px-3 text-xs font-medium"
            style={{
              borderColor: resumeSaveStatus === "error" ? "#fecaca" : "#e2e8f0",
              background: "#fff",
              color: saveStatusColor,
              cursor: resumeSaveStatus === "error" ? "pointer" : "default",
            }}
            title={resumeSaveError ?? "Backend save status"}
          >
            {saveStatusText}
          </button>
          </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          {/* Job URL */}
          <div className="flex min-w-[280px] flex-1 items-center gap-2">
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOptimize()}
              placeholder="Paste job offer URL…"
              className="h-9 border-slate-300 bg-white text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus-visible:border-slate-500"
            />
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !jobUrl.trim()}
              className="h-9 shrink-0 cursor-pointer bg-slate-950 px-4 text-sm text-white hover:bg-slate-800"
            >
              {isOptimizing
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</span>
                : "Optimize"
              }
            </Button>
          </div>

          {/* Action buttons */}
          <div ref={headerMenuRef} className="flex flex-wrap items-center gap-1.5">
            <input type="file" accept=".pdf"  className="hidden" ref={pdfInputRef}  onChange={handlePdfUpload} />
            <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />

            <HeaderActionMenu
              label="Upload CV"
              icon={isUploading ? <span className="h-3.5 w-3.5 rounded-full border border-sky-500 border-t-transparent animate-spin" /> : <Upload className="h-4 w-4 text-slate-600" />}
              isOpen={activeHeaderMenu === "upload"}
              onToggle={() => setActiveHeaderMenu((current) => current === "upload" ? null : "upload")}
              onClose={() => setActiveHeaderMenu(null)}
              actions={uploadActions}
            />

            <HeaderActionMenu
              label="Download CV"
              icon={<Download className="h-4 w-4 text-slate-600" />}
              isOpen={activeHeaderMenu === "download"}
              onToggle={() => setActiveHeaderMenu((current) => current === "download" ? null : "download")}
              onClose={() => setActiveHeaderMenu(null)}
              actions={downloadActions}
            />

            <button onClick={() => setShowGhost((v) => !v)}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors"
              style={showGhost
                ? { borderColor: '#c7d2fe', background: '#eef2ff', color: '#4338ca' }
                : { borderColor: '#e2e8f0', background: '#fff', color: '#475569' }}>
              Ghost
            </button>

            <button onClick={() => setShowInsights((v) => !v)}
              className="relative inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors"
              style={showInsights
                ? { borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }
                : { borderColor: '#e2e8f0', background: '#fff', color: '#475569' }}>
              Insights
              {jobInsights && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>

            <button onClick={() => setShowCoverLetter(true)}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              Cover Letter
            </button>

            <button onClick={() => setShowStyle((v) => !v)}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors"
              style={showStyle
                ? { borderColor: '#ddd6fe', background: '#f5f3ff', color: '#6d28d9' }
                : { borderColor: '#e2e8f0', background: '#fff', color: '#475569' }}>
              Style
            </button>

          </div>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden bg-slate-100">

          {/* Editor */}
          <div className={`h-full border-r flex flex-col overflow-hidden transition-all duration-300 ${showGhost ? "w-[30%]" : "w-[45%]"}`}
            style={{ background: '#fff', borderColor: '#e2e8f0' }}>
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Structure Editor</p>
            </div>
            <div className="flex-1 overflow-hidden px-3 py-3">
              <Editor />
            </div>
          </div>

          {/* Ghost Mode */}
          {showGhost && (
            <div className="flex h-full w-[35%] flex-col overflow-hidden border-r border-slate-200 bg-white">
              <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Ghost Mode</p>
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

          {/* Preview */}
          <div className="flex h-full flex-1 flex-col overflow-hidden bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Live Preview</p>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <LivePreview />
            </div>
          </div>
        </div>

        {/* Drawers (outside main flow) */}
        <StylePanel      open={showStyle}       onClose={() => setShowStyle(false)} />
        <JobInsightsPanel open={showInsights}   onClose={() => setShowInsights(false)} />
        <CoverLetterModal open={showCoverLetter} onClose={() => setShowCoverLetter(false)} />

      </main>
    </DndContext>
  );
}
