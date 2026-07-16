import { apiUrl, jsonHeaders } from "@/lib/api";

import type { ResumeDocument } from "./types";

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : jsonHeaders()),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function persistResume(
  resumeId: string,
  patch: Partial<ResumeDocument>,
) {
  return requestJson<{ item: ResumeDocument }>(`/api/v1/resumes/${resumeId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: patch.name,
      cv_data: patch.cvData,
      template_id: patch.templateId,
      locale: patch.locale,
      target_locale: patch.multilingual?.activeLocale,
      source: "editor",
    }),
  });
}
