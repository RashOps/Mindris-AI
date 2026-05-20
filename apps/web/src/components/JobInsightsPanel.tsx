"use client";

import { useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useCVStore } from "@/store/useCVStore";
import type { JobInsights } from "@/store/useCVStore";

const API = "http://localhost:8000";

// ── Draggable Skill Tag ────────────────────────────────────────────────────────

function DraggableSkill({ skill, type }: { skill: string; type: "hard" | "soft" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `skill::${skill}`,
    data: { kind: "skill", skill, type },
  });

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-grab border transition-all select-none
        ${type === "hard"
          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
        }
        ${isDragging ? "opacity-50 scale-95 ring-2 ring-blue-400" : ""}
      `}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 } : undefined}
    >
      ⠿ {skill}
    </span>
  );
}

// ── Draggable Bullet ──────────────────────────────────────────────────────────

function DraggableBullet({ bullet, index }: { bullet: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bullet::${index}`,
    data: { kind: "bullet", bullet },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex items-start gap-2 p-2.5 rounded-lg border bg-white cursor-grab text-xs text-slate-700 transition-all select-none
        ${isDragging ? "opacity-50 ring-2 ring-blue-400 scale-95" : "hover:border-blue-200 hover:bg-blue-50"}
      `}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 } : undefined}
    >
      <span className="text-slate-300 group-hover:text-blue-400 shrink-0 mt-0.5">⠿</span>
      <span className="leading-relaxed">{bullet}</span>
    </div>
  );
}

// ── LLM Selector ──────────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: "groq",    label: "Groq" },
  { id: "gemini",  label: "Gemini" },
  { id: "openai",  label: "OpenAI" },
  { id: "mistral", label: "Mistral" },
];
const MODELS: Record<string, { id: string; label: string }[]> = {
  groq:    [{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }, { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" }],
  gemini:  [{ id: "gemini-2.0-flash", label: "Gemini Flash" }, { id: "gemini-1.5-pro", label: "Gemini Pro" }],
  openai:  [{ id: "gpt-4o", label: "GPT-4o" }, { id: "gpt-4o-mini", label: "GPT-4o Mini" }],
  mistral: [{ id: "mistral-large-latest", label: "Mistral Large" }, { id: "mistral-small-latest", label: "Mistral Small" }],
};

// ── Main Panel ────────────────────────────────────────────────────────────────

interface JobInsightsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function JobInsightsPanel({ open, onClose }: JobInsightsPanelProps) {
  const {
    jobInsights, clearJobInsights,
    autoInjectMode, setAutoInjectMode,
    applyPatch, cvData, appSettings, setAppSettings,
    calculateAtsScore,
  } = useCVStore();

  const [isPatchLoading, setIsPatchLoading] = useState(false);
  const [patchStatus, setPatchStatus] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [provider, setProvider] = useState(appSettings.patch_llm.provider);
  const [modelName, setModelName] = useState(appSettings.patch_llm.model_name);

  const handleAutoInjectToggle = (v: boolean) => {
    setAutoInjectMode(v);
    setAppSettings({ patch_llm: { provider, model_name: modelName } });
  };

  const triggerPatch = useCallback(async (bullets: string[]) => {
    if (!bullets.length) return;
    setIsPatchLoading(true);
    setPatchStatus(null);
    try {
      const res = await fetch(`${API}/api/v1/cv/patch-from-bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drafted_bullets: bullets,
          cv_data: cvData,
          provider,
          model_name: modelName,
        }),
      });
      if (!res.ok) throw new Error("Patch failed");
      const data = await res.json();
      if (data.patch) {
        applyPatch(data.patch);
        setPatchStatus("✅ CV patched successfully!");
      }
    } catch (err: any) {
      setPatchStatus(`❌ ${err.message}`);
    } finally {
      setIsPatchLoading(false);
      setTimeout(() => setPatchStatus(null), 4000);
    }
  }, [cvData, provider, modelName, applyPatch]);

  const copyToClipboard = () => {
    if (!jobInsights) return;
    navigator.clipboard.writeText(jobInsights.raw_markdown);
    setPatchStatus("📋 Copied to clipboard!");
    setTimeout(() => setPatchStatus(null), 2000);
  };

  const openInMarkdown = () => {
    if (!jobInsights) return;
    localStorage.setItem("md_draft", jobInsights.raw_markdown);
    window.open("/tools/markdown", "_blank");
  };

  const scoreColor = jobInsights
    ? jobInsights.score >= 80 ? "text-green-600" : jobInsights.score >= 60 ? "text-amber-500" : "text-red-500"
    : "text-slate-400";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 pointer-events-none" />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-50 w-80 bg-white border-l border-slate-200 shadow-2xl
          flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">💼</span>
            <h2 className="text-sm font-semibold text-slate-800">Job Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
          >✕</button>
        </div>

        {/* No insights yet */}
        {!jobInsights ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-2xl">🎯</div>
            <div>
              <p className="text-sm font-medium text-slate-600">No job insights yet</p>
              <p className="text-xs mt-1">Paste a job URL and click ⚡ Optimize to generate tailored content.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Job summary */}
            <div className="px-4 py-3 bg-slate-50 border-b flex flex-col gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">{jobInsights.job_title}</p>
                <p className="text-xs text-slate-500">{jobInsights.company}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold ${scoreColor}`}>
                  ATS Match: {jobInsights.score}/100
                </p>
                <button
                  onClick={async () => {
                    setIsScoring(true);
                    await calculateAtsScore();
                    setIsScoring(false);
                  }}
                  disabled={isScoring}
                  className="px-2 py-1 text-[10px] font-medium bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  {isScoring ? <span className="w-2 h-2 border border-slate-600 border-t-transparent rounded-full animate-spin" /> : "🏅"}
                  Score my CV
                </button>
              </div>
              {jobInsights.ats_report && (
                <button
                  onClick={() => {
                    localStorage.setItem("ats_report", JSON.stringify(jobInsights.ats_report));
                    window.open("/tools/ats-score", "_blank");
                  }}
                  className="w-full mt-1 py-1.5 text-xs font-semibold bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-2"
                >
                  📊 View Detailed Report
                </button>
              )}
            </div>

            {/* Auto-inject mode */}
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Mode Auto</p>
                  <p className="text-[10px] text-slate-400">LLM patch directly into editor</p>
                </div>
                <button
                  onClick={() => handleAutoInjectToggle(!autoInjectMode)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    autoInjectMode ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    autoInjectMode ? "translate-x-5" : "translate-x-0.5"
                  }`} />
                </button>
              </div>

              {/* LLM selector for patch */}
              <div className="flex gap-1.5 mt-2">
                <select
                  value={provider}
                  onChange={(e) => { setProvider(e.target.value as any); setModelName(MODELS[e.target.value][0].id); }}
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none"
                >
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none"
                >
                  {(MODELS[provider] ?? []).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>

              <button
                onClick={() => triggerPatch(jobInsights.drafted_bullets)}
                disabled={isPatchLoading}
                className="w-full mt-2 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isPatchLoading
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Patching…</>
                  : "⚡ Apply to CV"
                }
              </button>
              {patchStatus && <p className="text-xs text-center mt-1.5 text-slate-600">{patchStatus}</p>}
            </div>

            {/* Hard Skills */}
            {jobInsights.hard_skills.length > 0 && (
              <div className="px-4 py-3 border-b">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  🎯 Required Skills — drag → Skills section
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jobInsights.hard_skills.map(s => (
                    <DraggableSkill key={s} skill={s} type="hard" />
                  ))}
                </div>
              </div>
            )}

            {/* Soft Skills */}
            {jobInsights.soft_skills.length > 0 && (
              <div className="px-4 py-3 border-b">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  💬 Soft Skills — drag → Skills section
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jobInsights.soft_skills.map(s => (
                    <DraggableSkill key={s} skill={s} type="soft" />
                  ))}
                </div>
              </div>
            )}

            {/* Drafted Bullets */}
            {jobInsights.drafted_bullets.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  ✍️ AI Bullets — drag → Experience
                </p>
                <div className="space-y-1.5">
                  {jobInsights.drafted_bullets.map((bullet, i) => (
                    <DraggableBullet key={i} bullet={bullet} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        {jobInsights && (
          <div className="px-4 py-3 border-t bg-white shrink-0 flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              📋 Copy
            </button>
            <button
              onClick={openInMarkdown}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              → Markdown
            </button>
            <button
              onClick={() => { clearJobInsights(); }}
              className="py-1.5 px-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
              title="Clear"
            >✕</button>
          </div>
        )}
      </aside>
    </>
  );
}
