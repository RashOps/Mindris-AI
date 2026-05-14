"use client";

import { Editor } from "@/components/Editor";
import { LivePreview } from "@/components/LivePreview";
import { GhostMode } from "@/components/GhostMode";
import { StylePanel } from "@/components/StylePanel";
import { JobInsightsPanel } from "@/components/JobInsightsPanel";
import { useCVStore } from "@/store/useCVStore";
import type { JobInsights } from "@/store/useCVStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const API = "http://localhost:8000";
const RENDERER = "http://localhost:4000";

export default function AppPage() {
  const {
    setIsOptimizing, replaceCVData, cvData,
    setJobInsights, jobInsights,
    updateSkillGroup, updateExperience,
    appSettings,
  } = useCVStore();

  const [jobUrl, setJobUrl]       = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);

  const pdfInputRef  = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ms = 4000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // ── dnd-kit sensors ────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // ── Global drag end handler ────────────────────────────────────────────────
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dragData  = active.data.current as any;
    const dropData  = over.data.current   as any;

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
  const handleJobResult = useCallback((data: any) => {
    const insights: JobInsights = {
      job_title:       data.job_title      ?? "Unknown Role",
      company:         data.company        ?? "",
      hard_skills:     data.hard_skills    ?? [],
      soft_skills:     data.soft_skills    ?? [],
      drafted_bullets: data.drafted_bullets ?? [],
      raw_markdown:    data.raw_markdown   ?? "",
      score:           data.score          ?? 0,
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
      const res = await fetch(`${API}/api/v1/cv/upload-pdf`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Upload failed"); }
      const data = await res.json();
      if (data.cv_data) replaceCVData(data.cv_data);
      showToast("✅ PDF indexed! Editor and RAG updated.");
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 6000);
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
      replaceCVData(jsonData);
      await fetch(`${API}/api/v1/cv/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });
      showToast("✅ JSON CV indexed!");
    } catch {
      showToast("❌ Failed to parse or upload JSON.", 5000);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = "";
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    showToast("⏳ Generating PDF…", 30000);
    try {
      const res = await fetch(`${RENDERER}/render/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_data: cvData, template_id: "modern", return_buffer: true }),
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
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 5000);
    }
  };

  // ── Optimize ───────────────────────────────────────────────────────────────
  const handleOptimize = async () => {
    if (!jobUrl.trim()) return;
    setIsOptimizing(true);
    setShowGhost(true);
    setJobId(null);
    try {
      const res = await fetch(`${API}/api/v1/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_url:    jobUrl,
          provider:   appSettings.optimize_llm.provider,
          model_name: appSettings.optimize_llm.model_name,
        }),
      });
      if (!res.ok) throw new Error("Failed to start pipeline");
      const data = await res.json();
      setJobId(data.job_id);
    } catch (err: any) {
      showToast(`❌ ${err.message}`, 5000);
      setIsOptimizing(false);
      setShowGhost(false);
    }
  };

  const handleGhostDone  = () => { setIsOptimizing(false); showToast("🎉 CV optimized! Check the preview →"); };
  const handleGhostError = () => { setIsOptimizing(false); showToast("❌ Pipeline failed.", 6000); };

  const { isOptimizing } = useCVStore();

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main className="flex h-screen w-full flex-col bg-white overflow-hidden">

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm shadow-xl max-w-sm animate-in slide-in-from-top-2 duration-300">
            {toast}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-white shrink-0 z-30">
          <Link href="/" className="flex items-center gap-2 no-underline shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
              style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}>M</div>
            <span className="font-bold text-slate-800 text-sm">Mindris AI</span>
          </Link>

          {/* Job URL */}
          <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOptimize()}
              placeholder="Paste job offer URL…"
              className="text-sm"
            />
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing || !jobUrl.trim()}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4"
            >
              {isOptimizing
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</span>
                : "⚡ Optimize"
              }
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <input type="file" accept=".pdf"  className="hidden" ref={pdfInputRef}  onChange={handlePdfUpload} />
            <input type="file" accept=".json" className="hidden" ref={jsonInputRef} onChange={handleJsonUpload} />

            <button onClick={() => pdfInputRef.current?.click()} disabled={isUploading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors">
              {isUploading ? <span className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" /> : "📄"} PDF
            </button>

            <button onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
              {"{ }"} JSON
            </button>

            <button onClick={() => setShowGhost((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showGhost ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
              👻 Ghost
            </button>

            <button onClick={() => setShowInsights((v) => !v)}
              className={`relative inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showInsights ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
              💼 Insights
              {jobInsights && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>

            <button onClick={() => setShowStyle((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showStyle ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
              🎨 Style
            </button>

            <button onClick={handleExportPDF}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
              ↓ Export
            </button>
          </div>
        </header>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Editor */}
          <div className={`h-full border-r bg-slate-50/50 flex flex-col overflow-hidden transition-all duration-300 ${showGhost ? "w-[30%]" : "w-[45%]"}`}>
            <div className="px-4 py-2 border-b bg-white shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Structure Editor</p>
            </div>
            <div className="flex-1 overflow-hidden px-3 py-3">
              <Editor />
            </div>
          </div>

          {/* Ghost Mode */}
          {showGhost && (
            <div className="w-[35%] h-full border-r flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b bg-white shrink-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ghost Mode</p>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <GhostMode
                  jobId={jobId}
                  onDone={handleGhostDone}
                  onError={handleGhostError}
                  onJobResult={handleJobResult}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 h-full bg-slate-100/50 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b bg-white shrink-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <LivePreview />
            </div>
          </div>
        </div>

        {/* Drawers (outside main flow) */}
        <StylePanel     open={showStyle}    onClose={() => setShowStyle(false)} />
        <JobInsightsPanel open={showInsights} onClose={() => setShowInsights(false)} />

      </main>
    </DndContext>
  );
}
