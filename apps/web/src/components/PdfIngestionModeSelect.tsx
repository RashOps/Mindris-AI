"use client";

import { useCVStore, type AppSettings, type PdfIngestionMode } from "@/store/useCVStore";

interface PdfIngestionModeSelectProps {
  label?: string;
  compact?: boolean;
}

const OPTIONS: Array<{ value: PdfIngestionMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "llama_parse", label: "LlamaParse" },
  { value: "local_text", label: "Local text" },
];

export function PdfIngestionModeSelect({
  label = "PDF parse",
  compact = false,
}: PdfIngestionModeSelectProps) {
  const { appSettings, setAppSettings } = useCVStore();

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-1.5"}`}>
      <span className={`${compact ? "text-xs" : "text-[10px] uppercase"} tracking-wider text-slate-500`}>
        {label}
      </span>
      <select
        value={appSettings.pdf_ingestion_mode}
        onChange={(event) =>
          setAppSettings({
            pdf_ingestion_mode: event.target.value as AppSettings["pdf_ingestion_mode"],
          })
        }
        className={`cursor-pointer rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm outline-none focus:border-slate-500 ${
          compact ? "h-9 px-2 text-xs" : "h-9 px-2 text-xs"
        }`}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
