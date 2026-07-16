"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useCVStore } from "@/store/useCVStore";
import { normalizeAtsReport, type AtsReport } from "@/store/useCVStore";
import {
  AtsHero,
  KeywordBarChart,
  KeywordTable,
  Recommendations,
  ScoreGauge,
  SkillsRadar,
  SSEProgress,
  scoreColor,
  severityColor,
} from "./components";
import Link from "next/link";
import { apiUrl, connectApiEventStream, jsonHeaders } from "@/lib/api";
import { deleteDraft, loadDraft, saveDraft } from "@/lib/drafts";

// ── Main page ─────────────────────────────────────────────────────────────────

type AtsReportDraft = {
  report?: AtsReport;
};

export default function AtsScorePage() {
  const { cvData, appSettings } = useCVStore();
  const [jobUrl, setJobUrl] = useState("");
  const [atsMode, setAtsMode] = useState<"standard" | "strict">("standard");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [sseMessages, setSseMessages] = useState<string[]>([]);
  const [cvLoaded, setCvLoaded] = useState(!!cvData?.profile?.full_name);
  const [error, setError] = useState<string | null>(null);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDraft<AtsReportDraft>("ats-report")
      .then(async (draft) => {
        if (cancelled || !draft?.report) return;
        setReport(normalizeAtsReport(draft.report));
        await deleteDraft("ats-report");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCvLoaded = useCallback(() => {
    setCvLoaded(true);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!cvLoaded || !jobUrl.trim()) return;
    setIsAnalyzing(true);
    setReport(null);
    setSseMessages([]);
    setError(null);

    try {
      // 1. Start the pipeline (scrape + analyze job)
      const startRes = await fetch(apiUrl("/api/v1/optimize"), {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          job_url: jobUrl,
          provider: appSettings.optimize_llm.provider,
          model_name: appSettings.optimize_llm.model_name,
        }),
      });
      if (!startRes.ok) throw new Error("Failed to start analysis pipeline");
      const { job_id } = await startRes.json();
      jobIdRef.current = job_id;

      // 2. Listen to the backend stream without leaking auth in the URL
      const controller = new AbortController();
      void connectApiEventStream(
        `/api/v1/stream/${encodeURIComponent(job_id)}`,
        {
          onEvent: async (eventName, rawData) => {
            try {
              const data = JSON.parse(rawData);
              if (
                eventName === "pipeline_start" ||
                eventName === "node_start" ||
                eventName === "node_done"
              ) {
                if (data.message)
                  setSseMessages((prev) => [...prev, data.message]);
                return;
              }
              if (eventName === "error") {
                setError(data.message ?? "Pipeline error");
                setIsAnalyzing(false);
                controller.abort();
                return;
              }
              if (eventName !== "job_result") return;

              const insights = data;
              setSseMessages((prev) => [
                ...prev,
                `✓ Job analyzed: ${insights.job_title}`,
              ]);

              const scoreRes = await fetch(apiUrl("/api/v1/cv/score"), {
                method: "POST",
                headers: jsonHeaders(),
                body: JSON.stringify({
                  cv_data: cvData,
                  job_insights: insights,
                  provider: appSettings.ats_llm.provider,
                  model_name: appSettings.ats_llm.model_name,
                  ats_mode: atsMode,
                  job_id:
                    typeof insights.job_id === "number"
                      ? insights.job_id
                      : typeof insights.job_record_id === "number"
                        ? insights.job_record_id
                        : null,
                }),
              });
              if (scoreRes.ok) {
                const atsData = await scoreRes.json();
                const newReport = normalizeAtsReport(
                  atsData.ats_report ?? atsData,
                );
                setReport(newReport);
                await saveDraft("ats-report", { report: newReport });
              }
            } catch {
              /* ignore */
            }
            controller.abort();
            setIsAnalyzing(false);
          },
          onError: () => {
            controller.abort();
            setIsAnalyzing(false);
          },
        },
        controller.signal,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsAnalyzing(false);
    }
  }, [cvLoaded, jobUrl, cvData, appSettings, atsMode]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const foundCount =
    report?.keyword_analysis.filter((k) => k.found).length ?? 0;
  const totalCount = report?.keyword_analysis.length ?? 0;
  const missingHigh =
    report?.keyword_analysis.filter((k) => !k.found && k.severity === "high")
      .length ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Hero section */}
      <div className="px-6">
        <AtsHero
          jobUrl={jobUrl}
          setJobUrl={setJobUrl}
          atsMode={atsMode}
          setAtsMode={setAtsMode}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          cvLoaded={cvLoaded}
          onCvLoaded={handleCvLoaded}
        />
      </div>

      {/* SSE progress */}
      {isAnalyzing && (
        <div className="px-6 mt-4">
          <SSEProgress messages={sseMessages} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto px-6 mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Dashboard */}
      {report && (
        <div className="max-w-5xl mx-auto px-6 pb-16 mt-8 space-y-6">
          {/* ── Row 1: Score + Summary + Bar Chart ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score gauge */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-6 shadow-sm">
              <ScoreGauge score={report.score} />
              <div className="flex gap-6 text-center">
                <div>
                  <p
                    className="text-xl font-black"
                    style={{
                      color: "#10b981",
                      fontFamily: "var(--font-space)",
                    }}
                  >
                    {foundCount}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Found
                  </p>
                </div>
                <div>
                  <p
                    className="text-xl font-black"
                    style={{
                      color: "#ef4444",
                      fontFamily: "var(--font-space)",
                    }}
                  >
                    {missingHigh}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Critical
                  </p>
                </div>
                <div>
                  <p
                    className="text-xl font-black"
                    style={{
                      color: "#94a3b8",
                      fontFamily: "var(--font-space)",
                    }}
                  >
                    {totalCount}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                </div>
              </div>
            </div>

            {/* Summary + Bar chart */}
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm md:col-span-2">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Executive Summary
                  </p>
                  <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {report.mode} mode
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {report.summary}
                </p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Keyword Breakdown
                </p>
                <KeywordBarChart keywords={report.keyword_analysis} />
              </div>
            </div>
          </div>

          {/* ── Row 2: Radar + Recommendations ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Radar */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Skill Coverage Radar
              </p>
              <SkillsRadar keywords={report.keyword_analysis} />
            </div>

            {/* Recommendations */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Actionable Recommendations
              </p>
              {report.recommendations.length > 0 ? (
                <Recommendations recs={report.recommendations} />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No critical improvements needed.
                </p>
              )}
            </div>
          </div>

          {/* ── Scoring breakdown ── */}
          {report.scoring_breakdown?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Scoring Method
              </p>
              <div className="grid gap-3 md:grid-cols-5">
                {report.scoring_breakdown.map((criterion) => (
                  <div
                    key={criterion.criterion}
                    className="rounded-lg border border-border bg-muted/40 p-3"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {criterion.criterion}
                    </p>
                    <p
                      className="mt-2 text-xl font-black"
                      style={{
                        color: scoreColor(
                          Math.round(
                            (criterion.score / criterion.max_score) * 100,
                          ),
                        ),
                        fontFamily: "var(--font-space)",
                      }}
                    >
                      {criterion.score}/{criterion.max_score}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Weight {criterion.weight}%
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                      {criterion.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.rubric?.dimensions?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Published Rubric
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {report.rubric.version}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {report.rubric.dimensions.map((dimension) => (
                  <div
                    key={dimension.key}
                    className="rounded-lg border border-border bg-muted/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {dimension.label}
                      </p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {dimension.weight}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {dimension.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.deductions?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Score Deductions
              </p>
              <div className="space-y-3">
                {report.deductions.map((deduction) => {
                  const sev = severityColor(deduction.severity);
                  return (
                    <div
                      key={`${deduction.code}-${deduction.title}`}
                      className="rounded-lg border border-border bg-muted/40 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {deduction.title}
                        </p>
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: sev.bg,
                            color: sev.text,
                            border: `1px solid ${sev.border}`,
                          }}
                        >
                          {deduction.severity}
                        </span>
                        <span className="text-xs font-semibold text-rose-600">
                          -{deduction.points_lost} pts
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {deduction.evidence}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {deduction.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Evaluation Context
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Job</span>{" "}
                  {report.context.job_title || "Unknown"}
                  {report.context.job_company
                    ? ` · ${report.context.job_company}`
                    : ""}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Resume</span>{" "}
                  {report.context.resume_id
                    ? `#${report.context.resume_id}`
                    : "Current workspace CV"}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Locale</span>{" "}
                  {report.context.resume_locale || "default"}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Runtime
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">
                    Provider
                  </span>{" "}
                  {report.context.provider || appSettings.ats_llm.provider}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Model</span>{" "}
                  {report.context.model_name || appSettings.ats_llm.model_name}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Mode</span>{" "}
                  {report.mode}
                </p>
              </div>
            </div>
          </div>
          {/* ── Row 3: Full keyword table ── */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Keyword Density & Semantic Analysis
            </p>
            <KeywordTable keywords={report.keyword_analysis} />
          </div>

          {/* ── CTA ── */}
          <div className="text-center pt-2">
            <Link
              href="/tools/cv-creator"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm no-underline transition-all"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "#dbeafe",
                boxShadow: "0 0 20px rgba(37,99,235,0.25)",
              }}
            >
              Apply fixes in CV Creator →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
