"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

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

const RENDERER_URL = "http://localhost:4000";

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MarkdownToolPage() {
  const [markdown, setMarkdown] = useState(TEMPLATES.cover_letter);
  const [style, setStyle] = useState<"document" | "letter">("letter");
  const [title, setTitle] = useState("Document");
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATES>("cover_letter");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Preview (debounced) ───────────────────────────────────────────────────
  const fetchPreview = useCallback(async (md: string, s: string, t: string) => {
    if (!md.trim()) { setPreviewHtml(""); return; }
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`${RENDERER_URL}/render/markdown/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${RENDERER_URL}/render/markdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (err: any) {
      setStatus({ type: "error", msg: `❌ ${err.message}` });
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
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">

      {/* Toast */}
      {status && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-white text-sm shadow-xl transition-all ${status.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {status.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
        {/* Logo + nav */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base"
              style={{ background: "linear-gradient(135deg, #2563eb, #818cf8)" }}>
              M
            </div>
            <span className="font-bold text-slate-800 text-sm">Mindris AI</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-600">Markdown → PDF</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="h-8 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
          />

          {/* Style toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white text-xs font-medium">
            {(["document", "letter"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`px-3 py-1.5 transition-colors capitalize ${style === s ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {s === "document" ? "📄 Document" : "✉ Letter"}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isExporting || !markdown.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : (
              <>↓ Export PDF</>
            )}
          </button>
        </div>
      </header>

      {/* ── Template bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Template:</span>
        {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((key) => (
          <button
            key={key}
            onClick={() => applyTemplate(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTemplate === key ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {key === "blank" && "✨ Blank"}
            {key === "cover_letter" && "✉ Cover Letter"}
            {key === "technical_doc" && "📋 Technical Doc"}
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-400">
          {wordCount} words · {charCount} chars
        </div>
      </div>

      {/* ── Editor / Preview split ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — Markdown editor */}
        <div className="w-1/2 h-full flex flex-col border-r">
          <div className="px-4 py-2 bg-slate-50 border-b">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Markdown Editor</p>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            spellCheck={false}
            placeholder={`# Start writing...\n\nSupports **GFM Markdown** — headings, lists, code blocks, tables, blockquotes.\n\nPick a template above to get started quickly.`}
            className="flex-1 w-full resize-none font-mono text-sm text-slate-800 bg-white p-5 focus:outline-none leading-relaxed placeholder:text-slate-300"
          />
        </div>

        {/* Right — Live preview */}
        <div className="w-1/2 h-full flex flex-col bg-slate-100">
          <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Preview</p>
            {isLoadingPreview && (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                Rendering...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-hidden p-4">
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-none rounded-lg shadow-md bg-white"
                title="Markdown Preview"
                sandbox="allow-same-origin allow-scripts"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                {!markdown.trim() ? (
                  <>
                    <svg className="w-12 h-12 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium">Start typing or pick a template</p>
                    <p className="text-xs mt-1">Preview updates automatically</p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                    Connecting to renderer...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="h-7 bg-white border-t flex items-center px-4 gap-4 shrink-0">
        <span className="text-xs text-slate-400">
          Style: <span className="font-medium text-slate-600 capitalize">{style}</span>
        </span>
        <span className="text-xs text-slate-400">
          Renderer: <span className="font-medium text-slate-600">localhost:4000</span>
        </span>
        <span className="text-xs text-slate-400 ml-auto">
          Mindris AI · Markdown Converter
        </span>
      </div>
    </div>
  );
}
