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
  resume_id?: number | null;
  resume_revision?: number | null;
  stale?: boolean;
}

export interface CoverLetterItem {
  id: number;
  job_id?: number | null;
  markdown_content: string;
  generated_at: string;
  resume_id?: number | null;
  resume_revision?: number | null;
  stale?: boolean;
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
  linked_artifacts?: {
    resume?: {
      id: number;
      name: string;
      locale: string;
      revision?: number;
      updated_at: string;
    };
    ats_report?: AtsReportItem;
    cover_letter?: CoverLetterItem;
    application?: {
      id: number;
      status: string;
      updated_at: string;
    };
  };
  integrity?: OpportunityIntegrity;
}

export type WorkflowActionRunner = (
  action: string,
  callback: () => Promise<void>,
) => Promise<void>;

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
  scrape_completed: "Offre importée",
  opportunity_created: "Opportunité créée",
  resume_linked: "CV lié",
  ats_report_linked: "Score ATS lié",
  cover_letter_linked: "Lettre liée",
  tracker_entry_created: "Tracker créé",
  ready_to_apply: "Prêt à candidater",
};

export function formatTimestamp(value?: string | null): string {
  if (!value) return "n/a";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
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
  if (active) return "border-primary bg-primary text-primary-foreground";
  if (done) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "border-border bg-card text-muted-foreground";
}

export function integrityTone(status?: string): string {
  if (status === "degraded") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

export function repairActionLabel(action: string): string {
  switch (action) {
    case "detach_missing_application":
      return "Détacher le tracker manquant";
    case "detach_missing_resume":
      return "Détacher le CV manquant";
    case "detach_missing_ats_report":
      return "Détacher le score ATS manquant";
    case "detach_missing_cover_letter":
      return "Détacher la lettre manquante";
    case "reset_resume_locale":
      return "Réinitialiser la langue du CV";
    case "sync_application_links":
      return "Synchroniser le tracker";
    case "relink_ats_report":
      return "Remplacer ou recalculer le score ATS";
    case "relink_cover_letter":
      return "Remplacer la lettre";
    case "relink_application":
      return "Remplacer l’entrée tracker";
    default:
      return action;
  }
}
