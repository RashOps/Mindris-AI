import type { HistoryLedgerItem } from "./types";

export function normalizeHistoryLedgerItem(
  value: HistoryLedgerItem | null | undefined,
): HistoryLedgerItem {
  const candidate = (value ?? {}) as Partial<HistoryLedgerItem>;
  const subjectType =
    candidate.subject_type === "job_scrape" ||
    candidate.subject_type === "resume_revision" ||
    candidate.subject_type === "cover_letter" ||
    candidate.subject_type === "ats_report" ||
    candidate.subject_type === "opportunity" ||
    candidate.subject_type === "tracker_event" ||
    candidate.subject_type === "llm_run"
      ? candidate.subject_type
      : "llm_run";

  return {
    id: typeof candidate.id === "string" ? candidate.id : "",
    subject_type: subjectType,
    subject_id:
      typeof candidate.subject_id === "string" ? candidate.subject_id : "",
    title: typeof candidate.title === "string" ? candidate.title : "",
    summary: typeof candidate.summary === "string" ? candidate.summary : "",
    timestamp:
      typeof candidate.timestamp === "string" ? candidate.timestamp : "",
    provider:
      typeof candidate.provider === "string" ? candidate.provider : null,
    model_name:
      typeof candidate.model_name === "string" ? candidate.model_name : null,
    status: typeof candidate.status === "string" ? candidate.status : null,
    group_id:
      typeof candidate.group_id === "string" && candidate.group_id
        ? candidate.group_id
        : `date:${candidate.timestamp?.slice(0, 10) ?? "unknown"}`,
    group_label:
      typeof candidate.group_label === "string" && candidate.group_label
        ? candidate.group_label
        : "Activité non classée",
    links: Array.isArray(candidate.links)
      ? candidate.links.map((link) => ({
          subject_type:
            typeof link?.subject_type === "string" ? link.subject_type : "",
          subject_id:
            typeof link?.subject_id === "string" ? link.subject_id : "",
          relation: typeof link?.relation === "string" ? link.relation : "",
        }))
      : [],
    metadata:
      candidate.metadata && typeof candidate.metadata === "object"
        ? candidate.metadata
        : {},
  };
}
