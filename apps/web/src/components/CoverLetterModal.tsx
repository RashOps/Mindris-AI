"use client";

import { useState } from "react";
import { useCVStore } from "@/store/useCVStore";
import { LLMSelector } from "@/components/LLMSelector";
import { useRouter } from "next/navigation";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { saveDraft } from "@/lib/drafts";
import { ArrowRight, X } from "lucide-react";

// ── Component ─────────────────────────────────────────────────────────────────

interface CoverLetterModalProps {
  open: boolean;
  onClose: () => void;
}

export function CoverLetterModal({ open, onClose }: CoverLetterModalProps) {
  const { cvData, jobInsights, appSettings } = useCVStore();
  const router = useRouter();

  const [instructions, setInstructions] = useState("");
  const [exampleLetter, setExampleLetter] = useState("");
  const [showExample, setShowExample] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    const insights = jobInsights ?? {
      job_title: "Unknown Role",
      company: "the company",
      hard_skills: [],
      soft_skills: [],
      drafted_bullets: [],
      raw_markdown: "",
      score: 0,
    };

    try {
      const res = await fetch(apiUrl("/api/v1/cover-letter"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          cv_data: cvData,
          job_insights: insights,
          instructions,
          example_letter: exampleLetter || null,
          provider: appSettings.cover_letter_llm.provider,
          model_name: appSettings.cover_letter_llm.model_name,
          job_id: jobInsights?.job_id ?? jobInsights?.job_record_id ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Generation failed");
      }

      const data = await res.json();
      if (!data.markdown) throw new Error("Empty response from server");

      await saveDraft("markdown", {
        markdown: data.markdown,
        style: "letter",
        title: "Lettre de motivation",
        cover_letter_id: typeof data.id === "number" ? data.id : null,
        job_id: typeof data.job_id === "number" ? data.job_id : null,
        generated_at:
          typeof data.generated_at === "string" ? data.generated_at : null,
      });

      onClose();
      router.push("/tools/markdown");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  const job = jobInsights;

  // ── shared input style ────────────────────────────────────────────────────
  const inputStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0",
  };
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
          style={{
            background: "rgba(10,15,26,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.7)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(37,99,235,0.08))",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <h2
                className="text-sm font-bold flex items-center gap-2"
                style={{ color: "#f1f5f9", fontFamily: "var(--font-space)" }}
              >
                Cover Letter Generator
              </h2>
              {job && (
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  For:{" "}
                  <span className="font-medium" style={{ color: "#94a3b8" }}>
                    {job.job_title}
                  </span>
                  {job.company && <> @ {job.company}</>}
                </p>
              )}
              {!job && (
                <p className="text-xs mt-0.5" style={{ color: "#f59e0b" }}>
                  No job scraped yet — letter will be generic
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Instructions */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "#94a3b8" }}
              >
                Instructions{" "}
                <span className="font-normal" style={{ color: "#475569" }}>
                  (optionnel)
                </span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ex : Ton formel, mets en avant Python et LangGraph, 3 paragraphes max, en français…"
                rows={3}
                className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none resize-none"
                style={{ ...inputStyle, fontFamily: "var(--font-body)" }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(139,92,246,0.5)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                }
              />
            </div>

            {/* Example letter (collapsible) */}
            <div>
              <button
                onClick={() => setShowExample((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold mb-1.5 transition-colors"
                style={{ color: "#64748b" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                <span
                  className={`transition-transform ${showExample ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                Exemple de lettre{" "}
                <span className="font-normal" style={{ color: "#334155" }}>
                  (guide de style, optionnel)
                </span>
              </button>
              {showExample && (
                <textarea
                  value={exampleLetter}
                  onChange={(e) => setExampleLetter(e.target.value)}
                  placeholder="Collez une ancienne lettre ici. L'agent analysera son ton, sa structure et sa longueur pour les reproduire."
                  rows={5}
                  className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none resize-none"
                  style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(139,92,246,0.5)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                  }
                />
              )}
            </div>

            {/* LLM Selector */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "#94a3b8" }}
              >
                Modèle IA
              </label>
              <LLMSelector
                taskKey="cover_letter_llm"
                label="Modèle de rédaction"
              />
              <p className="text-[10px] mt-1" style={{ color: "#64748b" }}>
                La liste et la disponibilité sont synchronisées par le backend.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-xs"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 shrink-0 flex items-center gap-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(15,23,42,0.6)",
            }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{ color: "#475569" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #2563eb)",
                boxShadow: "0 0 20px rgba(124,58,237,0.3)",
              }}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Génération en cours…
                </>
              ) : (
                <>
                  Générer la lettre
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  Ouvrir dans l&apos;éditeur
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
