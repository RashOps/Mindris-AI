"use client";

import { ToolbarSelect } from "@/components/ToolbarSelect";
import { useCVStore, type AppSettings, type PdfIngestionMode } from "@/store/useCVStore";

interface PdfIngestionModeSelectProps {
  label?: string;
  compact?: boolean;
  variant?: "default" | "toolbar";
}

const OPTIONS: Array<{ value: PdfIngestionMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "llama_parse", label: "LlamaParse" },
  { value: "local_text", label: "Texte local" },
];

export function PdfIngestionModeSelect({
  label = "Lecture PDF",
  compact = false,
  variant = "default",
}: PdfIngestionModeSelectProps) {
  const { appSettings, setAppSettings } = useCVStore();
  const isToolbar = variant === "toolbar";

  return (
    <div className={`flex items-center ${isToolbar ? "gap-2" : compact ? "gap-2" : "gap-1.5"}`}>
      <span className={`${isToolbar || compact ? "text-xs" : "text-[10px] uppercase"} tracking-wider text-muted-foreground`}>
        {label}
      </span>
      <ToolbarSelect
        value={appSettings.pdf_ingestion_mode}
        ariaLabel={label}
        options={OPTIONS}
        onChange={(value) =>
          setAppSettings({
            pdf_ingestion_mode: value as AppSettings["pdf_ingestion_mode"],
          })
        }
        triggerClassName={
          isToolbar
            ? "app-select h-9 min-w-28 px-2 text-xs"
            : `app-select ${compact ? "h-9 px-2 text-xs" : "h-9 px-2 text-xs"}`
        }
      />
    </div>
  );
}
