import { apiUrl, jsonHeaders } from "@/lib/api";

export type WorkflowState =
  | "scrape_completed"
  | "opportunity_created"
  | "resume_linked"
  | "cover_letter_linked"
  | "ats_report_linked"
  | "tracker_entry_created"
  | "ready_to_apply";

export interface JobItem {
  id: number;
  title: string;
  company: string;
  url: string;
  scraped_at: string;
}

export interface ResumeItem {
  id: number;
  name: string;
  locale: string;
  updatedAt?: string;
  multilingual?: {
    activeLocale?: string;
    availableLocales?: string[];
  };
}

export interface AtsReportItem {
  id: number;
  job_id?: number | null;
  score: number;
  mode: "standard" | "strict";
  summary: string;
  generated_at: string;
}

export interface CoverLetterItem {
  id: number;
  job_id?: number | null;
  markdown_content: string;
  generated_at: string;
}

export interface ApplicationItem {
  id: number;
  job_id?: number | null;
  company: string;
  role: string;
  status: string;
  updated_at: string;
}

export interface WorkflowTransition {
  id: number;
  state: WorkflowState;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OpportunityIntegrityIssue {
  code: string;
  severity: string;
  artifact: string;
  message: string;
  metadata: Record<string, unknown>;
}

export interface OpportunityIntegrity {
  status: "healthy" | "degraded";
  issues: OpportunityIntegrityIssue[];
  repair_actions: string[];
}

export interface OpportunityItem {
  id: number;
  job_id?: number | null;
  source_url?: string | null;
  company: string;
  role: string;
  current_state: WorkflowState;
  resume_id?: number | null;
  resume_locale?: string | null;
  ats_report_id?: number | null;
  cover_letter_id?: number | null;
  application_id?: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  last_transition_at: string;
  transitions: WorkflowTransition[];
  next_actions: string[];
  linked_artifacts?: Record<string, unknown>;
  integrity?: OpportunityIntegrity;
}

export const STATE_ORDER: WorkflowState[] = [
  "scrape_completed",
  "opportunity_created",
  "resume_linked",
  "ats_report_linked",
  "cover_letter_linked",
  "tracker_entry_created",
  "ready_to_apply",
];

export const STATE_LABELS: Record<WorkflowState, string> = {
  scrape_completed: "Scrape completed",
  opportunity_created: "Opportunity created",
  resume_linked: "Resume linked",
  ats_report_linked: "ATS linked",
  cover_letter_linked: "Cover letter linked",
  tracker_entry_created: "Tracker entry created",
  ready_to_apply: "Ready to apply",
};

export function formatTimestamp(value?: string | null): string {
  if (!value) return "n/a";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...jsonHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.detail === "string"
          ? payload.detail
          : "Request failed.",
    );
  }
  return payload as T;
}

export function stateTone(active: boolean, done: boolean): string {
  if (active) return "border-blue-600 bg-blue-600 text-white";
  if (done) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-border bg-card text-muted-foreground";
}

export function integrityTone(status?: string): string {
  if (status === "degraded") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function repairActionLabel(action: string): string {
  switch (action) {
    case "detach_missing_application":
      return "Detach missing tracker";
    case "detach_missing_resume":
      return "Detach missing resume";
    case "detach_missing_ats_report":
      return "Detach missing ATS";
    case "detach_missing_cover_letter":
      return "Detach missing letter";
    case "reset_resume_locale":
      return "Reset resume locale";
    case "sync_application_links":
      return "Sync tracker links";
    default:
      return action;
  }
}
