import {
  BarChart3,
  Briefcase,
  FileText,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export type AppNavItemId = "dashboard" | "cv-creator" | "ats-score" | "tracker" | "markdown";

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

export const SIDEBAR_WIDTH_EXPANDED = 236;
