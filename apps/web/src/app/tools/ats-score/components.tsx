"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
} from "recharts";
import type { KeywordStatus } from "@/store/useCVStore";
import { CVUploadZone } from "@/components/CVUploadZone";
import { LLMSelector } from "@/components/LLMSelector";

// ── Color helpers ─────────────────────────────────────────────────────────────

export function scoreColor(s: number) {
  if (s >= 80) return "#10b981";
  if (s >= 60) return "#f59e0b";
  return "#ef4444";
}
function scoreLabel(s: number) {
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Good";
  if (s >= 40) return "Fair";
  return "Needs Work";
}
export function severityColor(sev: string) {
  switch (sev.toLowerCase()) {
    case "high":
      return { bg: "#fee2e2", text: "#b91c1c", border: "#fecaca" };
    case "medium":
      return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
    default:
      return { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" };
  }
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

export function ScoreGauge({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 160, height: 160 }}
    >
      <svg
        width="160"
        height="160"
        viewBox="0 0 140 140"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{
            transition: "stroke-dasharray 1s ease",
            filter: `drop-shadow(0 0 8px ${color}80)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-black tabular-nums"
          style={{ color, fontFamily: "var(--font-space)" }}
        >
          {score}
        </span>
        <span className="mt-0.5 text-xs text-muted-foreground">/ 100</span>
        <span className="text-[11px] font-semibold mt-1" style={{ color }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ── Keyword Bar Chart ─────────────────────────────────────────────────────────

export function KeywordBarChart({ keywords }: { keywords: KeywordStatus[] }) {
  const high = keywords.filter(
    (k) => !k.found && k.severity.toLowerCase() === "high",
  ).length;
  const medium = keywords.filter(
    (k) => !k.found && k.severity.toLowerCase() === "medium",
  ).length;
  const low = keywords.filter(
    (k) => !k.found && k.severity.toLowerCase() === "low",
  ).length;
  const found = keywords.filter((k) => k.found).length;

  const data = [
    { name: "Trouvés", value: found, fill: "#10b981" },
    { name: "Faible", value: low, fill: "#64748b" },
    { name: "Moyen", value: medium, fill: "#f59e0b" },
    { name: "Élevé", value: high, fill: "#ef4444" },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 12,
            color: "#0f172a",
          }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Radar Chart (skills coverage) ─────────────────────────────────────────────

export function SkillsRadar({ keywords }: { keywords: KeywordStatus[] }) {
  const data = keywords.slice(0, 8).map((k) => ({
    skill: k.keyword.length > 12 ? k.keyword.slice(0, 12) + "…" : k.keyword,
    score: k.found
      ? 100
      : k.severity === "high"
        ? 10
        : k.severity === "medium"
          ? 35
          : 60,
  }));

  if (data.length < 3) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart
        data={data}
        margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
      >
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey="skill"
          tick={{ fill: "#64748b", fontSize: 10 }}
        />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
        <Radar
          name="Couverture"
          dataKey="score"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 12,
            color: "#0f172a",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Keyword Table ─────────────────────────────────────────────────────────────

type Filter = "all" | "found" | "missing" | "high";

export function KeywordTable({ keywords }: { keywords: KeywordStatus[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = keywords.filter((k) => {
    if (filter === "found") return k.found;
    if (filter === "missing") return !k.found;
    if (filter === "high")
      return !k.found && k.severity.toLowerCase() === "high";
    return true;
  });

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: keywords.length },
    {
      id: "found",
      label: "Trouvés",
      count: keywords.filter((k) => k.found).length,
    },
    {
      id: "missing",
      label: "Manquants",
      count: keywords.filter((k) => !k.found).length,
    },
    {
      id: "high",
      label: "Critiques",
      count: keywords.filter((k) => !k.found && k.severity === "high").length,
    },
  ];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f.id
                ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {f.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                "Mot-clé / compétence",
                "Statut",
                "Densité",
                "Impact si absent",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((kw, i) => {
              const sev = severityColor(kw.severity);
              return (
                <tr
                  key={i}
                  className="border-b border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {kw.keyword}
                  </td>
                  <td className="px-4 py-3">
                    {kw.found ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Trouvé
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Manquant
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs text-muted-foreground ${kw.found ? "" : "italic"}`}
                  >
                    {kw.density}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: sev.bg,
                        color: sev.text,
                        border: `1px solid ${sev.border}`,
                      }}
                    >
                      {kw.severity}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Aucun mot-clé ne correspond à ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Recommendations ───────────────────────────────────────────────────────────

export function Recommendations({ recs }: { recs: string[] }) {
  return (
    <div className="space-y-3">
      {recs.map((rec, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-lg border border-violet-500/30 bg-violet-500/10 p-4"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-700 dark:text-violet-300"
            style={{ fontFamily: "var(--font-space)" }}
          >
            {i + 1}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{rec}</p>
        </div>
      ))}
    </div>
  );
}

// ── Hero / Input section ──────────────────────────────────────────────────────

interface HeroProps {
  jobUrl: string;
  setJobUrl: (v: string) => void;
  atsMode: "standard" | "strict";
  setAtsMode: (value: "standard" | "strict") => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  cvLoaded: boolean;
  onCvLoaded: (data: object) => void;
}

export function AtsHero({
  jobUrl,
  setJobUrl,
  atsMode,
  setAtsMode,
  onAnalyze,
  isAnalyzing,
  cvLoaded,
  onCvLoaded,
}: HeroProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-4 pt-8 text-center">
      {/* Title */}
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300">
          Analyse ATS
        </div>
        <h1
          className="mb-3 text-4xl font-black tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-space)" }}
        >
          Score ATS
        </h1>
        <p className="text-base text-muted-foreground">
          Compare ton CV à une offre réelle, repère les écarts et priorise les
          corrections utiles.
        </p>
      </div>

      {/* Input card */}
      <div className="space-y-5 rounded-lg border border-border bg-card p-6 text-left shadow-sm">
        {/* Step 1 — CV */}
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">
              1
            </span>
            CV
            {cvLoaded && (
              <span className="font-normal normal-case text-emerald-700">
                chargé
              </span>
            )}
          </p>
          <CVUploadZone onCvLoaded={onCvLoaded} compact />
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Step 2 — Job URL */}
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">
              2
            </span>
            URL de l’offre
          </p>
          <div className="flex gap-2">
            <input
              id="ats-job-url"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isAnalyzing && cvLoaded && onAnalyze()
              }
              placeholder="https://company.com/jobs/position"
              className="app-input flex-1 px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <LLMSelector taskKey="ats_llm" label="Modèle ATS" />

        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">
              3
            </span>
            Mode d’évaluation
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["standard", "strict"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAtsMode(mode)}
                className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${
                  atsMode === mode
                    ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <p className="font-semibold capitalize">{mode}</p>
                <p className="mt-1 text-xs">
                  {mode === "strict"
                    ? "Pénalités plus sévères pour environnements ATS rigides."
                    : "Scoring équilibré pour candidatures modernes."}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Analyze button */}
        <button
          id="ats-analyze-btn"
          onClick={onAnalyze}
          disabled={isAnalyzing || !cvLoaded || !jobUrl.trim()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analyse… (30-60s)
            </>
          ) : (
            <>Analyser le score ATS</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Ghost Mode SSE stream ─────────────────────────────────────────────────────

interface SSEProgressProps {
  messages: string[];
}
export function SSEProgress({ messages }: SSEProgressProps) {
  if (!messages.length) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-1 rounded-lg border border-border bg-card p-4 font-mono text-xs shadow-sm">
      {messages.slice(-8).map((m, i) => (
        <div key={i} className="text-muted-foreground">
          <span style={{ color: "#8b5cf6" }}>›</span> {m}
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1 text-violet-700">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
        <span>Traitement…</span>
      </div>
    </div>
  );
}
