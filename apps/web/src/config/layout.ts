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
import { PRODUCT_COPY } from "@/lib/product-copy";

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
  badge?: string;
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
    label: PRODUCT_COPY.tools.dashboard.label,
    shortLabel: PRODUCT_COPY.tools.dashboard.shortLabel,
    icon: LayoutDashboard,
    href: "/dashboard",
    accentColor: "#2563eb",
    accentVar: "--tool-dashboard",
    description: PRODUCT_COPY.tools.dashboard.description,
  },
  {
    id: "cv-creator",
    label: PRODUCT_COPY.tools["cv-creator"].label,
    shortLabel: PRODUCT_COPY.tools["cv-creator"].shortLabel,
    icon: FileText,
    href: "/tools/cv-creator",
    accentColor: "#2563eb",
    accentVar: "--tool-cv-creator",
    description: PRODUCT_COPY.tools["cv-creator"].description,
  },
  {
    id: "ats-score",
    label: PRODUCT_COPY.tools["ats-score"].label,
    shortLabel: PRODUCT_COPY.tools["ats-score"].shortLabel,
    icon: BarChart3,
    href: "/tools/ats-score",
    accentColor: "#7c3aed",
    accentVar: "--tool-ats-score",
    description: PRODUCT_COPY.tools["ats-score"].description,
  },
  {
    id: "workflow",
    label: PRODUCT_COPY.tools.workflow.label,
    shortLabel: PRODUCT_COPY.tools.workflow.shortLabel,
    badge: PRODUCT_COPY.tools.workflow.badge,
    icon: GitBranch,
    href: "/tools/workflow",
    accentColor: "#1d4ed8",
    accentVar: "--tool-workflow",
    description: PRODUCT_COPY.tools.workflow.description,
  },
  {
    id: "tracker",
    label: PRODUCT_COPY.tools.tracker.label,
    shortLabel: PRODUCT_COPY.tools.tracker.shortLabel,
    icon: Briefcase,
    href: "/tools/tracker",
    accentColor: "#0f766e",
    accentVar: "--tool-tracker",
    description: PRODUCT_COPY.tools.tracker.description,
  },
  {
    id: "history",
    label: PRODUCT_COPY.tools.history.label,
    shortLabel: PRODUCT_COPY.tools.history.shortLabel,
    icon: History,
    href: "/tools/history",
    accentColor: "#0f172a",
    accentVar: "--tool-history",
    description: PRODUCT_COPY.tools.history.description,
  },
  {
    id: "guide",
    label: PRODUCT_COPY.tools.guide.label,
    shortLabel: PRODUCT_COPY.tools.guide.shortLabel,
    icon: BookOpen,
    href: "/tools/guide",
    accentColor: "#334155",
    accentVar: "--tool-guide",
    description: PRODUCT_COPY.tools.guide.description,
  },
  {
    id: "markdown",
    label: PRODUCT_COPY.tools.markdown.label,
    shortLabel: PRODUCT_COPY.tools.markdown.shortLabel,
    icon: FileText,
    href: "/tools/markdown",
    accentColor: "#475569",
    accentVar: "--tool-markdown",
    description: PRODUCT_COPY.tools.markdown.description,
  },
] as const;

export const TOOLS = APP_NAV_ITEMS.filter((item) => item.id !== "dashboard");

export const APP_SIDEBAR_SECTIONS: AppSidebarSectionDefinition[] = [
  {
    id: "configuration",
    label: PRODUCT_COPY.sidebar.configuration.label,
    icon: Settings2,
    description: PRODUCT_COPY.sidebar.configuration.description,
    collapseMode: "icon",
  },
  {
    id: "local-services",
    label: PRODUCT_COPY.sidebar.localServices.label,
    icon: Server,
    description: PRODUCT_COPY.sidebar.localServices.description,
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
  "pointer-enter" | "pointer-leave" | "focus-enter" | "manual-toggle";

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
