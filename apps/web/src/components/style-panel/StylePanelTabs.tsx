import type { LucideIcon } from "lucide-react";

export type StylePanelTab =
  | "document"
  | "template"
  | "layout"
  | "typography"
  | "spacing"
  | "colors"
  | "photo"
  | "header"
  | "links"
  | "sections"
  | "advanced";

interface StylePanelTabsProps {
  activeTab: StylePanelTab;
  advanced: boolean;
  tabs: { key: StylePanelTab; label: string; icon: LucideIcon }[];
  onChange: (tab: StylePanelTab) => void;
}

export function StylePanelTabs({
  activeTab,
  advanced,
  tabs,
  onChange,
}: StylePanelTabsProps) {
  if (tabs.length <= 1) return null;

  return (
    <div
      className={`grid shrink-0 border-b border-border ${advanced ? "grid-cols-4" : "grid-cols-3"}`}
      role="tablist"
      aria-label="Réglages de style"
      onKeyDown={(event) => {
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
        );
        const current = elements.indexOf(document.activeElement as HTMLElement);
        if (current < 0) return;
        let next = current;
        if (event.key === "ArrowRight") next = (current + 1) % elements.length;
        else if (event.key === "ArrowLeft")
          next = (current - 1 + elements.length) % elements.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = elements.length - 1;
        else return;
        event.preventDefault();
        elements[next]?.focus();
        elements[next]?.click();
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          id={`cv-style-tab-${tab.key}`}
          role="tab"
          aria-selected={activeTab === tab.key}
          aria-controls={`cv-style-panel-${tab.key}`}
          tabIndex={activeTab === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={`flex min-w-0 cursor-pointer flex-col items-center gap-0.5 border-b-2 px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-colors ${
            activeTab === tab.key
              ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

