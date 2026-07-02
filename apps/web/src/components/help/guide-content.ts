import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FileText,
  GitBranch,
  LockKeyhole,
  Search,
  Settings2,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export type GuideSection = {
  title: string;
  icon: LucideIcon;
  items: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Mindris in one line",
    icon: BookOpen,
    items: [
      "Mindris is a local-first resume workflow studio: scrape a role, analyze fit, adapt the CV, generate supporting artifacts, and track the application.",
      "The frontend is an operating surface only. Durable state, destructive actions, providers, and secrets stay behind backend APIs.",
    ],
  },
  {
    title: "1. Start from a job",
    icon: Search,
    items: [
      "Paste a job URL in Workflow, ATS Score, or CV Builder to extract structured signals from the offer.",
      "Review the company profile, role-fit hints, and ATS evidence before editing the resume.",
    ],
  },
  {
    title: "2. Shape the resume",
    icon: FileText,
    items: [
      "Use CV Builder for section edits, template switching, exports, multilingual variants, and resume duplication.",
      "Use the Style Studio for layout, typography, colors, and template-specific presentation rules.",
    ],
  },
  {
    title: "3. Drive the application workflow",
    icon: GitBranch,
    items: [
      "Use Workflow to connect a job scrape, a resume revision, an ATS report, a cover letter, and a tracker entry.",
      "Use Tracker for follow-ups and lifecycle progression once the opportunity is ready to move.",
    ],
  },
  {
    title: "4. Operate the runtime",
    icon: Settings2,
    items: [
      "Use Configuration to set providers, default models, local services, PDF ingestion mode, and secret presence.",
      "Use History for auditability across scrapes, ATS reports, cover letters, workflow transitions, revisions, and tracker activity.",
    ],
  },
  {
    title: "Client and server boundary",
    icon: ShieldCheck,
    items: [
      "Browser code must not become a service layer. It calls APIs, renders state, and stores only short-lived UI preferences such as theme.",
      "Secrets, durable resume state, destructive cleanup, and provider orchestration remain backend-owned.",
    ],
  },
  {
    title: "Security and destructive actions",
    icon: LockKeyhole,
    items: [
      "Mindris must never expose raw secret values in UI responses or logs.",
      "Bulk destructive actions require explicit confirmation and must be executed transactionally by the backend.",
    ],
  },
  {
    title: "Recommended daily workflow",
    icon: Workflow,
    items: [
      "Scrape the role, inspect ATS and company signals, tailor the resume, generate the cover letter, then push the opportunity into the tracker.",
      "Use History when you need lineage, revision context, or to verify which artifact was used for a given application.",
    ],
  },
];
