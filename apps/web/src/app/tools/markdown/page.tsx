"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { RENDERER_BASE_URL, apiUrl, jsonHeaders, rendererUrl } from "@/lib/api";
import { fetchCoverLetter } from "@/lib/cover-letters";
import { deleteDraft, loadDraft } from "@/lib/drafts";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  Download,
  Eye,
  FileText,
  PencilLine,
  Save,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { updateOnboardingStep } from "@/lib/onboarding";
import {
  MARKDOWN_TEMPLATES,
  type MarkdownTemplateId,
} from "./markdown-templates";

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
    markdown: MARKDOWN_TEMPLATES.cover_letter,
    style: "letter" as const,
    title: "Document",
    activeTemplate: "cover_letter" as MarkdownTemplateId,
  };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MarkdownToolPage() {
  const { locale, messages } = useI18n();
  const copy = messages.pages.markdown;
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
  const [activeTemplate, setActiveTemplate] = useState<MarkdownTemplateId>(
    initialDraft.activeTemplate,
  );
  const [coverLetterId, setCoverLetterId] = useState<number | null>(null);
  const [coverLetterJobId, setCoverLetterJobId] = useState<number | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [isLoadingLetter, setIsLoadingLetter] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
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
              : copy.letterLoadFailed,
        });
      } finally {
        setIsLoadingLetter(false);
        setTimeout(() => setStatus(null), 4000);
      }
    },
    [copy.letterLoadFailed],
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
      void updateOnboardingStep("first_export", "completed").catch(
        () => undefined,
      );
      setStatus({ type: "success", msg: copy.pdfDownloaded });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : copy.pdfExportFailed,
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
      void updateOnboardingStep("first_export", "completed").catch(
        () => undefined,
      );
      setStatus({ type: "success", msg: copy.docxDownloaded });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : copy.docxExportFailed,
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
      setStatus({ type: "success", msg: copy.versionSaved });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        msg: err instanceof Error ? err.message : copy.saveFailed,
      });
    } finally {
      setIsSavingVersion(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  // ── Template picker ───────────────────────────────────────────────────────
  const applyTemplate = (key: MarkdownTemplateId) => {
    setActiveTemplate(key);
    setMarkdown(MARKDOWN_TEMPLATES[key]);
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
    <div className="flex h-[calc(100dvh-7.5rem-1px)] flex-col overflow-hidden bg-background text-foreground sm:h-[calc(100dvh-4.5rem-1px)]">
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
              ariaLabel={copy.loadLetterLabel}
              placeholder={copy.loadLetter}
              options={[
                { value: "", label: copy.loadLetter },
                ...coverLetters.map((letter) => ({
                  value: String(letter.id),
                  label: `Lettre #${letter.id}`,
                  hint: letter.job_id ? `Job #${letter.job_id}` : copy.withoutJob,
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
            placeholder={copy.documentTitle}
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
                {s === "document" ? copy.document : copy.letter}
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
                  {copy.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {copy.saveVersion}
                </>
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
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                DOCX
              </>
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
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                PDF
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Template bar ─────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {copy.template} :
        </span>
        {(Object.keys(MARKDOWN_TEMPLATES) as MarkdownTemplateId[]).map(
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
              {key === "blank" && copy.blank}
              {key === "cover_letter" && copy.letter}
              {key === "technical_doc" && copy.technicalDocument}
            </button>
          ),
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {wordCount} mots · {charCount} caractères
        </div>
      </div>

      {coverLetterId ? (
        <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
              {coverLetterJobId ? `Job #${coverLetterJobId}` : copy.unlinkedJob}
            </span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
            <span className="font-medium text-foreground">
              Lettre #{coverLetterId}
            </span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
            <span>{copy.exportPdf}</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {sameJobLetters.length} version{sameJobLetters.length > 1 ? "s" : ""}
            </span>
          </div>
          {sameJobLetters.length > 1 ? (
            <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
              {sameJobLetters.map((letter) => (
                <button
                  key={letter.id}
                  type="button"
                  onClick={() => void handleOpenCoverLetter(letter.id)}
                  className={`shrink-0 rounded-full border px-2 py-1 font-medium transition-colors ${
                    letter.id === coverLetterId
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  Version #{letter.id} ·{" "}
                  {new Date(letter.generated_at).toLocaleDateString(
                    locale === "en" ? "en-US" : "fr-FR",
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className="grid shrink-0 grid-cols-2 border-b border-border bg-card md:hidden"
        role="tablist"
        aria-label={copy.markdownView}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "editor"}
          onClick={() => setMobileView("editor")}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium ${
            mobileView === "editor"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.editor}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium ${
            mobileView === "preview"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.preview}
        </button>
      </div>

      {/* ── Editor / Preview split ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Markdown editor */}
        <div
          className={`${mobileView === "editor" ? "flex" : "hidden"} h-full w-full flex-col border-r border-border bg-card md:flex md:w-1/2`}
          role="tabpanel"
        >
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
        <div
          className={`${mobileView === "preview" ? "flex" : "hidden"} h-full w-full flex-col bg-muted/40 md:flex md:w-1/2`}
          role="tabpanel"
        >
          <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aperçu en direct
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
                    <FileText className="mb-4 h-12 w-12" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">
                      Commence à écrire ou choisis un template
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      L’aperçu se met à jour automatiquement
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
        <span className="hidden text-xs text-muted-foreground md:inline">
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
          Markdown vers PDF
        </span>
      </div>
    </div>
  );
}
