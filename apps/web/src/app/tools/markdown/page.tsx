"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RENDERER_BASE_URL, apiUrl, jsonHeaders, rendererUrl } from "@/lib/api";
import { deleteDraft, loadDraft } from "@/lib/drafts";

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
  blank: "",

  cover_letter: `# Rayhan Touboui
**AI Engineer** · Paris, France · rayhan@email.com · linkedin.com/in/rayhan

---

**À l'attention du service Recrutement**
Paris, le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}

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
| markdown | string | ✅ | Markdown content |
| style | string | ❌ | \`document\` or \`letter\` |
| title | string | ❌ | Document title |

**Response:** PDF binary stream (\`application/pdf\`)

## Notes

> This service uses Puppeteer for pixel-perfect A4 PDF rendering with Shadow DOM style isolation.
`,
};



type MarkdownDraft = {
  markdown?: string;
  style?: "document" | "letter";
  title?: string;
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
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATES>(initialDraft.activeTemplate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDraft<MarkdownDraft>("markdown")
      .then(async (draft) => {
        if (cancelled || !draft?.markdown) return;
        const nextStyle = draft.style === "document" ? "document" : "letter";
        setMarkdown(draft.markdown);
        setStyle(nextStyle);
        setTitle(draft.title || "Document");
        setActiveTemplate(nextStyle === "letter" ? "cover_letter" : "blank");
        await deleteDraft("markdown");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Preview (debounced) ───────────────────────────────────────────────────
  const fetchPreview = useCallback(async (md: string, s: string, t: string) => {
    if (!md.trim()) { setPreviewHtml(""); return; }
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
    debounceRef.current = setTimeout(() => fetchPreview(markdown, style, title), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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
      setStatus({ type: "success", msg: "✅ PDF downloaded!" });
    } catch (err: unknown) {
      setStatus({ type: "error", msg: `❌ ${err instanceof Error ? err.message : "Export failed"}` });
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
      if (!res.ok) throw new Error(`DOCX export error: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_") || "document"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", msg: "✅ DOCX downloaded!" });
    } catch (err: unknown) {
      setStatus({ type: "error", msg: `❌ ${err instanceof Error ? err.message : "DOCX export failed"}` });
    } finally {
      setIsExportingDocx(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  // ── Template picker ───────────────────────────────────────────────────────
  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    setActiveTemplate(key);
    setMarkdown(TEMPLATES[key]);
    if (key === "cover_letter") { setStyle("letter"); setTitle("Lettre de motivation"); }
    if (key === "technical_doc") { setStyle("document"); setTitle("Technical Documentation"); }
    if (key === "blank") { setStyle("document"); setTitle("Document"); }
  };

  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  const charCount = markdown.length;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50 text-slate-950">

      {/* Toast */}
      {status && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-white text-sm shadow-xl transition-all ${status.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {status.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Markdown PDF</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="h-9 w-44 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />

          {/* Style toggle */}
          <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-medium">
            {(["document", "letter"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className="px-3 py-1.5 transition-colors capitalize"
                style={style === s
                  ? { background: '#0f172a', color: '#fff' }
                  : { background: '#fff', color: '#64748b' }}
              >
                {s === "document" ? "Document" : "Letter"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx || !markdown.trim()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {isExportingDocx ? (
              <><span className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin dark:border-slate-100" /> Generating...</>
            ) : (
              <>↓ Export DOCX</>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || !markdown.trim()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {isExporting ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : (
              <>↓ Export PDF</>
            )}
          </button>
        </div>
      </header>

      {/* ── Template bar ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Template:</span>
        {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
          <button
            key={key}
            onClick={() => applyTemplate(key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={activeTemplate === key
              ? { background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }
              : { background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }}
          >
            {key === "blank" && "Blank"}
            {key === "cover_letter" && "Cover Letter"}
            {key === "technical_doc" && "Technical Doc"}
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-500">
          {wordCount} words · {charCount} chars
        </div>
      </div>

      {/* ── Editor / Preview split ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — Markdown editor */}
        <div className="flex h-full w-1/2 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-white px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Markdown Editor</p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            placeholder={`# Start writing...\n\nSupports **GFM Markdown** — headings, lists, code blocks, tables, blockquotes.\n\nPick a template above to get started quickly.`}
            className="flex-1 w-full resize-none text-sm p-5 focus:outline-none leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Right — Live preview */}
        <div className="flex h-full w-1/2 flex-col bg-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Live Preview</p>
            {isLoadingPreview && (
              <span className="text-xs flex items-center gap-1.5" style={{ color: '#475569' }}>
                <span className="w-2.5 h-2.5 border border-slate-500 border-t-slate-300 rounded-full animate-spin" />
                Rendering...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="h-full w-full rounded-lg border border-slate-200 bg-white shadow-sm"
                title="Markdown Preview"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: '#334155' }}>
                {!markdown.trim() ? (
                  <>
                    <svg className="w-12 h-12 mb-4" style={{ color: '#1e293b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: '#475569' }}>Start typing or pick a template</p>
                    <p className="text-xs mt-1" style={{ color: '#334155' }}>Preview updates automatically</p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
                    <span className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                    Connecting to renderer...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────────── */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-slate-200 bg-white px-4">
        <span className="text-xs text-slate-500">
          Style: <span className="font-medium capitalize text-slate-700">{style}</span>
        </span>
        <span className="text-xs text-slate-500">
          Renderer: <span className="font-medium text-slate-700">{RENDERER_BASE_URL}</span>
        </span>
        <span className="ml-auto text-xs text-slate-400">
          Markdown Converter
        </span>
      </div>
    </div>
  );
}
