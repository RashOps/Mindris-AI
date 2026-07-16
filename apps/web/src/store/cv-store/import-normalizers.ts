import type { CVData } from "./types";

export function cvDataFromImport(data: unknown): CVData | null {
  if (!data || typeof data !== "object") return null;
  const candidate = data as Partial<CVData> & { cvData?: CVData };

  if (candidate.cvData?.global_settings && candidate.cvData.profile) {
    return candidate.cvData;
  }

  if (candidate.global_settings && candidate.profile) {
    return candidate as CVData;
  }

  return null;
}

export function resumeNameFromImport(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const candidate = data as { name?: unknown };
  return typeof candidate.name === "string" && candidate.name.trim()
    ? candidate.name.trim()
    : null;
}
