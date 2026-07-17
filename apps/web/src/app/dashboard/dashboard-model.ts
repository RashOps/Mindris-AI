import { apiHeaders, apiUrl } from "@/lib/api";
import type { ResumeTemplate } from "@/lib/templates";

export const FALLBACK_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Moderne",
    description: "Mise en page équilibrée en deux colonnes pour profils tech, produit et business.",
    status: "ready",
    category: "tech",
    accent: "#2563eb",
    layout: "two-column",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Format dense sur une page pour profils expérimentés et parcours longs.",
    status: "ready",
    category: "senior",
    accent: "#0f766e",
    layout: "two-column",
  },
  {
    id: "ats",
    name: "ATS strict",
    description: "Template une colonne, sobre, pensé pour les systèmes ATS.",
    status: "ready",
    category: "ats",
    accent: "#475569",
    layout: "single",
  },
  {
    id: "student",
    name: "Étudiant",
    description: "Template centré formation pour stages, alternances et premiers postes.",
    status: "ready",
    category: "student",
    accent: "#7c3aed",
    layout: "single",
  },
  {
    id: "creative",
    name: "Créatif",
    description: "Template éditorial pour marketing, design et métiers de contenu.",
    status: "ready",
    category: "creative",
    accent: "#e11d48",
    layout: "two-column",
  },
  {
    id: "opensource",
    name: "Open Source",
    description: "Template communautaire pour développeurs, liens GitHub et contributions OSS.",
    status: "community",
    category: "developer",
    accent: "#0f766e",
    layout: "two-column",
    base_template_id: "modern",
    author: "Communauté Mindris",
  },
  {
    id: "bilingual",
    name: "Bilingue FR/EN",
    description: "Template communautaire pour CV bilingues et candidatures internationales.",
    status: "community",
    category: "international",
    accent: "#7c3aed",
    layout: "two-column",
    base_template_id: "compact",
    author: "Communauté Mindris",
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
  return new Intl.DateTimeFormat("fr-FR", {
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
  if (!response.ok) throw new Error(`Export ${exportConfig.label} impossible`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/\s+/g, "_") || "mindris_cv"}.${exportConfig.extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function fileNameToResumeName(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "CV importé";
}
