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
    <Link
      href="/"
      className="flex items-center gap-3 no-underline"
      title="Back to home"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
        M
      </div>
      <div className={cn("min-w-0", collapsed && "hidden")}>
        <p className="truncate text-sm font-semibold text-foreground">
          Mindris AI
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Open resume studio
        </p>
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
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            title={
              collapsed
                ? [item.label, item.badge].filter(Boolean).join(" ")
                : undefined
            }
          >
            <Icon size={17} />
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate">
                {item.label}
                {item.badge && (
                  <sup
                    className={cn(
                      "ml-1 inline-flex translate-y-[-0.28em] rounded-full border px-1 py-0 text-[8px] font-black uppercase leading-none tracking-[0.12em]",
                      active
                        ? "border-primary-foreground/40 bg-primary-foreground/15 text-primary-foreground"
                        : "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
                    )}
                  >
                    {item.badge}
                  </sup>
                )}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarUtilities({ collapsed = false }: { collapsed?: boolean }) {
  const configuration = APP_SIDEBAR_SECTIONS.find(
    (section) => section.id === "configuration",
  );

  return (
    <div className="space-y-3">
      {configuration && (
        <ConfigurationDrawer
          trigger={
            <Button
              variant="ghost"
              className={cn(
                "w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                collapsed ? "justify-center px-2" : "justify-start gap-3",
              )}
              title={collapsed ? configuration.label : undefined}
            >
              <configuration.icon size={17} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-left">
                  {configuration.label}
                </span>
              )}
            </Button>
          }
        />
      )}
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
      <div className="min-h-screen bg-background text-foreground">
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-card px-3 py-5 transition-[width] duration-200 lg:block"
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
              aria-label={
                desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              size="icon"
              variant="ghost"
              className="shrink-0"
              onClick={() =>
                setDesktopCollapsed((value) =>
                  nextDesktopSidebarCompactState(value, "manual-toggle"),
                )
              }
            >
              {desktopCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
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
            <div className="h-full w-72 border-r border-border bg-card p-4 shadow-xl">
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
          style={
            {
              "--app-sidebar-width": `${desktopSidebar.reserveWidth}px`,
            } as CSSProperties
          }
        >
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
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
                    <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="truncate text-sm text-muted-foreground">
                      {description}
                    </p>
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
