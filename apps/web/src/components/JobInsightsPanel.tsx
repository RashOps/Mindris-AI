"use client";

import { useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useCVStore } from "@/store/useCVStore";
import type { LLMProvider } from "@/store/useCVStore";
import { AtsScoreWidget } from "@/components/ats/AtsScoreWidget";
import { apiUrl, jsonHeaders } from "@/lib/api";



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
      <span style={{ color: '#475569' }} className="shrink-0 mt-0.5">⠿</span>
      <span className="leading-relaxed" style={{ color: '#94a3b8' }}>{bullet}</span>
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

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
      const res = await fetch(apiUrl("/api/v1/cv/patch-from-bullets"), {
        method: "POST",
        headers: jsonHeaders(),
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
    } catch (err: unknown) {
      setPatchStatus(`❌ ${errorMessage(err, "Patch failed")}`);
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

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 pointer-events-none" />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-50 w-80 flex flex-col transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: 'rgba(10,15,26,0.97)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.8)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">💼</span>
            <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9', fontFamily: 'var(--font-space)' }}>Job Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-sm transition-colors"
            style={{ color: '#475569' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >✕</button>
        </div>

        {/* No insights yet */}
        {!jobInsights ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3" style={{ color: '#334155' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>🎯</div>
            <div>
              <p className="text-sm font-medium" style={{ color: '#64748b' }}>No job insights yet</p>
              <p className="text-xs mt-1" style={{ color: '#334155' }}>Paste a job URL and click ⚡ Optimize to generate tailored content.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Job summary */}
            <div className="px-4 py-3 flex flex-col gap-2" style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{jobInsights.job_title}</p>
                <p className="text-xs" style={{ color: '#64748b' }}>{jobInsights.company}</p>
              </div>
              {/* ATS Score widget */}
              <AtsScoreWidget
                score={jobInsights.score}
                onClick={() => {
                  if (jobInsights.ats_report) {
                    localStorage.setItem("ats_report", JSON.stringify(jobInsights.ats_report));
                  }
                  window.open("/tools/ats-score", "_blank");
                }}
              />
              {/* Score my CV button */}
              <button
                onClick={async () => {
                  setIsScoring(true);
                  await calculateAtsScore();
                  setIsScoring(false);
                }}
                disabled={isScoring}
                className="w-full py-1.5 text-[10px] font-medium rounded border disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
              >
                {isScoring ? <span className="w-2 h-2 border border-slate-500 border-t-transparent rounded-full animate-spin" /> : "🏅"}
                Deep Score my CV
              </button>
            </div>

            {/* Auto-inject mode */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#cbd5e1' }}>Mode Auto</p>
                  <p className="text-[10px]" style={{ color: '#475569' }}>LLM patch directly into editor</p>
                </div>
                <button
                  onClick={() => handleAutoInjectToggle(!autoInjectMode)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: autoInjectMode ? '#7c3aed' : 'rgba(255,255,255,0.12)' }}
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
                  onChange={(e) => {
                    const nextProvider = e.target.value as LLMProvider;
                    setProvider(nextProvider);
                    setModelName(MODELS[nextProvider]?.[0]?.id ?? modelName);
                  }}
                  className="flex-1 text-xs rounded px-2 py-1 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {PROVIDERS.map(p => <option key={p.id} value={p.id} style={{ background: '#0a0f1a' }}>{p.label}</option>)}
                </select>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="flex-1 text-xs rounded px-2 py-1 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  {(MODELS[provider] ?? []).map(m => <option key={m.id} value={m.id} style={{ background: '#0a0f1a' }}>{m.label}</option>)}
                </select>
              </div>

              <button
                onClick={() => triggerPatch(jobInsights.drafted_bullets)}
                disabled={isPatchLoading}
                className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', boxShadow: '0 0 12px rgba(37,99,235,0.25)' }}
              >
                {isPatchLoading
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Patching…</>
                  : "⚡ Apply to CV"
                }
              </button>
              {patchStatus && <p className="text-xs text-center mt-1.5" style={{ color: '#64748b' }}>{patchStatus}</p>}
            </div>


            {/* Company Intel */}
            {jobInsights.company_insight && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  🏢 Company Intel
                </p>
                <div className="space-y-1 text-xs" style={{ color: '#94a3b8' }}>
                  <p><span style={{ color: '#cbd5e1' }}>Industry:</span> {jobInsights.company_insight.industry}</p>
                  <p><span style={{ color: '#cbd5e1' }}>Size:</span> {jobInsights.company_insight.size}</p>
                  {jobInsights.company_insight.unavailable_reason && <p>{jobInsights.company_insight.unavailable_reason}</p>}
                  {jobInsights.company_insight.culture_values?.length > 0 && <p>Values: {jobInsights.company_insight.culture_values.join(', ')}</p>}
                  {jobInsights.company_insight.tech_stack_known?.length > 0 && <p>Known stack: {jobInsights.company_insight.tech_stack_known.join(', ')}</p>}
                </div>
              </div>
            )}
            {/* Hard Skills */}
            {jobInsights.hard_skills.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
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
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
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
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
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
          <div className="px-4 py-3 shrink-0 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(15,23,42,0.6)' }}>
            <button
              onClick={copyToClipboard}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', background: 'rgba(255,255,255,0.03)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              📋 Copy
            </button>
            <button
              onClick={openInMarkdown}
              className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', background: 'rgba(255,255,255,0.03)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              → Markdown
            </button>
            <button
              onClick={() => { clearJobInsights(); }}
              className="py-1.5 px-2 text-xs transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              title="Clear"
            >✕</button>
          </div>
        )}
      </aside>
    </>
  );
}
