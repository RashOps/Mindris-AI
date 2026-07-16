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
  badge: string;
  summary: string;
  icon: LucideIcon;
  items: string[];
  steps: string[];
  tips: string[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Mindris in one line",
    badge: "Product map",
    summary: "The whole product in one operational loop.",
    icon: BookOpen,
    items: [
      "Mindris is a local-first resume workflow studio: scrape a role, analyze fit, adapt the CV, generate supporting artifacts, and track the application.",
      "The frontend is an operating surface only. Durable state, destructive actions, provider orchestration, and secrets stay behind backend APIs.",
    ],
    steps: ["Import or create a resume", "Attach a real job", "Generate and track artifacts"],
    tips: ["Use History when you need to know which artifact came from which job."],
  },
  {
    title: "1. Start from a job",
    badge: "Input",
    summary: "Turn a job URL into structured company, role and keyword signals.",
    icon: Search,
    items: [
      "Paste a job URL in Workflow, ATS Score, or CV Builder to extract structured signals from the offer.",
      "Review the company profile, role-fit hints, and ATS evidence before editing the resume.",
    ],
    steps: ["Paste the job URL", "Review extracted signals", "Keep the job linked to later artifacts"],
    tips: ["Do not edit blindly: inspect missing keywords before changing the CV."],
  },
  {
    title: "2. Shape the resume",
    badge: "CV Studio",
    summary: "Edit content and presentation while the backend owns defaults and exports.",
    icon: FileText,
    items: [
      "Use CV Builder for section edits, template switching, exports, multilingual variants, and resume duplication.",
      "Use the Style Studio for layout, typography, colors, and template-specific presentation rules.",
    ],
    steps: ["Choose Simple, Normal or Advanced", "Edit content sections", "Tune Style only when needed"],
    tips: ["Simple mode is the safest path for non-technical users."],
  },
  {
    title: "3. Drive the application workflow",
    badge: "Beta workflow",
    summary: "Connect job, resume, ATS report, cover letter and tracker entry.",
    icon: GitBranch,
    items: [
      "Use Workflow to connect a job scrape, a resume revision, an ATS report, a cover letter, and a tracker entry.",
      "Use Tracker for follow-ups and lifecycle progression once the opportunity is ready to move.",
    ],
    steps: ["Create an opportunity", "Link resume and generated artifacts", "Move it to Tracker"],
    tips: ["Workflow is intentionally marked beta until every artifact history is fully mature."],
  },
  {
    title: "4. Operate the runtime",
    badge: "Runtime",
    summary: "Configure local services, model defaults and diagnostics from one place.",
    icon: Settings2,
    items: [
      "Use Configuration to set task defaults, ingestion/runtime behavior, diagnostics, and write-only secret slots.",
      "Use History for auditability across scrapes, ATS reports, cover letters, workflow transitions, revisions, and tracker activity.",
    ],
    steps: ["Check RuntimeGate", "Set task defaults", "Verify diagnostics before long runs"],
    tips: ["Provider keys are write-only: the UI should never display raw secret values."],
  },
  {
    title: "Client and server boundary",
    badge: "Architecture",
    summary: "The browser renders workflows; Python/Bun services own product state and execution.",
    icon: ShieldCheck,
    items: [
      "Browser code must not become a service layer. It calls APIs, renders state, and stores only short-lived UI preferences such as theme.",
      "Local browser access is allowed through the loopback runtime boundary. External callers and operator scripts use X-API-Key.",
      "Secrets, durable resume state, destructive cleanup, and provider orchestration remain backend-owned.",
    ],
    steps: ["Frontend calls APIs", "Backend persists state", "Renderer exports HTML/PDF"],
    tips: ["If a rule decides product behavior, it belongs in the backend contract."],
  },
  {
    title: "Security and destructive actions",
    badge: "Safety",
    summary: "Keep secret handling, cleanup and destructive flows explicit and auditable.",
    icon: LockKeyhole,
    items: [
      "Mindris must never expose raw secret values in UI responses or logs.",
      "Bulk destructive actions require explicit confirmation and must be executed transactionally by the backend.",
    ],
    steps: ["Confirm destructive actions", "Execute server-side", "Write audit history"],
    tips: ["Prefer recoverable changes and revisions over silent overwrites."],
  },
  {
    title: "Recommended daily workflow",
    badge: "Best path",
    summary: "A practical order for using Mindris efficiently on a real application.",
    icon: Workflow,
    items: [
      "Scrape the role, inspect ATS and company signals, tailor the resume, generate the cover letter, then push the opportunity into the tracker.",
      "Use History when you need lineage, revision context, or to verify which artifact was used for a given application.",
    ],
    steps: ["Scrape", "Score", "Tailor", "Generate", "Track"],
    tips: ["Run ATS again after major resume edits to verify the impact."],
  },
];
