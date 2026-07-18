import { apiUrl, jsonHeaders } from "@/lib/api";
import { saveDraft } from "@/lib/drafts";

export interface PersistedCoverLetter {
  id: number;
  job_id?: number | null;
  markdown_content: string;
  generated_at?: string | null;
}

export async function fetchCoverLetter(
  coverLetterId: number,
): Promise<PersistedCoverLetter> {
  const response = await fetch(
    apiUrl(`/api/v1/history/cover-letters/${coverLetterId}`),
    { headers: jsonHeaders() },
  );
  if (!response.ok) {
    throw new Error(`Chargement de la lettre #${coverLetterId} impossible`);
  }
  const payload = (await response.json()) as { item?: PersistedCoverLetter };
  if (!payload.item?.markdown_content) {
    throw new Error(`Lettre #${coverLetterId} introuvable ou vide`);
  }
  return payload.item;
}

export async function openCoverLetterInMarkdown(
  coverLetterId: number,
): Promise<void> {
  const letter = await fetchCoverLetter(coverLetterId);
  await saveDraft("markdown", {
    markdown: letter.markdown_content,
    style: "letter",
    title: `Lettre de motivation #${letter.id}`,
    cover_letter_id: letter.id,
    job_id: typeof letter.job_id === "number" ? letter.job_id : null,
    generated_at:
      typeof letter.generated_at === "string" ? letter.generated_at : null,
  });
}
