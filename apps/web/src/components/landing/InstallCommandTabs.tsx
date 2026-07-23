"use client";

import { Check, Copy, ExternalLink, Monitor, Terminal } from "lucide-react";
import { useState } from "react";

const INSTALL_OPTIONS = {
  unix: {
    label: "Linux / macOS",
    platform: "Linux · macOS · WSL · serveur",
    command:
      "curl -fsSL https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.sh | sh",
    icon: Terminal,
  },
  windows: {
    label: "Windows",
    platform: "Windows · PowerShell · Docker Desktop",
    command:
      "irm https://raw.githubusercontent.com/RashOps/Mindris-AI/main/scripts/install_self_hosted.ps1 | iex",
    icon: Monitor,
  },
} as const;

type InstallPlatform = keyof typeof INSTALL_OPTIONS;

export function InstallCommandTabs() {
  const [platform, setPlatform] = useState<InstallPlatform>("unix");
  const [copied, setCopied] = useState(false);
  const option = INSTALL_OPTIONS[platform];

  const copyCommand = async () => {
    await navigator.clipboard.writeText(option.command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-2xl border border-border bg-slate-950 p-5 text-slate-100 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <span className="text-xs text-slate-400">
          Installation Docker one-command
        </span>
        <div
          role="tablist"
          aria-label="Système d’exploitation"
          className="flex rounded-lg border border-white/10 bg-white/5 p-1"
        >
          {(Object.keys(INSTALL_OPTIONS) as InstallPlatform[]).map((key) => {
            const item = INSTALL_OPTIONS[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={platform === key}
                onClick={() => {
                  setPlatform(key);
                  setCopied(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  platform === key
                    ? "bg-white text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">{option.platform}</p>
      <div className="mt-2 flex min-w-0 items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-emerald-300">
          {option.command}
        </code>
        <button
          type="button"
          onClick={() => void copyCommand()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Copier la commande d’installation"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Prérequis : Docker Engine ou Docker Desktop avec Docker Compose v2.
        Aucune installation de Python, uv ou Bun n’est nécessaire.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="https://github.com/RashOps/Mindris-AI"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
        >
          Voir le dépôt
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
        <a
          href="https://github.com/RashOps/Mindris-AI/blob/main/docs/install.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200"
        >
          Guide d’installation
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

