"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { RENDERER_BASE_URL, jsonHeaders, rendererUrl } from "@/lib/api";

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



function readInjectedDraft() {
  if (typeof window === "undefined") {
    return {
      markdown: TEMPLATES.cover_letter,
      style: "letter" as const,
      title: "Document",
      activeTemplate: "cover_letter" as keyof typeof TEMPLATES,
    };
  }

  const draft = window.localStorage.getItem("md_draft");
  if (!draft) {
    return {
      markdown: TEMPLATES.cover_letter,
      style: "letter" as const,
      title: "Document",
      activeTemplate: "cover_letter" as keyof typeof TEMPLATES,
    };
  }

  const savedStyle = window.localStorage.getItem("md_draft_style");
  const savedTitle = window.localStorage.getItem("md_draft_title");
  window.localStorage.removeItem("md_draft");
  window.localStorage.removeItem("md_draft_style");
  window.localStorage.removeItem("md_draft_title");

  return {
    markdown: draft,
    style: savedStyle === "document" ? "document" as const : "letter" as const,
    title: savedTitle || "Document",
    activeTemplate: savedStyle === "letter" ? "cover_letter" as const : "blank" as const,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MarkdownToolPage() {
  const [initialDraft] = useState(readInjectedDraft);
  const [markdown, setMarkdown] = useState(initialDraft.markdown);
  const [style, setStyle] = useState<"document" | "letter">(initialDraft.style);
  const [title, setTitle] = useState(initialDraft.title);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATES>(initialDraft.activeTemplate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="flex flex-col h-screen overflow-hidden theme-dark-tool" style={{ background: '#0a0f1a', color: '#e2e8f0' }}>

      {/* Toast */}
      {status && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-white text-sm shadow-xl transition-all ${status.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {status.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="h-12 border-b flex items-center justify-between px-4 shrink-0" style={{ background: 'rgba(10,15,26,0.95)', borderColor: 'rgba(255,255,255,0.07)' }}>
        {/* Logo + nav */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}>
              M
            </div>
            <span style={{ fontFamily: 'var(--font-space)', color: '#f1f5f9', fontWeight: 600, fontSize: '0.875rem' }}>Mindris AI</span>
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
          <span className="text-sm font-medium" style={{ color: '#64748b' }}>Markdown → PDF</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="h-8 px-3 text-sm rounded-lg focus:outline-none w-44"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />

          {/* Style toggle */}
          <div className="flex rounded-lg overflow-hidden text-xs font-medium" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {(["document", "letter"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className="px-3 py-1.5 transition-colors capitalize"
                style={style === s
                  ? { background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.03)', color: '#64748b' }}
              >
                {s === "document" ? "📄 Document" : "✉ Letter"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting || !markdown.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}
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
      <div className="border-b px-4 py-2 flex items-center gap-2 shrink-0" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: '#475569' }}>Template:</span>
        {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
          <button
            key={key}
            onClick={() => applyTemplate(key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={activeTemplate === key
              ? { background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {key === "blank" && "✨ Blank"}
            {key === "cover_letter" && "✉ Cover Letter"}
            {key === "technical_doc" && "📋 Technical Doc"}
          </button>
        ))}
        <div className="ml-auto text-xs" style={{ color: '#334155' }}>
          {wordCount} words · {charCount} chars
        </div>
      </div>

      {/* ── Editor / Preview split ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — Markdown editor */}
        <div className="w-1/2 h-full flex flex-col border-r" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-2 border-b" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Markdown Editor</p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            placeholder={`# Start writing...\n\nSupports **GFM Markdown** — headings, lists, code blocks, tables, blockquotes.\n\nPick a template above to get started quickly.`}
            className="flex-1 w-full resize-none text-sm p-5 focus:outline-none leading-relaxed"
            style={{ fontFamily: 'var(--font-mono)', background: 'rgba(10,15,26,0.8)', color: '#cbd5e1' }}
          />
        </div>

        {/* Right — Live preview */}
        <div className="w-1/2 h-full flex flex-col" style={{ background: 'rgba(5,10,20,0.5)' }}>
          <div className="px-4 py-2 border-b flex items-center justify-between" style={{ background: 'rgba(15,23,42,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>Live Preview</p>
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
                className="w-full h-full border-none rounded-xl shadow-2xl"
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
      <div className="h-7 border-t flex items-center px-4 gap-4 shrink-0" style={{ background: 'rgba(10,15,26,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-xs" style={{ color: '#334155' }}>
          Style: <span className="font-medium capitalize" style={{ color: '#64748b' }}>{style}</span>
        </span>
        <span className="text-xs" style={{ color: '#334155' }}>
          Renderer: <span className="font-medium" style={{ color: '#64748b' }}>{RENDERER_BASE_URL}</span>
        </span>
        <span className="text-xs ml-auto" style={{ color: '#1e293b' }}>
          Mindris AI · Markdown Converter
        </span>
      </div>
    </div>
  );
}
