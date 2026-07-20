import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { TemplatePreviewStyle } from "@/lib/customization-catalogue";

import { Slider } from "./controls";

export type VisualOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
  preview?: ReactNode;
};

export function VisualOptionGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns = 3,
}: {
  label: string;
  value: T;
  options: VisualOption<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3";

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-foreground">{label}</legend>
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`group flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:bg-accent hover:text-foreground"
              }`}
            >
              {option.preview ? (
                <span aria-hidden="true" className="flex h-8 w-full items-center justify-center">
                  {option.preview}
                </span>
              ) : null}
              <span className="text-[11px] font-semibold leading-tight">
                {option.label}
              </span>
              {option.description ? (
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function LayoutPreview({
  columns,
  sidebar,
}: {
  columns: 1 | 2;
  sidebar?: "none" | "left" | "right";
}) {
  const showSidebar = columns === 2 && sidebar !== "none";
  return (
    <span className="flex h-8 w-12 overflow-hidden rounded border border-current/40 bg-card p-1">
      {showSidebar && sidebar === "left" ? (
        <span className="mr-1 w-2 rounded-sm bg-primary/70" />
      ) : null}
      <span className="flex-1 space-y-1 pt-0.5">
        <span className="block h-0.5 rounded bg-current/60" />
        <span className="block h-0.5 w-4/5 rounded bg-current/35" />
        <span className="block h-0.5 rounded bg-current/35" />
      </span>
      {showSidebar && sidebar === "right" ? (
        <span className="ml-1 w-2 rounded-sm bg-primary/70" />
      ) : null}
    </span>
  );
}

export function TemplatePreview({
  style,
  accent,
}: {
  style: TemplatePreviewStyle;
  accent: string;
}) {
  const sidebar = ["atlas", "sidebar", "terminal", "studio", "executive", "signal"].includes(style);
  const sidebarLeft = style === "sidebar" || style === "studio";
  const headerBand = style === "executive";
  const centered = style === "ledger" || style === "scholar";
  const cards = style === "signal";
  const compact = style === "terminal";
  const visualStyle = { "--template-accent": accent } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={visualStyle}
      className={`relative flex h-20 w-14 overflow-hidden rounded-sm border border-slate-300 bg-white p-1 shadow-sm ${
        sidebarLeft ? "flex-row-reverse" : ""
      }`}
    >
      {headerBand ? (
        <span className="absolute inset-x-0 top-0 h-3 bg-[var(--template-accent)]" />
      ) : null}
      <span className={`min-w-0 flex-1 ${headerBand ? "pt-3" : ""}`}>
        <span className={`mb-1 flex flex-col gap-0.5 ${centered ? "items-center" : "items-start"}`}>
          <span className="h-1 w-7 rounded-sm bg-slate-700" />
          <span className="h-0.5 w-5 rounded-sm bg-[var(--template-accent)]" />
        </span>
        <span className={`block h-0.5 bg-[var(--template-accent)] ${centered ? "mx-auto w-8" : "w-6"}`} />
        <span className={`mt-1 grid gap-0.5 ${cards ? "grid-cols-2" : "grid-cols-1"}`}>
          {[0, 1, 2, 3, 4].map((line) => (
            <span
              key={line}
              className={`block rounded-sm bg-slate-300 ${cards ? "h-2" : compact ? "h-px" : "h-0.5"}`}
            />
          ))}
        </span>
      </span>
      {sidebar ? (
        <span className="mx-0.5 w-3 shrink-0 rounded-[1px] bg-[color-mix(in_srgb,var(--template-accent)_16%,white)] pt-2">
          <span className="mx-auto block h-3 w-3/5 rounded-full bg-[var(--template-accent)]/70" />
          <span className="mx-auto mt-1 block h-px w-2/3 bg-[var(--template-accent)]/50" />
          <span className="mx-auto mt-1 block h-px w-2/3 bg-[var(--template-accent)]/30" />
        </span>
      ) : null}
    </span>
  );
}

export function AlignmentPreview({ value }: { value: "left" | "center" | "right" }) {
  const alignment =
    value === "left" ? "items-start" : value === "right" ? "items-end" : "items-center";
  return (
    <span className={`flex w-12 flex-col gap-1 ${alignment}`}>
      <span className="h-1 w-7 rounded bg-current/70" />
      <span className="h-0.5 w-10 rounded bg-current/35" />
      <span className="h-0.5 w-8 rounded bg-current/35" />
    </span>
  );
}

export function SteppedSlider(props: React.ComponentProps<typeof Slider>) {
  return <Slider {...props} showSteps />;
}

export function ToggleGrid<T extends string>({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: T[];
  options: { value: T; label: string }[];
  onChange: (value: T, enabled: boolean) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            {option.label}
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              onChange={(event) => onChange(option.value, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ColorSwatchPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-background"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="block font-mono text-[10px] uppercase text-muted-foreground">
          {value}
        </span>
      </span>
    </label>
  );
}
