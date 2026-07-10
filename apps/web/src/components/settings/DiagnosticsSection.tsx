"use client";

import { Settings2 } from "lucide-react";

import { SettingsSection } from "./SettingsSection";
import type { DiagnosticsCard } from "./types";

export function DiagnosticsSection({
  diagnosticsCards,
  diagnosticsPaths,
  diagnosticsRuntime,
}: {
  diagnosticsCards: DiagnosticsCard[];
  diagnosticsPaths: {
    logs_dir: string;
    storage_dir: string;
    chroma_db_dir: string;
  };
  diagnosticsRuntime: {
    renderer_url: string;
    ollama_api_base: string;
    log_level: string;
  };
}) {
  return (
    <SettingsSection title="Runtime diagnostics" icon={<Settings2 size={16} />}>
      <div className="grid gap-3 md:grid-cols-2">
        {diagnosticsCards.map((card) => (
          <div key={card.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{card.label}</p>
              <span
                className={
                  card.state === "ready"
                    ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700"
                    : "rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700"
                }
              >
                {card.state}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground">{card.value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.meta}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Runtime endpoints</p>
          <p className="mt-2 break-all">Renderer: {diagnosticsRuntime.renderer_url || "unavailable"}</p>
          <p className="mt-1 break-all">Ollama: {diagnosticsRuntime.ollama_api_base || "unavailable"}</p>
          <p className="mt-1">Log level: {diagnosticsRuntime.log_level || "unknown"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Storage paths</p>
          <p className="mt-2 break-all">Logs: {diagnosticsPaths.logs_dir || "unavailable"}</p>
          <p className="mt-1 break-all">Storage: {diagnosticsPaths.storage_dir || "unavailable"}</p>
          <p className="mt-1 break-all">Chroma: {diagnosticsPaths.chroma_db_dir || "unavailable"}</p>
        </div>
      </div>
    </SettingsSection>
  );
}
