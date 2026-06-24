"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, Server, X } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { APP_NAV_ITEMS, SIDEBAR_WIDTH_EXPANDED } from "@/config/layout";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  contentClassName?: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 no-underline" title="Back to home">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
        M
      </div>
      <div className={cn("min-w-0", collapsed && "hidden")}>
        <p className="truncate text-sm font-semibold text-slate-950">Mindris AI</p>
        <p className="truncate text-xs text-slate-500">Open resume studio</p>
      </div>
    </Link>
  );
}

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {APP_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors",
              collapsed && "justify-center px-2",
              active
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={17} />
            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  title,
  description,
  actions,
  contentClassName,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const sidebarWidth = desktopCollapsed ? 72 : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white px-3 py-5 transition-[width] duration-200 lg:block"
        style={{ width: sidebarWidth }}
        onMouseEnter={() => setDesktopCollapsed(false)}
        onMouseLeave={() => setDesktopCollapsed(true)}
        onFocus={() => setDesktopCollapsed(false)}
      >
        <div className="flex items-center justify-between gap-2">
          <Brand collapsed={desktopCollapsed} />
          <Button
            aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => setDesktopCollapsed((value) => !value)}
          >
            {desktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
        <div className="mt-8">
          <NavLinks collapsed={desktopCollapsed} />
        </div>
        <div className={cn(
          "absolute bottom-4 left-3 right-3 rounded-lg border border-slate-200 bg-slate-50 p-3",
          desktopCollapsed && "hidden",
        )}>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700">
            <Server size={14} />
            Local services
          </div>
          <p className="text-xs leading-5 text-slate-500">API : 8000</p>
          <p className="text-xs leading-5 text-slate-500">Renderer : 4000</p>
          <p className="text-xs leading-5 text-slate-500">Web : 3000</p>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden">
          <div className="h-full w-72 border-r border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <Brand />
              <Button
                aria-label="Close navigation"
                size="icon"
                variant="ghost"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div
        className="transition-[padding] duration-200 lg:pl-[var(--app-sidebar-width)]"
        style={{ "--app-sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-label="Open navigation"
                size="icon"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={18} />
              </Button>
              <div className="min-w-0">
                {title && (
                  <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="truncate text-sm text-slate-500">{description}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </header>
        <main className={cn("min-h-[calc(100vh-4rem)]", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
