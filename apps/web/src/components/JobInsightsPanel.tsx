"use client";

import { useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useCVStore } from "@/store/useCVStore";
import type { LLMProvider } from "@/store/useCVStore";
import { AtsScoreWidget } from "@/components/ats/AtsScoreWidget";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { saveDraft } from "@/lib/drafts";



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

function provenanceTone(value?: string): string {
  switch (value) {
    case "verified":
      return "#10b981";
    case "derived":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface JobInsightsPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "embedded";
}

export function JobInsightsPanel({ open, onClose, variant = "drawer" }: JobInsightsPanelProps) {
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

  const openInMarkdown = async () => {
    if (!jobInsights) return;
    await saveDraft("markdown", {
      markdown: jobInsights.raw_markdown,
      style: "document",
      title: "Job Insights",
    });
    window.open("/tools/markdown", "_blank");
  };

  if (!open) return null;

  const isEmbedded = variant === "embedded";

  return (
    <>
      {!isEmbedded && <div className="fixed inset-0 z-40 pointer-events-none" />}
      <aside
        className={`theme-dark-tool flex h-full w-full flex-col bg-slate-950 ${
          isEmbedded
            ? "border-0"
            : "fixed top-0 right-0 z-50 w-80 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out"
        }`}
        style={isEmbedded ? undefined : { boxShadow: "-8px 0 40px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💼</span>
            <h2 className="text-sm font-semibold text-slate-100" style={{ fontFamily: "var(--font-space)" }}>Job Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-500 transition-colors hover:text-slate-200"
          >✕</button>
        </div>

        {/* No insights yet */}
        {!jobInsights ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl">🎯</div>
            <div>
              <p className="text-sm font-medium text-slate-400">No job insights yet</p>
              <p className="mt-1 text-xs text-slate-500">Paste a job URL and click Optimize to generate tailored content.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Job summary */}
            <div className="flex flex-col gap-2 border-b border-white/10 bg-slate-900/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{jobInsights.job_title}</p>
                <p className="text-xs text-slate-400">{jobInsights.company}</p>
              </div>
              {/* ATS Score widget */}
              <AtsScoreWidget
                score={jobInsights.score}
                onClick={() => {
                  void (async () => {
                    if (jobInsights.ats_report) {
                      await saveDraft("ats-report", {
                        report: jobInsights.ats_report,
                      });
                    }
                    window.open("/tools/ats-score", "_blank");
                  })();
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
                className="flex w-full items-center justify-center gap-1 rounded border border-white/10 bg-white/5 py-1.5 text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {isScoring ? <span className="w-2 h-2 border border-slate-500 border-t-transparent rounded-full animate-spin" /> : "🏅"}
                Deep Score my CV
              </button>
            </div>

            {/* Auto-inject mode */}
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Mode Auto</p>
                  <p className="text-[10px] text-slate-500">LLM patch directly into editor</p>
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
                  className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  {PROVIDERS.map(p => <option key={p.id} value={p.id} style={{ background: '#0a0f1a' }}>{p.label}</option>)}
                </select>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none"
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
              {patchStatus && <p className="mt-1.5 text-center text-xs text-slate-400">{patchStatus}</p>}
            </div>


            {/* Company Intel */}
            {jobInsights.company_insight && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  🏢 Company Intel
                </p>
                <div className="space-y-2 text-xs" style={{ color: '#94a3b8' }}>
                  <p><span style={{ color: '#cbd5e1' }}>Industry:</span> {jobInsights.company_insight.industry}</p>
                  <p><span style={{ color: '#cbd5e1' }}>Size:</span> {jobInsights.company_insight.size}</p>
                  {jobInsights.company_insight.work_mode && (
                    <p><span style={{ color: '#cbd5e1' }}>Work mode:</span> {jobInsights.company_insight.work_mode}</p>
                  )}
                  {jobInsights.company_insight.canonical_domain && (
                    <p><span style={{ color: '#cbd5e1' }}>Domain:</span> {jobInsights.company_insight.canonical_domain}</p>
                  )}
                  {jobInsights.company_insight.unavailable_reason && <p>{jobInsights.company_insight.unavailable_reason}</p>}
                  {jobInsights.company_insight.culture_values?.length > 0 && <p>Values: {jobInsights.company_insight.culture_values.join(', ')}</p>}
                  {jobInsights.company_insight.tech_stack_known?.length > 0 && <p>Known stack: {jobInsights.company_insight.tech_stack_known.join(', ')}</p>}
                  {jobInsights.company_insight.provenance && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Provenance
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(jobInsights.company_insight.provenance).slice(0, 6).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: provenanceTone(value),
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobInsights.company_insight.role_fit && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Role fit
                      </p>
                      {jobInsights.company_insight.role_fit.skills_to_foreground?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>Foreground:</span> {jobInsights.company_insight.role_fit.skills_to_foreground.join(', ')}</p>
                      ) : null}
                      {jobInsights.company_insight.role_fit.wording_to_mirror?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>Mirror:</span> {jobInsights.company_insight.role_fit.wording_to_mirror.join(', ')}</p>
                      ) : null}
                      {jobInsights.company_insight.role_fit.cv_emphasis?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>CV:</span> {jobInsights.company_insight.role_fit.cv_emphasis.join(' ')}</p>
                      ) : null}
                    </div>
                  )}
                  {jobInsights.company_insight.risk_flags && jobInsights.company_insight.risk_flags.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Risks & unknowns
                      </p>
                      <div className="space-y-1.5">
                        {jobInsights.company_insight.risk_flags.slice(0, 3).map((risk) => (
                          <div
                            key={risk.code}
                            className="rounded-lg px-2 py-1.5"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <p className="text-[11px] font-semibold" style={{ color: '#e2e8f0' }}>
                              {risk.title}
                            </p>
                            <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                              {risk.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          <div className="flex shrink-0 gap-2 border-t border-white/10 bg-slate-900/70 px-4 py-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10"
            >
              📋 Copy
            </button>
            <button
              onClick={() => {
                void openInMarkdown();
              }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10"
            >
              → Markdown
            </button>
            <button
              onClick={() => { clearJobInsights(); }}
              className="px-2 py-1.5 text-xs text-slate-500 transition-colors hover:text-rose-400"
              title="Clear"
            >✕</button>
          </div>
        )}
      </aside>
    </>
  );
}
