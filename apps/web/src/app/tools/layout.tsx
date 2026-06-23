'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  TOOLS,
  TOOLS_NAV_MODE,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  type ToolDefinition,
} from '@/config/layout';

// ── Helper ────────────────────────────────────────────────────────────────────

function isActiveTool(pathname: string, tool: ToolDefinition): boolean {
  return pathname.startsWith(tool.href);
}

// ── Sidebar Nav ───────────────────────────────────────────────────────────────

function SidebarNav({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <aside
      className="flex flex-col shrink-0 h-full border-r transition-[width] duration-200"
      style={{
        width,
        background: 'rgba(10,15,26,0.95)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 py-3.5 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-base shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #818cf8)' }}
          >
            M
          </div>
          {!collapsed && (
            <span
              className="font-semibold text-sm tracking-tight whitespace-nowrap overflow-hidden"
              style={{ color: '#f1f5f9', fontFamily: 'var(--font-space)' }}
            >
              Mindris AI
            </span>
          )}
        </Link>
      </div>

      {/* Tool Links */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        <p
          className={`text-[10px] font-semibold uppercase tracking-widest mb-2 px-2 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-50'}`}
          style={{ color: '#94a3b8' }}
        >
          Tools
        </p>
        {TOOLS.map((tool) => {
          const active = isActiveTool(pathname, tool);
          return (
            <Link
              key={tool.id}
              href={tool.href}
              title={collapsed ? tool.label : undefined}
              className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 no-underline group"
              style={{
                background: active ? `${tool.accentColor}18` : 'transparent',
                color: active ? tool.accentColor : '#94a3b8',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {/* Active indicator */}
              <span
                className="shrink-0 w-0.5 h-5 rounded-full transition-opacity duration-150"
                style={{
                  background: tool.accentColor,
                  opacity: active ? 1 : 0,
                  marginLeft: -2,
                }}
              />
              <span className="text-base shrink-0 leading-none">{tool.icon}</span>
              {!collapsed && (
                <span
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  style={{ fontFamily: 'var(--font-space)' }}
                >
                  {tool.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <ThemeToggle />

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-10 w-full border-t transition-colors duration-150"
        style={{
          borderColor: 'rgba(255,255,255,0.07)',
          color: '#475569',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#94a3b8';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = '#475569';
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="text-xs select-none">{collapsed ? '›' : '‹'}</span>
      </button>
    </aside>
  );
}

// ── Topbar Nav ────────────────────────────────────────────────────────────────

function TopbarNav() {
  const pathname = usePathname();

  return (
    <header
      className="flex items-center gap-0 h-12 border-b shrink-0 px-4"
      style={{
        background: 'rgba(10,15,26,0.97)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 no-underline mr-6">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #2563eb, #818cf8)' }}
        >
          M
        </div>
        <span
          className="font-semibold text-sm"
          style={{ color: '#f1f5f9', fontFamily: 'var(--font-space)' }}
        >
          Mindris AI
        </span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mr-5" />

      {/* Tool tabs */}
      <nav className="flex items-center gap-1">
        {TOOLS.map((tool) => {
          const active = isActiveTool(pathname, tool);
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline"
              style={{
                background: active ? `${tool.accentColor}18` : 'transparent',
                color: active ? tool.accentColor : '#64748b',
                borderBottom: active ? `2px solid ${tool.accentColor}` : '2px solid transparent',
              }}
            >
              <span>{tool.icon}</span>
              <span style={{ fontFamily: 'var(--font-space)' }}>{tool.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

// ── Tools Layout ──────────────────────────────────────────────────────────────

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: '#0a0f1a' }}
    >
      {TOOLS_NAV_MODE === 'sidebar' ? (
        <>
          <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
          <main className="flex-1 overflow-auto">{children}</main>
        </>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopbarNav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      )}
    </div>
  );
}
