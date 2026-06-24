import { apiUrl, jsonHeaders } from "@/lib/api";

export type ResumeTemplate = {
  id: string;
  name: string;
  description: string;
  status: "ready";
  category: string;
  accent: string;
  layout: "single" | "two-column";
};

export async function fetchResumeTemplates(): Promise<ResumeTemplate[]> {
  const response = await fetch(apiUrl("/api/v1/templates"), {
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Template load failed: ${response.status}`);
  const payload = (await response.json()) as { items?: ResumeTemplate[] };
  return payload.items ?? [];
}
