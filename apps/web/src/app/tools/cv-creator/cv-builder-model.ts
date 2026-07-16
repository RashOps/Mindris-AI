import type {
  CompanyInsight,
  JobInsights,
  ResumeSaveStatus,
} from "@/store/useCVStore";

export type DragPayload =
  | { kind: "skill"; skill: string }
  | { kind: "skillGroup"; groupId: string }
  | { kind: "bullet"; bullet: string }
  | { kind: "experience"; expId: string };

export type JobResultPayload = Partial<JobInsights> & {
  company_insight?: CompanyInsight;
};

export type ResumeExportFormat =
  "json" | "markdown" | "html" | "docx" | "latex" | "typst";
export type HeaderMenuId = "upload" | "download";
export type EditorTab = "structure" | "style";

export const RESUME_EXPORTS: Record<
  ResumeExportFormat,
  { endpoint: string; extension: string; label: string }
> = {
  json: { endpoint: "export-json", extension: "json", label: "JSON" },
  markdown: { endpoint: "export-markdown", extension: "md", label: "Markdown" },
  html: { endpoint: "export-html", extension: "html", label: "HTML" },
  docx: { endpoint: "export-docx", extension: "docx", label: "DOCX" },
  latex: { endpoint: "export-latex", extension: "tex", label: "LaTeX" },
  typst: { endpoint: "export-typst", extension: "typ", label: "Typst" },
};

export function asDragPayload(value: unknown): DragPayload | null {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value as DragPayload;
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function resumeSaveStatusText(
  status: ResumeSaveStatus,
  lastSavedAt: string | null,
): string {
  if (status === "dirty") return "Unsaved changes";
  if (status === "saving") return "Saving...";
  if (status === "error") return "Save failed";
  return lastSavedAt ? "Saved" : "Loaded";
}

export function resumeSaveStatusColor(status: ResumeSaveStatus): string {
  if (status === "error") return "#b91c1c";
  if (status === "dirty" || status === "saving") return "#92400e";
  return "#047857";
}
