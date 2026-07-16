"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ToolbarSelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export function ToolbarSelect({
  value,
  options,
  placeholder = "Select",
  ariaLabel,
  onChange,
  triggerClassName = "app-select h-9 px-2 text-xs",
  menuClassName = "min-w-44",
  disabled = false,
}: {
  value: string;
  options: ToolbarSelectOption[];
  placeholder?: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((option) => option.value === value);
  const label = current?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`${triggerClassName} inline-flex cursor-pointer items-center justify-between gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={ariaLabel}
          className={`absolute left-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-xl ${menuClassName}`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitem"
              disabled={option.disabled}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                option.value === value ? "bg-accent text-accent-foreground" : "hover:bg-accent"
              }`}
            >
              <span className="min-w-0 truncate text-sm font-medium text-foreground">{option.label}</span>
              {option.hint ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">{option.hint}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
