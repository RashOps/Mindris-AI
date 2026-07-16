"use client";

export type CvBuilderUiMode = "simple" | "normal" | "advanced";

export const CV_BUILDER_UI_MODE_STORAGE_KEY = "mindris.cvBuilder.uiMode";

const MODES: { value: CvBuilderUiMode; label: string; description: string }[] =
  [
    { value: "simple", label: "Simple", description: "Contrôles essentiels" },
    { value: "normal", label: "Normal", description: "Usage courant" },
    { value: "advanced", label: "Avancé", description: "Tous les réglages" },
  ];

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
  return (
    <div
      className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
      role="radiogroup"
      aria-label="Mode d'interface CV Builder"
    >
      {MODES.map((mode) => (
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
