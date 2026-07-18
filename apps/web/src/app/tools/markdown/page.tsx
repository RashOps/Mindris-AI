"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RENDERER_BASE_URL, apiUrl, jsonHeaders, rendererUrl } from "@/lib/api";
import { fetchCoverLetter } from "@/lib/cover-letters";
import { deleteDraft, loadDraft } from "@/lib/drafts";
import { ToolbarSelect } from "@/components/ToolbarSelect";

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
  blank: "",

  cover_letter: `# Rayhan Touboui
**AI Engineer** · Paris, France · rayhan@email.com · linkedin.com/in/rayhan

---

**À l'attention du service Recrutement**
Paris, le [date]

---

## Objet : Candidature au poste d'Ingénieur IA

Madame, Monsieur,

Passionné par l'intelligence artificielle et les systèmes autonomes, je me permets de vous adresser ma candidature pour le poste d'Ingénieur IA au sein de votre équipe.

Actuellement en formation double diplôme **Data & IA** à Paris School of Technology & Business, j'ai développé une expertise solide en **LangGraph**, **RAG** et déploiement d'architectures multi-agents. Mon projet **Mindris AI** — plateforme d'optimisation de carrière par agents IA — témoigne de ma capacité à mener des projets complexes de bout en bout.

Ce qui me motive particulièrement dans votre organisation, c'est votre approche pragmatique de l'IA appliquée. Je suis convaincu de pouvoir apporter une contribution immédiate et significative à vos équipes.

Dans l'attente d'un entretien, je reste à votre disposition pour tout complément d'information.

Cordialement,

**Rayhan Touboui**
`,

  technical_doc: `# Technical Documentation

## Overview

This document describes the architecture and usage of the system.

## Architecture

The system is composed of three main services:

- **API Gateway** — FastAPI, port 8000
- **Renderer** — Bun/Elysia, port 4000
- **Frontend** — Next.js, port 3000

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/mindrisai/mindris-ai

# Install dependencies
bun install

# Start services
bun run dev
\`\`\`

## API Reference

### POST /render/markdown

Converts Markdown to a PDF document.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| markdown | string | Oui | Markdown content |
| style | string | Non | \`document\` or \`letter\` |
| title | string | Non | Document title |

**Response:** PDF binary stream (\`application/pdf\`)

## Notes

> This service uses Puppeteer for pixel-perfect A4 PDF rendering with Shadow DOM style isolation.
`,
};

type MarkdownDraft = {
  markdown?: string;
  style?: "document" | "letter";
  title?: string;
  cover_letter_id?: number | null;
  job_id?: number | null;
  generated_at?: string | null;
};

type CoverLetterItem = {
  id: number;
  job_id?: number | null;
  markdown_content: string;
  generated_at: string;
};

function defaultDraft() {
  return {
    markdown: TEMPLATES.cover_letter,
    style: "letter" as const,
    title: "Document",
    activeTemplate: "cover_letter" as keyof typeof TEMPLATES,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MarkdownToolPage() {
  const [initialDraft] = useState(defaultDraft);
  const [markdown, setMarkdown] = useState(initialDraft.markdown);
  const [style, setStyle] = useState<"document" | "letter">(initialDraft.style);
  const [title, setTitle] = useState(initialDraft.title);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATES>(
    initialDraft.activeTemplate,
  );
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [coverLetterJobId, setCoverLetterJobId] = useState<number | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [isLoadingLetter, setIsLoadingLetter] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshCoverLetters = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/v1/history/cover-letters"), {
        headers: jsonHeaders(),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { items?: CoverLetterItem[] };
      setCoverLetters(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      // History is optional for the generic Markdown editor.
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshCoverLetters();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshCoverLetters]);

  useEffect(() => {
    let cancelled = false;
    void loadDraft<MarkdownDraft>("markdown")
      .then(async (draft) => {
        if (cancelled || !draft?.markdown) return;
        const nextStyle = draft.style === "document" ? "document" : "letter";
        setMarkdown(draft.markdown);
        setStyle(nextStyle);
        setTitle(draft.title || "Document");
        setCoverLetterId(
          typeof draft.cover_letter_id === "number"
            ? draft.cover_letter_id
            : null,
        );
        setCoverLetterJobId(
          typeof draft.job_id === "number" ? draft.job_id : null,
        );
        setActiveTemplate(nextStyle === "letter" ? "cover_letter" : "blank");
        await deleteDraft("markdown");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const sameJobLetters = coverLetterJobId
    ? coverLetters.filter((item) => item.job_id === coverLetterJobId)
    : [];

  const handleOpenCoverLetter = useCallback(
    async (letterId: number) => {
      setIsLoadingLetter(true);
      setStatus(null);
      try {
        const letter = await fetchCoverLetter(letterId);
        setMarkdown(letter.markdown_content);
        setStyle("letter");
        setTitle(`Lettre de motivation #${letter.id}`);
        setCoverLetterId(letter.id);
        setCoverLetterJobId(
          typeof letter.job_id === "number" ? letter.job_id : null,
        );
        setActiveTemplate("cover_letter");
        setStatus({
          type: "success",
          msg: `Lettre #${letter.id} chargée dans l’éditeur.`,
        });
      } catch (err: unknown) {
        setStatus({
          type: "error",
          msg:
            err instanceof Error
              ? err.message
              : "Chargement de la lettre impossible.",
        });
      } finally {
        setIsLoadingLetter(false);
        setTimeout(() => setStatus(null), 4000);
      }
    },
    [],
  );

  // ── Preview (debounced) ───────────────────────────────────────────────────
  const fetchPreview = useCallback(async (md: string, s: string, t: string) => {
    if (!md.trim()) {
      setPreviewHtml("");
      return;
    }
    setIsLoadingPreview(true);
    try {
      const res = await fetch(rendererUrl("/render/markdown/preview"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ markdown: md, style: s, title: t }),
      });
      if (res.ok) setPreviewHtml(await res.text());
    } catch {
      // renderer not running — preview stays empty
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchPreview(markdown, style, title),
      600,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [markdown, style, title, fetchPreview]);

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!markdown.trim()) return;
    setIsExporting(true);
    setStatus(null);
    try {
      const res = await fetch(rendererUrl("/render/markdown"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ markdown, style, title }),
      });

      if (!res.ok) throw new Error(`Renderer error: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_") || "document"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", msg: "PDF téléchargé." });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Export PDF impossible",
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handleExportDocx = async () => {
    if (!markdown.trim()) return;
    setIsExportingDocx(true);
    setStatus(null);
    try {
      const res = await fetch(apiUrl("/api/v1/markdown/export-docx"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ markdown, title }),
      });
      if (!res.ok) throw new Error(`Export DOCX impossible : ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_") || "document"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", msg: "DOCX téléchargé." });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Export DOCX impossible",
      });
    } finally {
      setIsExportingDocx(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handleSaveCoverLetterVersion = async () => {
    if (!coverLetterId || !markdown.trim()) return;
    setIsSavingVersion(true);
    setStatus(null);
    try {
      const res = await fetch(
        apiUrl(`/api/v1/cover-letter/${coverLetterId}/version`),
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({
            markdown,
            job_id: coverLetterJobId,
          }),
        },
      );
      if (!res.ok) throw new Error(`Save version error: ${res.status}`);
      const data = await res.json();
      if (typeof data.id === "number") setCoverLetterId(data.id);
      if (typeof data.job_id === "number") setCoverLetterJobId(data.job_id);
      await refreshCoverLetters();
      setStatus({ type: "success", msg: "Nouvelle version de lettre sauvegardée." });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : "Sauvegarde impossible",
      });
    } finally {
      setIsSavingVersion(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  // ── Template picker ───────────────────────────────────────────────────────
  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    setActiveTemplate(key);
    setMarkdown(TEMPLATES[key]);
    setCoverLetterId(null);
    setCoverLetterJobId(null);
    if (key === "cover_letter") {
      setStyle("letter");
      setTitle("Lettre de motivation");
    }
    if (key === "technical_doc") {
      setStyle("document");
      setTitle("Technical Documentation");
    }
    if (key === "blank") {
      setStyle("document");
      setTitle("Document");
    }
  };

  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const charCount = markdown.length;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background text-foreground">
      {/* Toast */}
      {status && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg border px-4 py-2.5 text-sm shadow-xl transition-all ${
            status.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Markdown PDF
          </span>
          {coverLetters.length > 0 ? (
            <ToolbarSelect
              value={coverLetterId ? String(coverLetterId) : ""}
              ariaLabel="Charger une lettre persistée"
              placeholder="Charger une lettre"
              options={[
                { value: "", label: "Charger une lettre" },
                ...coverLetters.map((letter) => ({
                  value: String(letter.id),
                  label: `Lettre #${letter.id}`,
                  hint: letter.job_id ? `Job #${letter.job_id}` : "Sans job",
                })),
              ]}
              onChange={(value) => {
                if (!value) return;
                void handleOpenCoverLetter(Number(value));
              }}
              disabled={isLoadingLetter}
              triggerClassName="app-select h-9 min-w-44 px-3 text-xs"
              menuClassName="min-w-56"
            />
          ) : null}
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du document..."
            className="app-input h-9 w-44 px-3 text-sm"
          />

          {/* Style toggle */}
          <div className="flex overflow-hidden rounded-lg border border-border text-xs font-medium">
            {(["document", "letter"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  style === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {s === "document" ? "Document" : "Lettre"}
              </button>
            ))}
          </div>

          {/* Export */}
          {coverLetterId ? (
            <button
              onClick={handleSaveCoverLetterVersion}
              disabled={isSavingVersion || !markdown.trim()}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingVersion ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                  Sauvegarde...
                </>
              ) : (
                <>Sauvegarder une nouvelle version</>
              )}
            </button>
          ) : null}

          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx || !markdown.trim()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExportingDocx ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                Génération...
              </>
            ) : (
              <>↓ Export DOCX</>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || !markdown.trim()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                Génération...
              </>
            ) : (
              <>↓ Export PDF</>
            )}
          </button>
        </div>
      </header>

      {/* ── Template bar ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Template :
        </span>
        {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map(
          (key) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeTemplate === key
                  ? "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {key === "blank" && "Vide"}
              {key === "cover_letter" && "Lettre"}
              {key === "technical_doc" && "Doc technique"}
            </button>
          ),
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {wordCount} mots · {charCount} caractères
        </div>
      </div>

      {coverLetterId ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span>
            Lettre active :{" "}
            <span className="font-semibold text-foreground">#{coverLetterId}</span>
          </span>
          <span>
            Job :{" "}
            <span className="font-semibold text-foreground">
              {coverLetterJobId ? `#${coverLetterJobId}` : "non lié"}
            </span>
          </span>
          <span>
            Versions même job :{" "}
            <span className="font-semibold text-foreground">
              {sameJobLetters.length}
            </span>
          </span>
          {sameJobLetters.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1">
              {sameJobLetters.slice(0, 5).map((letter) => (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => void handleOpenCoverLetter(letter.id)}
                  className={`rounded-full border px-2 py-0.5 font-medium transition-colors ${
                    letter.id === coverLetterId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  #{letter.id}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Editor / Preview split ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Markdown editor */}
        <div className="flex h-full w-1/2 flex-col border-r border-border bg-card">
          <div className="border-b border-border bg-card px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Éditeur Markdown
            </p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            placeholder={`# Commence à écrire...\n\nSupporte le **Markdown GFM** — titres, listes, blocs de code, tableaux, citations.\n\nChoisis un template au-dessus pour démarrer vite.`}
            className="flex-1 w-full resize-none bg-background p-5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus:outline-none"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>

        {/* Right — Live preview */}
        <div className="flex h-full w-1/2 flex-col bg-muted/40">
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Preview live
            </p>
            {isLoadingPreview && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                Rendu...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full rounded-lg border border-border bg-white shadow-sm"
                title="Markdown Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                {!markdown.trim() ? (
                  <>
                    <svg
                      className="mb-4 h-12 w-12 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm font-medium text-foreground">
                      Commence à écrire ou choisis un template
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      La preview se met à jour automatiquement
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Connexion au renderer...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────────── */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-card px-4">
        <span className="text-xs text-muted-foreground">
          Style :{" "}
          <span className="font-medium capitalize text-foreground">
            {style}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Renderer :{" "}
          <span className="font-medium text-foreground">
            {RENDERER_BASE_URL}
          </span>
        </span>
        {coverLetterId ? (
          <span className="text-xs text-muted-foreground">
            Lettre :{" "}
            <span className="font-medium text-foreground">
              #{coverLetterId}
            </span>
            {coverLetterJobId ? (
              <>
                {" "}
                · Job{" "}
                <span className="font-medium text-foreground">
                  #{coverLetterJobId}
                </span>
              </>
            ) : null}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          Markdown Converter
        </span>
      </div>
    </div>
  );
}
