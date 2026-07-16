import Image from "next/image";
import { ArrowRight, Copy, Download, FileText, FolderOpen, Plus, Trash2, Upload } from "lucide-react";
import type { RefObject } from "react";

import { PdfIngestionModeSelect } from "@/components/PdfIngestionModeSelect";
import { Button } from "@/components/ui/button";
import type { ResumeDocument, ResumeSaveStatus } from "@/store/useCVStore";
import type { ResumeTemplate } from "@/lib/templates";

import { RESUME_EXPORTS, downloadResume, formatDate } from "./dashboard-model";

interface DashboardActionsProps {
  saveStatusText: string;
  resumeSaveStatus: ResumeSaveStatus;
  resumeSaveError: string | null;
  retryResumeSave: () => Promise<void>;
  showStatus: (message: string) => void;
  jsonInputRef: RefObject<HTMLInputElement | null>;
  pdfInputRef: RefObject<HTMLInputElement | null>;
  templatePackageInputRef: RefObject<HTMLInputElement | null>;
  handleJsonImport: (file: File) => Promise<void>;
  handlePdfImport: (file: File) => Promise<void>;
  handleTemplatePackageImport: (file: File) => Promise<void>;
  isImportingPdf: boolean;
  createFromTemplate: (templateId: string, name: string) => Promise<void>;
}

export function DashboardActions({
  saveStatusText,
  resumeSaveStatus,
  resumeSaveError,
  retryResumeSave,
  showStatus,
  jsonInputRef,
  pdfInputRef,
  templatePackageInputRef,
  handleJsonImport,
  handlePdfImport,
  handleTemplatePackageImport,
  isImportingPdf,
  createFromTemplate,
}: DashboardActionsProps) {
  return (
    <>
      <button
        onClick={() => {
          if (resumeSaveStatus === "error") {
            void retryResumeSave().catch((err: unknown) => {
              showStatus(err instanceof Error ? err.message : "Save retry failed");
            });
          }
        }}
        className="hidden h-9 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm sm:inline-flex sm:items-center"
        title={resumeSaveError ?? "Backend save status"}
      >
        {saveStatusText}
      </button>
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleJsonImport(file);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePdfImport(file);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={templatePackageInputRef}
        type="file"
        accept=".mindris-template,.zip,application/zip"
        className="hidden"
        data-testid="template-package-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleTemplatePackageImport(file);
          e.currentTarget.value = "";
        }}
      />
      <PdfIngestionModeSelect compact />
      <Button
        variant="outline"
        onClick={() => templatePackageInputRef.current?.click()}
        data-testid="template-package-button"
      >
        <FolderOpen size={15} />
        Template
      </Button>
      <Button variant="outline" onClick={() => jsonInputRef.current?.click()}>
        <Upload size={15} />
        JSON
      </Button>
      <Button
        variant="outline"
        onClick={() => pdfInputRef.current?.click()}
        disabled={isImportingPdf}
      >
        <FileText size={15} />
        {isImportingPdf ? "Parsing..." : "PDF"}
      </Button>
      <Button onClick={() => void createFromTemplate("modern", "Untitled")}>
        <Plus size={15} />
        New CV
      </Button>
    </>
  );
}

interface TemplatePreviewProps {
  template: ResumeTemplate;
  previewUrl?: string;
}

export function TemplatePreview({ template, previewUrl }: TemplatePreviewProps) {
  if (template.previewAvailable && previewUrl) {
    return (
      <Image
        src={previewUrl}
        alt={`${template.name} preview`}
        fill
        unoptimized
        className="rounded-md object-cover"
      />
    );
  }
  return (
    <div className="h-full p-3">
      <div
        className="mb-2 h-3 w-24 rounded-full"
        style={{ background: template.accent }}
      />
      <div className="mb-1 h-2 w-32 rounded-full bg-muted" />
      <div className="h-2 w-20 rounded-full bg-muted" />
    </div>
  );
}

interface ResumeCardProps {
  resume: ResumeDocument;
  activeResumeId: string;
  resumesLength: number;
  renameResume: (id: string, name: string) => void;
  openResume: (id: string) => void;
  duplicateResume: (id?: string) => Promise<string>;
  deleteResume: (id: string) => Promise<void>;
  showStatus: (message: string) => void;
}

export function ResumeCard({
  resume,
  activeResumeId,
  resumesLength,
  renameResume,
  openResume,
  duplicateResume,
  deleteResume,
  showStatus,
}: ResumeCardProps) {
  return (
    <article className="flex min-h-52 w-full min-w-0 flex-col rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <input
            value={resume.name}
            onChange={(e) => renameResume(resume.id, e.target.value)}
            className="w-full rounded border-none bg-transparent p-0 text-sm font-semibold outline-none"
          />
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {resume.cvData.profile.title || "No target title yet"}
          </p>
        </div>
        {resume.id === activeResumeId && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            Active
          </span>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="rounded-md bg-muted/40 p-2">
          <p className="font-medium text-foreground">Template</p>
          <p className="mt-1 capitalize">{resume.templateId}</p>
        </div>
        <div className="rounded-md bg-muted/40 p-2">
          <p className="font-medium text-foreground">Updated</p>
          <p className="mt-1">{formatDate(resume.updatedAt)}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          onClick={() => openResume(resume.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground"
        >
          Open <ArrowRight size={13} />
        </button>
        <button
          onClick={() => {
            void duplicateResume(resume.id).catch((err: unknown) => {
              showStatus(err instanceof Error ? err.message : "Duplicate failed");
            });
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <Copy size={13} /> Duplicate
        </button>
        {(["json", "markdown", "html"] as const).map((format) => (
          <button
            key={format}
            onClick={() => {
              const exportConfig = RESUME_EXPORTS[format];
              void downloadResume(resume.id, resume.name, format)
                .then(() => showStatus(`${exportConfig.label} resume exported`))
                .catch((err: unknown) => {
                  showStatus(
                    err instanceof Error
                      ? err.message
                      : `${exportConfig.label} export failed`,
                  );
                });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <Download size={13} /> {RESUME_EXPORTS[format].label}
          </button>
        ))}
        <button
          onClick={() => {
            void deleteResume(resume.id).catch((err: unknown) => {
              showStatus(err instanceof Error ? err.message : "Delete failed");
            });
          }}
          disabled={resumesLength <= 1}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-100 px-2.5 text-xs font-medium text-red-600 disabled:opacity-40"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </article>
  );
}
