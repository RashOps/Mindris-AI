import {
  BarChart3,
  BookOpen,
  Briefcase,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  Settings2,
  Server,
  type LucideIcon,
} from "lucide-react";

export type AppNavItemId =
  | "dashboard"
  | "cv-creator"
  | "ats-score"
  | "workflow"
  | "tracker"
  | "history"
  | "guide"
  | "markdown";

export interface ToolDefinition {
  id: AppNavItemId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  href: string;
  accentColor: string;
  accentVar: string;
  description: string;
}

export interface AppSidebarSectionDefinition {
  id: "configuration" | "local-services";
  label: string;
  icon: LucideIcon;
  description: string;
  collapseMode: "icon" | "hidden";
}

export const APP_NAV_ITEMS: ToolDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    icon: LayoutDashboard,
    href: "/dashboard",
    accentColor: "#2563eb",
    accentVar: "--tool-dashboard",
    description: "Resume library, templates and MVP status",
  },
  {
    id: "cv-creator",
    label: "CV Builder",
    shortLabel: "CV",
    icon: FileText,
    href: "/tools/cv-creator",
    accentColor: "#2563eb",
    accentVar: "--tool-cv-creator",
    description: "Structured resume builder with live preview",
  },
  {
    id: "ats-score",
    label: "ATS Score",
    shortLabel: "ATS",
    icon: BarChart3,
    href: "/tools/ats-score",
    accentColor: "#7c3aed",
    accentVar: "--tool-ats-score",
    description: "Keyword analysis and ATS compatibility report",
  },
  {
    id: "workflow",
    label: "Workflow",
    shortLabel: "Flow",
    icon: GitBranch,
    href: "/tools/workflow",
    accentColor: "#1d4ed8",
    accentVar: "--tool-workflow",
    description: "Guided opportunity workflow from scrape to application",
  },
  {
    id: "tracker",
    label: "Tracker",
    shortLabel: "Track",
    icon: Briefcase,
    href: "/tools/tracker",
    accentColor: "#0f766e",
    accentVar: "--tool-tracker",
    description: "Application tracking board",
  },
  {
    id: "history",
    label: "History",
    shortLabel: "Audit",
    icon: History,
    href: "/tools/history",
    accentColor: "#0f172a",
    accentVar: "--tool-history",
    description: "Unified activity ledger and artifact lineage",
  },
  {
    id: "guide",
    label: "Guide",
    shortLabel: "Guide",
    icon: BookOpen,
    href: "/tools/guide",
    accentColor: "#334155",
    accentVar: "--tool-guide",
    description: "Internal product guide, workflow documentation and operating rules",
  },
  {
    id: "markdown",
    label: "Markdown PDF",
    shortLabel: "PDF",
    icon: FileText,
    href: "/tools/markdown",
    accentColor: "#475569",
    accentVar: "--tool-markdown",
    description: "Convert Markdown documents to PDF",
  },
] as const;

export const TOOLS = APP_NAV_ITEMS.filter((item) => item.id !== "dashboard");

export const APP_SIDEBAR_SECTIONS: AppSidebarSectionDefinition[] = [
  {
    id: "configuration",
    label: "Configuration",
    icon: Settings2,
    description: "Configure providers, models, secrets and local runtime behavior.",
    collapseMode: "icon",
  },
  {
    id: "local-services",
    label: "Local services",
    icon: Server,
    description: "Current local endpoints and runtime ports for the workspace.",
    collapseMode: "hidden",
  },
] as const;

export const SIDEBAR_WIDTH_EXPANDED = 236;
export const SIDEBAR_WIDTH_COMPACT = 72;

export function resolveDesktopSidebarLayout(compact: boolean): {
  asideWidth: number;
  reserveWidth: number;
  compact: boolean;
} {
  const asideWidth = compact ? SIDEBAR_WIDTH_COMPACT : SIDEBAR_WIDTH_EXPANDED;
  return {
    asideWidth,
    reserveWidth: asideWidth,
    compact,
  };
}

export type DesktopSidebarTrigger =
  | "pointer-enter"
  | "pointer-leave"
  | "focus-enter"
  | "manual-toggle";

export function nextDesktopSidebarCompactState(
  compact: boolean,
  trigger: DesktopSidebarTrigger,
): boolean {
  switch (trigger) {
    case "pointer-enter":
    case "focus-enter":
      return false;
    case "pointer-leave":
      return true;
    case "manual-toggle":
      return !compact;
    default:
      return compact;
  }
}
