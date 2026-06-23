/**
 * Mindris AI — Tools Layout Configuration
 *
 * Change a single value here to switch the tools navigation mode globally
 * without touching any component code.
 *
 * TOOLS_NAV_MODE:
 *  - 'sidebar'  → Collapsible left sidebar (icon + label, icon-only when collapsed)
 *  - 'topbar'   → Horizontal top navigation bar (tabs style)
 */

export type ToolsNavMode = 'sidebar' | 'topbar';

// ── 👇 Change this single value to switch layout globally ─────────────────────
export const TOOLS_NAV_MODE: ToolsNavMode = 'sidebar';

// ── Tool registry ─────────────────────────────────────────────────────────────

export interface ToolDefinition {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;        // Emoji icon for sidebar / topbar
  href: string;
  accentColor: string; // CSS hex — used for glow, active indicator
  accentVar: string;   // CSS custom property name
  description: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'cv-creator',
    label: 'CV Creator',
    shortLabel: 'CV',
    icon: '🎯',
    href: '/tools/cv-creator',
    accentColor: '#2563eb',
    accentVar: '--tool-cv-creator',
    description: 'Tailored CV builder with AI-powered optimization',
  },
  {
    id: 'ats-score',
    label: 'ATS Score',
    shortLabel: 'ATS',
    icon: '⚡',
    href: '/tools/ats-score',
    accentColor: '#8b5cf6',
    accentVar: '--tool-ats-score',
    description: 'Deep keyword analysis & ATS compatibility report',
  },
  {
    id: 'tracker',
    label: 'Tracker',
    shortLabel: 'Track',
    icon: '📋',
    href: '/tools/tracker',
    accentColor: '#f59e0b',
    accentVar: '--tool-tracker',
    description: 'Application tracking board',
  },
  {
    id: 'markdown',
    label: 'Markdown → PDF',
    shortLabel: 'PDF',
    icon: '📝',
    href: '/tools/markdown',
    accentColor: '#10b981',
    accentVar: '--tool-markdown',
    description: 'Convert Markdown CVs to pixel-perfect PDFs',
  },
] as const;

// ── Layout constants ──────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH_EXPANDED = 220; // px
export const SIDEBAR_WIDTH_COLLAPSED = 60;  // px — icon-only mode
