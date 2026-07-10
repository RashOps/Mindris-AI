"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type HeaderMenuAction = {
  label: string;
  hint: string;
  disabled?: boolean;
  onSelect: () => void;
};

export function HeaderActionMenu({
  label,
  icon,
  isOpen,
  onToggle,
  onClose,
  actions,
}: {
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  actions: HeaderMenuAction[];
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="app-toolbar-button inline-flex h-9 cursor-pointer items-center gap-2 px-3 text-xs font-medium"
      >
        {icon}
        <span>{label}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={`${label} menu`}
          className="absolute right-0 top-11 z-40 min-w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                onClose();
                action.onSelect();
              }}
              className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm font-medium text-foreground">{action.label}</span>
              <span className="text-[11px] text-muted-foreground">{action.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
