import { apiHeaders, apiUrl, jsonHeaders } from "@/lib/api";
import type { CVData } from "@/store/useCVStore";

export type ResumeTemplateManifest = {
  id: string;
  name: string;
  version: string;
  author: string;
  license: string;
  description: string;
  category: string;
  tags: string[];
  engine_version: string;
};

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  status: "ready" | "community";
  category: string;
  accent: string;
  layout: "single" | "two-column";
  base_template_id?: string | null;
  author?: string | null;
  previewAvailable?: boolean;
  manifest?: ResumeTemplateManifest;
};

export function templateHandle(templateId: string): string {
  return templateId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function templatePackageFileName(templateId: string): string {
  const leaf = templateId.split("/").pop() || "template";
  return `${leaf}.mindris-template`;
}

export async function fetchResumeTemplates(): Promise<ResumeTemplate[]> {
  const response = await fetch(apiUrl("/api/v1/templates"), {
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Template load failed: ${response.status}`);
  const payload = (await response.json()) as { items?: ResumeTemplate[] };
  return payload.items ?? [];
}

export async function resolveTemplateRenderPayload(
  cvData: CVData,
  templateId?: string,
  applyPreset = false,
): Promise<{ cv_data: CVData; template_id: string }> {
  const response = await fetch(apiUrl("/api/v1/templates/resolve-render-payload"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      cv_data: cvData,
      template_id: templateId,
      apply_preset: applyPreset,
    }),
  });
  if (!response.ok) {
    throw new Error(`Template render payload resolution failed: ${response.status}`);
  }
  const payload = (await response.json()) as {
    item?: { cv_data?: CVData; template_id?: string };
  };
  if (!payload.item?.cv_data || !payload.item.template_id) {
    throw new Error("Template render payload resolution returned no item");
  }
  return {
    cv_data: payload.item.cv_data,
    template_id: payload.item.template_id,
  };
}

export async function importResumeTemplatePackage(file: File): Promise<ResumeTemplate> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(apiUrl("/api/v1/templates/import"), {
    method: "POST",
    headers: apiHeaders(),
    body: form,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; detail?: string }
      | null;
    throw new Error(payload?.message || payload?.detail || "Template import failed");
  }
  const payload = (await response.json()) as { item?: ResumeTemplate };
  if (!payload.item) throw new Error("Template import returned no item");
  return payload.item;
}

export async function exportResumeTemplatePackage(templateId: string): Promise<Blob> {
  const response = await fetch(apiUrl(`/api/v1/templates/${templateId}/package`), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error("Template export failed");
  return response.blob();
}

export async function fetchResumeTemplatePreviewBlob(templateId: string): Promise<Blob> {
  const response = await fetch(apiUrl(`/api/v1/templates/${templateId}/preview`), {
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error("Template preview failed");
  return response.blob();
}

export function resumeTemplatePreviewUrl(templateId: string): string {
  return apiUrl(`/api/v1/templates/${templateId}/preview`);
}
