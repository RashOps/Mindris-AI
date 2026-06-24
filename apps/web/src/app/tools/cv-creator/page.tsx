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
import { useEffect, useState, useRef, useCallback } from "react";
import { apiUrl, rendererUrl, apiHeaders, jsonHeaders } from "@/lib/api";
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

type ResumeExportFormat = "json" | "markdown" | "html";

const RESUME_EXPORTS: Record<
  ResumeExportFormat,
  { endpoint: string; extension: string; label: string }
> = {
  json: { endpoint: "export-json", extension: "json", label: "JSON" },
  markdown: { endpoint: "export-markdown", extension: "md", label: "Markdown" },
  html: { endpoint: "export-html", extension: "html", label: "HTML" },
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
  const [toast, setToast]         = useState<string | null>(null);

  const pdfInputRef  = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ms = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    void loadResumes().catch((err: unknown) => {
      showToast(`❌ ${errorMessage(err, "Failed to load resumes")}`, 6000);
    });
  }, [loadResumes]);

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
      ? "#fca5a5"
      : resumeSaveStatus === "dirty" || resumeSaveStatus === "saving"
        ? "#fcd34d"
        : "#86efac";

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
        showToast(`✅ "${dragData.skill}" added to ${group.category}`);
      }
    }

    // Bullet → experience description
    if (dragData?.kind === "bullet" && dropData?.kind === "experience") {
      const exp = cvData.experience.find((e) => e.id === dropData.expId);
      if (exp) {
        const existing = exp.description_markdown;
        const updated  = existing ? `${existing}\n- ${dragData.bullet}` : `- ${dragData.bullet}`;
        updateExperience(exp.id, { description_markdown: updated });
        showToast("✅ Bullet added to experience");
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
    showToast("💼 Job Insights ready — see panel →");
  }, [setJobInsights]);

  // ── PDF Upload ─────────────────────────────────────────────────────────────
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    showToast("📄 Parsing PDF (10-30s)…", 30000);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("provider", appSettings.optimize_llm.provider);
      formData.append("model_name", appSettings.optimize_llm.model_name);
      const res = await fetch(apiUrl("/api/v1/cv/upload-pdf"), { method: "POST", headers: apiHeaders(), body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Upload failed"); }
      const data = await res.json();
      if (data.cv_data) replaceCVData(data.cv_data);
      showToast("✅ PDF indexed! Editor and RAG updated.");
    } catch (err: unknown) {
      showToast(`❌ ${errorMessage(err, "Upload failed")}`, 6000);
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
      showToast("✅ JSON CV indexed!");
    } catch (err: unknown) {
      showToast(`❌ ${errorMessage(err, "Failed to parse or upload JSON.")}`, 5000);
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
    showToast(`✅ Resume ${exportConfig.label} exported`);
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    showToast("⏳ Generating PDF…", 30000);
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
      showToast("✅ PDF downloaded!");
    } catch (err: unknown) {
      showToast(`❌ ${errorMessage(err, "Render failed")}`, 5000);
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
      showToast(`❌ ${errorMessage(err, "Failed to start pipeline")}`, 5000);
      setIsOptimizing(false);
      setShowGhost(false);
    }
  };

  const handleGhostDone  = () => { setIsOptimizing(false); showToast("🎉 CV optimized! Check the preview →"); };
  const handleGhostError = () => { setIsOptimizing(false); showToast("❌ Pipeline failed.", 6000); };

  const { isOptimizing } = useCVStore();

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main className="flex h-screen w-full flex-col overflow-hidden theme-dark-tool" style={{ background: '#0a0f1a', color: '#e2e8f0' }}>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl max-w-sm animate-in slide-in-from-top-2 duration-300">
            {toast}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 z-30" style={{ background: 'rgba(10,15,26,0.95)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              CV Builder
            </p>
          </div>

          <div className="flex items-center gap-1.5 min-w-0 max-w-sm">
            <select
              value={activeResumeId}
              onChange={(e) => setActiveResume(e.target.value)}
              className="h-8 min-w-32 max-w-44 rounded-lg px-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
              title="Active resume"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id} style={{ background: '#0a0f1a' }}>
                  {resume.name}
                </option>
              ))}
            </select>
            <input
              value={activeResume?.name ?? ""}
              onChange={(e) => renameResume(activeResumeId, e.target.value)}
              placeholder="Resume name"
              className="h-8 w-36 rounded-lg px-2 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}
              title="Rename active resume"
            />
            <button
              onClick={() => {
                void createResume("Untitled CV")
                  .then(() => showToast("✅ New blank CV created"))
                  .catch((err: unknown) => {
                    showToast(`❌ ${errorMessage(err, "Create failed")}`, 6000);
                  });
              }}
              className="h-8 px-2 rounded-lg text-xs border"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}
              title="Create blank CV"
            >
              New
            </button>
            <button
              onClick={() => {
                void duplicateResume()
                  .then(() => showToast("✅ CV duplicated"))
                  .catch((err: unknown) => {
                    showToast(`❌ ${errorMessage(err, "Duplicate failed")}`, 6000);
                  });
              }}
              className="h-8 px-2 rounded-lg text-xs border"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}
              title="Duplicate active CV"
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                void deleteResume(activeResumeId)
                  .then(() => showToast(resumes.length > 1 ? "✅ CV deleted" : "Keep at least one CV"))
                  .catch((err: unknown) => {
                    showToast(`❌ ${errorMessage(err, "Delete failed")}`, 6000);
                  });
              }}
              disabled={resumes.length <= 1}
              className="h-8 px-2 rounded-lg text-xs border disabled:opacity-40"
              style={{ borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: '#fca5a5' }}
              title="Delete active CV"
            >
              Delete
            </button>
          </div>

          <LLMSelector taskKey="optimize_llm" label="Optimize" />
          <button
            onClick={() => {
              if (resumeSaveStatus === "error") {
                void retryResumeSave().catch((err: unknown) => {
                  showToast(`❌ ${errorMessage(err, "Save retry failed")}`, 6000);
                });
              }
            }}
            className="h-8 rounded-lg border px-2 text-xs"
            style={{
              borderColor: resumeSaveStatus === "error" ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: saveStatusColor,
              cursor: resumeSaveStatus === "error" ? "pointer" : "default",
            }}
            title={resumeSaveError ?? "Backend save status"}
          >
            {saveStatusText}
          </button>
          {/* Job URL */}
          <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOptimize()}
              placeholder="Paste job offer URL…"
              className="text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !jobUrl.trim()}
              className="shrink-0 text-white text-sm px-4"
              style={{ background: isOptimizing ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
            >
              {isOptimizing
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</span>
                : "Optimize"
              }
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <input type="file" accept=".pdf"  className="hidden" ref={pdfInputRef}  onChange={handlePdfUpload} />
            <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />

            <button onClick={() => pdfInputRef.current?.click()} disabled={isUploading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50"
              style={{ borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.1)', color: '#93c5fd' }}>
              {isUploading ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> : null} PDF
            </button>

            <button onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              ↑ JSON
            </button>

            <button onClick={() => void handleExportResume("json").catch((err: unknown) => {
              showToast(`❌ ${errorMessage(err, "JSON export failed")}`, 6000);
            })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              ↓ JSON
            </button>

            <button onClick={() => void handleExportResume("markdown").catch((err: unknown) => {
              showToast(`❌ ${errorMessage(err, "Markdown export failed")}`, 6000);
            })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              ↓ MD
            </button>

            <button onClick={() => void handleExportResume("html").catch((err: unknown) => {
              showToast(`❌ ${errorMessage(err, "HTML export failed")}`, 6000);
            })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              ↓ HTML
            </button>

            <button onClick={() => setShowGhost((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={showGhost
                ? { borderColor: 'rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              Ghost
            </button>

            <button onClick={() => setShowInsights((v) => !v)}
              className="relative inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={showInsights
                ? { borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              💼 Insights
              {jobInsights && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>

            <button onClick={() => setShowCoverLetter(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#c4b5fd' }}>
              Cover Letter
            </button>

            <button onClick={() => setShowStyle((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={showStyle
                ? { borderColor: 'rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd' }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
              Style
            </button>

            <button onClick={handleExportPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
              ↓ Export
            </button>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Editor */}
          <div className={`h-full border-r flex flex-col overflow-hidden transition-all duration-300 ${showGhost ? "w-[30%]" : "w-[45%]"}`}
            style={{ background: 'rgba(10,15,26,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-4 py-2 border-b shrink-0" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Structure Editor</p>
            </div>
            <div className="flex-1 overflow-hidden px-3 py-3">
              <Editor />
            </div>
          </div>

          {/* Ghost Mode */}
          {showGhost && (
            <div className="w-[35%] h-full border-r flex flex-col overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="px-4 py-2 border-b shrink-0" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Ghost Mode</p>
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
          <div className="flex-1 h-full flex flex-col overflow-hidden" style={{ background: 'rgba(5,10,20,0.5)' }}>
            <div className="px-4 py-2 border-b shrink-0" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Live Preview</p>
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
