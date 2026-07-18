import { apiUrl, jsonHeaders } from "@/lib/api";

export async function saveDraft<T extends Record<string, unknown>>(
  key: string,
  data: T
): Promise<void> {
  const response = await fetch(apiUrl(`/api/v1/drafts/${key}`), {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error(`Draft save failed: ${response.status}`);
}

export async function loadDraft<T>(key: string): Promise<T | null> {
  const response = await fetch(apiUrl(`/api/v1/drafts/maybe/${key}`), {
    headers: jsonHeaders(),
  });
  if (!response.ok) throw new Error(`Draft load failed: ${response.status}`);
  const payload = (await response.json()) as { item?: { data?: T } };
  return payload.item?.data ?? null;
}

export async function deleteDraft(key: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/v1/drafts/${key}`), {
    method: "DELETE",
    headers: jsonHeaders(),
  });
  if (response.status === 404) return;
  if (!response.ok) throw new Error(`Draft delete failed: ${response.status}`);
}
