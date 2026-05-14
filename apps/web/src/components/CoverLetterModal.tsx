"use client";

import { useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import type { LLMProvider } from "@/store/useCVStore";
import { useRouter } from "next/navigation";

const API = "http://localhost:8000";

// ── LLM options ───────────────────────────────────────────────────────────────

const PROVIDERS: { id: LLMProvider; label: string }[] = [
  { id: "gemini",  label: "Gemini" },
  { id: "groq",    label: "Groq" },
  { id: "openai",  label: "OpenAI" },
  { id: "mistral", label: "Mistral" },
];

const MODELS: Record<string, { id: string; label: string }[]> = {
  gemini:  [{ id: "gemini-2.0-flash", label: "Gemini 2.0 Flash ⚡" }, { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" }],
  groq:    [{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }, { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" }],
  openai:  [{ id: "gpt-4o", label: "GPT-4o" }, { id: "gpt-4o-mini", label: "GPT-4o Mini" }],
  mistral: [{ id: "mistral-large-latest", label: "Mistral Large" }, { id: "mistral-small-latest", label: "Mistral Small" }],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
}

export function CoverLetterModal({ open, onClose }: CoverLetterModalProps) {
  const { cvData, jobInsights, appSettings, setAppSettings } = useCVStore();
  const router = useRouter();

  const [instructions,   setInstructions]   = useState("");
  const [exampleLetter,  setExampleLetter]   = useState("");
  const [showExample,    setShowExample]     = useState(false);
  const [isGenerating,   setIsGenerating]    = useState(false);
  const [error,          setError]           = useState<string | null>(null);

  const [provider,   setProvider]   = useState<LLMProvider>(appSettings.cover_letter_llm.provider);
  const [modelName,  setModelName]  = useState(appSettings.cover_letter_llm.model_name);

  const handleProviderChange = (p: LLMProvider) => {
    setProvider(p);
    setModelName(MODELS[p][0].id);
    setAppSettings({ cover_letter_llm: { provider: p, model_name: MODELS[p][0].id } });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    // Build job_insights — use store data or minimal fallback
    const insights = jobInsights ?? {
      job_title:       "Unknown Role",
      company:         "the company",
      hard_skills:     [],
      soft_skills:     [],
      drafted_bullets: [],
      raw_markdown:    "",
      score:           0,
    };

    try {
      const res = await fetch(`${API}/api/v1/cover-letter`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          cv_data:        cvData,
          job_insights:   insights,
          instructions,
          example_letter: exampleLetter || null,
          provider,
          model_name: modelName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Generation failed");
      }

      const data = await res.json();
      if (!data.markdown) throw new Error("Empty response from server");

      // Store the draft and navigate to the Markdown tool
      localStorage.setItem("md_draft",       data.markdown);
      localStorage.setItem("md_draft_style", "letter");
      localStorage.setItem("md_draft_title", "Lettre de motivation");

      onClose();
      router.push("/tools/markdown");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  const job = jobInsights;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-blue-50 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                ✉️ Cover Letter Generator
              </h2>
              {job && (
                <p className="text-xs text-slate-500 mt-0.5">
                  For: <span className="font-medium text-slate-700">{job.job_title}</span>
                  {job.company && <> @ {job.company}</>}
                </p>
              )}
              {!job && (
                <p className="text-xs text-amber-600 mt-0.5">
                  ⚠️ No job scraped yet — letter will be generic
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                📝 Instructions <span className="font-normal text-slate-400">(optionnel)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex : Ton formel, mets en avant Python et LangGraph, 3 paragraphes max, en français…"
                rows={3}
                className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder:text-slate-300"
              />
            </div>

            {/* Example letter (collapsible) */}
            <div>
              <button
                onClick={() => setShowExample((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5 hover:text-slate-800 transition-colors"
              >
                <span className={`transition-transform ${showExample ? "rotate-90" : ""}`}>▶</span>
                📋 Exemple de lettre <span className="font-normal text-slate-400">(guide de style, optionnel)</span>
              </button>
              {showExample && (
                <textarea
                  value={exampleLetter}
                  onChange={(e) => setExampleLetter(e.target.value)}
                  placeholder="Collez une ancienne lettre ici. L'agent analysera son ton, sa structure et sa longueur pour les reproduire."
                  rows={5}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none placeholder:text-slate-300 font-mono"
                />
              )}
            </div>

            {/* LLM Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                🤖 Modèle IA
              </label>
              <div className="flex gap-2">
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                  className="flex-1 h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="flex-1 h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                >
                  {(MODELS[provider] ?? []).map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Groq Llama 3.3 70B recommandé — rapide et gratuit. Gemini Flash si quota disponible.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                ❌ {error}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 shrink-0 flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>✉️ Générer la lettre → Ouvrir dans l'éditeur</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
