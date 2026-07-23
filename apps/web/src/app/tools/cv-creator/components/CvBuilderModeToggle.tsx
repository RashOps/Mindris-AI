"use client";

import { useI18n } from "@/i18n/I18nProvider";

export type CvBuilderUiMode = "simple" | "normal" | "advanced";

export const CV_BUILDER_UI_MODE_STORAGE_KEY = "mindris.cvBuilder.uiMode";

export function isCvBuilderUiMode(
  value: string | null,
): value is CvBuilderUiMode {
  return value === "simple" || value === "normal" || value === "advanced";
}

export function CvBuilderModeToggle({
  value,
  onChange,
}: {
  value: CvBuilderUiMode;
  onChange: (mode: CvBuilderUiMode) => void;
}) {
  const { messages } = useI18n();
  const copy = messages.pages.cvBuilder;
  const modes: { value: CvBuilderUiMode; label: string; description: string }[] = [
    { value: "simple", label: copy.simple, description: copy.simpleDescription },
    { value: "normal", label: copy.normal, description: copy.normalDescription },
    { value: "advanced", label: copy.advanced, description: copy.advancedDescription },
  ];
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
      role="radiogroup"
      aria-label={copy.modeLabel}
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          role="radio"
          aria-checked={value === mode.value}
          title={mode.description}
          onClick={() => onChange(mode.value)}
          className={`h-7 cursor-pointer rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
            value === mode.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
