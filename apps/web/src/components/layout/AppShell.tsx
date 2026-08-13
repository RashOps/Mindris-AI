"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
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
import { useI18n } from "@/i18n/I18nProvider";
import { PrivacyConsentGate } from "@/components/privacy/PrivacyConsentGate";

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
  const { messages } = useI18n();
  return (
    <Link
      href="/"
      className="flex items-center gap-3 no-underline"
      title={messages.app.backHome}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
        M
      </div>
      <div className={cn("min-w-0", collapsed && "hidden")}>
        <p className="truncate text-sm font-semibold text-foreground">
          {messages.app.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {messages.app.tagline}
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
  const { messages } = useI18n();

  return (
    <nav className="space-y-1">
      {APP_NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        const copy = messages.tools[item.id];
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
                ? [copy.label, "badge" in copy ? copy.badge : undefined]
                    .filter(Boolean)
                    .join(" ")
                : undefined
            }
          >
            <Icon size={17} />
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate">
                {copy.label}
                {"badge" in copy && copy.badge && (
                  <sup
                    className={cn(
                      "ml-1 inline-flex translate-y-[-0.28em] rounded-full border px-1 py-0 text-[8px] font-black uppercase leading-none tracking-[0.12em]",
                      active
                        ? "border-primary-foreground/40 bg-primary-foreground/15 text-primary-foreground"
                        : "border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
                    )}
                  >
                    {copy.badge}
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
  const { messages } = useI18n();
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
              title={collapsed ? messages.sidebar.configuration.label : undefined}
            >
              <configuration.icon size={17} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-left">
                  {messages.sidebar.configuration.label}
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
  const { messages } = useI18n();
  const hydrateAppSettings = useCVStore((state) => state.hydrateAppSettings);
  const privacyMode = useCVStore(
    (state) => state.appSettings.privacy_mode,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const desktopSidebar = resolveDesktopSidebarLayout(desktopCollapsed);

  useEffect(() => {
    void hydrateAppSettings();
    const rehydrate = () => void hydrateAppSettings();
    window.addEventListener("mindris:privacy-mode-changed", rehydrate);
    return () =>
      window.removeEventListener("mindris:privacy-mode-changed", rehydrate);
  }, [hydrateAppSettings]);

  return (
    <RuntimeGate>
      <PrivacyConsentGate />
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
                desktopCollapsed ? messages.sidebar.expand : messages.sidebar.collapse
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
                  aria-label={messages.sidebar.closeNavigation}
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
            <div className="flex min-h-16 flex-col items-stretch justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  aria-label={messages.sidebar.openNavigation}
                  size="icon"
                  variant="ghost"
                  className="lg:hidden"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} />
                </Button>
                <div className="min-w-0">
                  {(title || messages.app.workspaceTitle) && (
                    <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
                      {title || messages.app.workspaceTitle}
                    </h1>
                  )}
                  {(description || messages.app.workspaceDescription) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {description || messages.app.workspaceDescription}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground"
                  title={messages.privacy.modeTitle}
                >
                  <ShieldCheck size={14} className="text-primary" />
                  {privacyMode === "local_strict"
                    ? messages.privacy.local
                    : privacyMode === "private_cloud"
                      ? messages.privacy.privateCloud
                      : messages.privacy.fullCloud}
                </span>
                <ThemeToggle />
                {actions}
              </div>
            </div>
          </header>
          <main
            className={cn(
              "min-h-[calc(100dvh-7.5rem-1px)] sm:min-h-[calc(100dvh-4.5rem-1px)]",
              contentClassName,
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </RuntimeGate>
  );
}
