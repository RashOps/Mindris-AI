"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { ConfigurationDrawer } from "@/components/settings/ConfigurationDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  APP_NAV_ITEMS,
  APP_SIDEBAR_SECTIONS,
  nextDesktopSidebarCompactState,
  resolveDesktopSidebarLayout,
} from "@/config/layout";
import { cn } from "@/lib/utils";
import { RuntimeGate } from "@/components/layout/RuntimeGate";
import { useCVStore } from "@/store/useCVStore";

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
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white dark:bg-slate-100 dark:text-slate-950">
        M
      </div>
      <div className={cn("min-w-0", collapsed && "hidden")}>
        <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">Mindris AI</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">Open resume studio</p>
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
                ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100",
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

function SidebarUtilities({ collapsed = false }: { collapsed?: boolean }) {
  const configuration = APP_SIDEBAR_SECTIONS.find((section) => section.id === "configuration");
  const localServices = APP_SIDEBAR_SECTIONS.find((section) => section.id === "local-services");

  return (
    <div className="space-y-3">
      {configuration && (
        <ConfigurationDrawer
          trigger={(
            <Button
              variant="ghost"
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                collapsed ? "justify-center px-2" : "justify-start gap-3",
              )}
              title={collapsed ? configuration.label : undefined}
            >
              <configuration.icon size={17} />
              {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{configuration.label}</span>}
            </Button>
          )}
        />
      )}

      {localServices && (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/60",
            collapsed ? "max-h-0 border-transparent p-0 opacity-0" : "max-h-40 p-3 opacity-100",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <localServices.icon size={14} />
            {localServices.label}
          </div>
          <p className="mb-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{localServices.description}</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">API : 8000</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Renderer : 4000</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Web : 3000</p>
        </div>
      )}

      {!collapsed && <ThemeToggle />}
    </div>
  );
}

export function AppShell({
  children,
  title,
  description,
  actions,
  contentClassName,
}: AppShellProps) {
  const hydrateAppSettings = useCVStore((state) => state.hydrateAppSettings);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const desktopSidebar = resolveDesktopSidebarLayout(desktopCollapsed);

  useEffect(() => {
    void hydrateAppSettings();
  }, [hydrateAppSettings]);

  return (
    <RuntimeGate>
      <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white px-3 py-5 transition-[width] duration-200 lg:block dark:border-slate-800 dark:bg-slate-950"
          style={{ width: desktopSidebar.asideWidth }}
          onMouseEnter={() =>
            setDesktopCollapsed((value) =>
              nextDesktopSidebarCompactState(value, "pointer-enter"),
            )
          }
          onMouseLeave={() =>
            setDesktopCollapsed((value) =>
              nextDesktopSidebarCompactState(value, "pointer-leave"),
            )
          }
          onFocus={() =>
            setDesktopCollapsed((value) =>
              nextDesktopSidebarCompactState(value, "focus-enter"),
            )
          }
        >
          <div className="flex items-center justify-between gap-2">
            <Brand collapsed={desktopCollapsed} />
            <Button
              aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              size="icon"
              variant="ghost"
              className="shrink-0"
              onClick={() =>
                setDesktopCollapsed((value) =>
                  nextDesktopSidebarCompactState(value, "manual-toggle"),
                )
              }
            >
              {desktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
          <div className="mt-8">
            <NavLinks collapsed={desktopCollapsed} />
          </div>
          <div className="absolute bottom-4 left-3 right-3">
            <SidebarUtilities collapsed={desktopCollapsed} />
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden">
            <div className="h-full w-72 border-r border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
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
              <div className="mt-6">
                <SidebarUtilities />
              </div>
            </div>
          </div>
        )}

        <div
          className="transition-[padding] duration-200 lg:pl-[var(--app-sidebar-width)]"
          style={{ "--app-sidebar-width": `${desktopSidebar.reserveWidth}px` } as CSSProperties}
        >
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
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
                    <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{description}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                {actions}
              </div>
            </div>
          </header>
          <main className={cn("min-h-[calc(100vh-4rem)]", contentClassName)}>
            {children}
          </main>
        </div>
      </div>
    </RuntimeGate>
  );
}
