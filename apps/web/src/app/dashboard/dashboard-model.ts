import { apiHeaders, apiUrl } from "@/lib/api";
import type { ResumeTemplate } from "@/lib/templates";

export const FALLBACK_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Balanced two-column layout for tech, product, and business profiles.",
    status: "ready",
    category: "tech",
    accent: "#2563eb",
    layout: "two-column",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense one-page format for experienced profiles and long histories.",
    status: "ready",
    category: "senior",
    accent: "#0f766e",
    layout: "two-column",
  },
  {
    id: "ats",
    name: "ATS Strict",
    description: "Single-column, low-decoration template for ATS-friendly CVs.",
    status: "ready",
    category: "ats",
    accent: "#475569",
    layout: "single",
  },
  {
    id: "student",
    name: "Student",
    description: "Education-first template for internships and first roles.",
    status: "ready",
    category: "student",
    accent: "#7c3aed",
    layout: "single",
  },
  {
    id: "creative",
    name: "Creative",
    description: "Editorial template for marketing, design, and content roles.",
    status: "ready",
    category: "creative",
    accent: "#e11d48",
    layout: "two-column",
  },
  {
    id: "opensource",
    name: "Open Source",
    description: "Community-made template for developers, GitHub links, and OSS contributions.",
    status: "community",
    category: "developer",
    accent: "#0f766e",
    layout: "two-column",
    base_template_id: "modern",
    author: "Mindris Community",
  },
  {
    id: "bilingual",
    name: "Bilingual FR/EN",
    description: "Community template tuned for bilingual CVs and international applications.",
    status: "community",
    category: "international",
    accent: "#7c3aed",
    layout: "two-column",
    base_template_id: "compact",
    author: "Mindris Community",
  },
];

export type ResumeExportFormat = "json" | "markdown" | "html";

export type ResumeRevision = {
  id: string;
  resumeId: string;
  revision: number;
  name: string;
  templateId: string;
  locale: string;
  source: string;
  label?: string | null;
  createdAt: string;
};

export type ResumeRevisionChange = {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: unknown;
  after?: unknown;
};

export type ResumeRevisionSectionSummary = {
  section: string;
  label: string;
  status: "added" | "removed" | "changed" | "unchanged";
  beforeCount: number;
  afterCount: number;
};

export type ResumeRevisionCompare = {
  resumeId: string;
  baseRevision: ResumeRevision;
  targetRevision: ResumeRevision;
  changeCount: number;
  sectionSummaries: ResumeRevisionSectionSummary[];
  changes: ResumeRevisionChange[];
};

export const RESUME_EXPORTS: Record<
  ResumeExportFormat,
  { endpoint: string; extension: string; label: string }
> = {
  json: { endpoint: "export-json", extension: "json", label: "JSON" },
  markdown: { endpoint: "export-markdown", extension: "md", label: "Markdown" },
  html: { endpoint: "export-html", extension: "html", label: "HTML" },
};

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function downloadResume(id: string, name: string, format: ResumeExportFormat) {
  const exportConfig = RESUME_EXPORTS[format];
  const response = await fetch(apiUrl(`/api/v1/resumes/${id}/${exportConfig.endpoint}`), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(`${exportConfig.label} export failed`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fileNameToResumeName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported CV";
}
