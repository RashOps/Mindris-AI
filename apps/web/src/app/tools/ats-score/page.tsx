'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from 'recharts';
import { useCVStore } from '@/store/useCVStore';
import { normalizeAtsReport, type AtsReport, type KeywordStatus } from '@/store/useCVStore';
import { CVUploadZone } from '@/components/CVUploadZone';
import { LLMSelector } from '@/components/LLMSelector';
import Link from 'next/link';
import { apiUrl, eventSourceUrl, jsonHeaders } from '@/lib/api';
import { deleteDraft, loadDraft, saveDraft } from '@/lib/drafts';



// ── Color helpers ─────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  return '#ef4444';
}
function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Work';
}
function severityColor(sev: string) {
  switch (sev.toLowerCase()) {
    case 'high':   return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
    case 'medium': return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    default:       return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  }
}

// ── Gauge SVG ─────────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tabular-nums" style={{ color, fontFamily: 'var(--font-space)' }}>
          {score}
        </span>
        <span className="text-xs mt-0.5" style={{ color: '#475569' }}>/ 100</span>
        <span className="text-[11px] font-semibold mt-1" style={{ color }}>{scoreLabel(score)}</span>
      </div>
    </div>
  );
}

// ── Keyword Bar Chart ─────────────────────────────────────────────────────────

function KeywordBarChart({ keywords }: { keywords: KeywordStatus[] }) {
  const high   = keywords.filter(k => !k.found && k.severity.toLowerCase() === 'high').length;
  const medium = keywords.filter(k => !k.found && k.severity.toLowerCase() === 'medium').length;
  const low    = keywords.filter(k => !k.found && k.severity.toLowerCase() === 'low').length;
  const found  = keywords.filter(k => k.found).length;

  const data = [
    { name: 'Found',  value: found,  fill: '#10b981' },
    { name: 'Low',    value: low,    fill: '#64748b' },
    { name: 'Medium', value: medium, fill: '#f59e0b' },
    { name: 'High',   value: high,   fill: '#ef4444' },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, color: '#0f172a' }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Radar Chart (skills coverage) ─────────────────────────────────────────────

function SkillsRadar({ keywords }: { keywords: KeywordStatus[] }) {
  const data = keywords.slice(0, 8).map(k => ({
    skill: k.keyword.length > 12 ? k.keyword.slice(0, 12) + '…' : k.keyword,
    score: k.found ? 100 : k.severity === 'high' ? 10 : k.severity === 'medium' ? 35 : 60,
  }));

  if (data.length < 3) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 10 }} />
        <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
        <Radar
          name="Coverage"
          dataKey="score"
          stroke="#8b5cf6"
          fill="#8b5cf6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 12, color: '#0f172a' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Keyword Table ─────────────────────────────────────────────────────────────

type Filter = 'all' | 'found' | 'missing' | 'high';

function KeywordTable({ keywords }: { keywords: KeywordStatus[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = keywords.filter(k => {
    if (filter === 'found')   return k.found;
    if (filter === 'missing') return !k.found;
    if (filter === 'high')    return !k.found && k.severity.toLowerCase() === 'high';
    return true;
  });

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all',     label: 'All',         count: keywords.length },
    { id: 'found',   label: 'Found',       count: keywords.filter(k => k.found).length },
    { id: 'missing', label: 'Missing',     count: keywords.filter(k => !k.found).length },
    { id: 'high',    label: 'Critical',    count: keywords.filter(k => !k.found && k.severity === 'high').length },
  ];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f.id
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {f.label}
            <span
              className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Keyword / Skill', 'Status', 'Density', 'Impact if Missing'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{kw.keyword}</td>
                  <td className="px-4 py-3">
                    {kw.found ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: '#dcfce7', color: '#047857', border: '1px solid #bbf7d0' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Found
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: kw.found ? '#64748b' : '#475569', fontStyle: kw.found ? 'normal' : 'italic' }}>
                    {kw.density}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                      {kw.severity}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: '#475569' }}>
                  No keywords match this filter.
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

function Recommendations({ recs }: { recs: string[] }) {
  return (
    <div className="space-y-3">
      {recs.map((rec, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-lg border border-violet-100 bg-violet-50 p-4"
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-black text-violet-700"
            style={{ fontFamily: 'var(--font-space)' }}
          >
            {i + 1}
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{rec}</p>
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

function AtsHero({ jobUrl, setJobUrl, atsMode, setAtsMode, onAnalyze, isAnalyzing, cvLoaded, onCvLoaded }: HeroProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-4 pt-8 text-center">
      {/* Title */}
      <div>
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
        >
          Enterprise-Grade ATS Analysis
        </div>
        <h1
          className="mb-3 text-4xl font-black tracking-tight text-slate-950"
          style={{ fontFamily: 'var(--font-space)' }}
        >
          ATS Score Analyzer
        </h1>
        <p className="text-base text-slate-600">
          Deep keyword density analysis · Skill gap detection · Actionable recommendations
        </p>
      </div>

      {/* Input card */}
      <div
        className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 text-left shadow-sm"
      >
        {/* Step 1 — CV */}
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">1</span>
            Your CV
            {cvLoaded && <span className="font-normal normal-case text-emerald-700">loaded</span>}
          </p>
          <CVUploadZone onCvLoaded={onCvLoaded} compact />
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200" />

        {/* Step 2 — Job URL */}
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">2</span>
            Job Offer URL
          </p>
          <div className="flex gap-2">
            <input
              id="ats-job-url"
              type="url"
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isAnalyzing && cvLoaded && onAnalyze()}
              placeholder="https://company.com/jobs/position"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>

        <LLMSelector taskKey="ats_llm" label="ATS Model" />

        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-violet-700">3</span>
            Evaluation Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["standard", "strict"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAtsMode(mode)}
                className={`rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${
                  atsMode === mode
                    ? 'border-violet-300 bg-violet-50 text-violet-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <p className="font-semibold capitalize">{mode}</p>
                <p className="mt-1 text-xs">
                  {mode === 'strict'
                    ? 'Conservative penalties for rigid ATS environments.'
                    : 'Balanced scoring for modern ATS workflows.'}
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
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: isAnalyzing || !cvLoaded || !jobUrl.trim()
              ? '#ede9fe'
              : '#0f172a',
            color: isAnalyzing || !cvLoaded || !jobUrl.trim() ? '#6d28d9' : '#fff',
          }}
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analyzing… (30-60s)
            </>
          ) : (
            <>Analyze ATS Score</>
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
function SSEProgress({ messages }: SSEProgressProps) {
  if (!messages.length) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-1 rounded-lg border border-slate-200 bg-white p-4 font-mono text-xs shadow-sm">
      {messages.slice(-8).map((m, i) => (
        <div key={i} className="text-slate-600">
          <span style={{ color: '#8b5cf6' }}>›</span> {m}
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1 text-violet-700">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
        <span>Processing…</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type AtsReportDraft = {
  report?: AtsReport;
};

export default function AtsScorePage() {
  const { cvData, appSettings } = useCVStore();
  const [jobUrl, setJobUrl]         = useState('');
  const [atsMode, setAtsMode]       = useState<"standard" | "strict">('standard');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport]         = useState<AtsReport | null>(null);
  const [sseMessages, setSseMessages] = useState<string[]>([]);
  const [cvLoaded, setCvLoaded]     = useState(!!cvData?.profile?.full_name);
  const [error, setError]           = useState<string | null>(null);
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
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          job_url:    jobUrl,
          provider:   appSettings.optimize_llm.provider,
          model_name: appSettings.optimize_llm.model_name,
        }),
      });
      if (!startRes.ok) throw new Error('Failed to start analysis pipeline');
      const { job_id } = await startRes.json();
      jobIdRef.current = job_id;

      // 2. Listen to SSE stream
      const sse = new EventSource(eventSourceUrl(`/api/v1/stream/${job_id}`));

      sse.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.message) setSseMessages(prev => [...prev, data.message]);
        } catch { /* ignore */ }
      });

      sse.addEventListener('job_result', async (e) => {
        try {
          const insights = JSON.parse(e.data);
          setSseMessages(prev => [...prev, `✓ Job analyzed: ${insights.job_title}`]);

          // 3. Request detailed ATS score
          const scoreRes = await fetch(apiUrl("/api/v1/cv/score"), {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({
              cv_data:      cvData,
              job_insights: insights,
              provider:     appSettings.ats_llm.provider,
              model_name:   appSettings.ats_llm.model_name,
              ats_mode:     atsMode,
            }),
          });
          if (scoreRes.ok) {
            const atsData = await scoreRes.json();
            const newReport = normalizeAtsReport(atsData.ats_report ?? atsData);
            setReport(newReport);
            await saveDraft("ats-report", { report: newReport });
          }
        } catch { /* ignore */ }
        sse.close();
        setIsAnalyzing(false);
      });

      sse.addEventListener('error_event', (e) => {
        try {
          const data = JSON.parse(e.data);
          setError(data.message ?? 'Pipeline error');
        } catch { /* ignore */ }
        sse.close();
        setIsAnalyzing(false);
      });

      sse.onerror = () => {
        sse.close();
        setIsAnalyzing(false);
      };
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsAnalyzing(false);
    }
  }, [cvLoaded, jobUrl, cvData, appSettings, atsMode]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const foundCount   = report?.keyword_analysis.filter(k => k.found).length ?? 0;
  const totalCount   = report?.keyword_analysis.length ?? 0;
  const missingHigh  = report?.keyword_analysis.filter(k => !k.found && k.severity === 'high').length ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">

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
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ScoreGauge score={report.score} />
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-xl font-black" style={{ color: '#10b981', fontFamily: 'var(--font-space)' }}>{foundCount}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#475569' }}>Found</p>
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color: '#ef4444', fontFamily: 'var(--font-space)' }}>{missingHigh}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#475569' }}>Critical</p>
                </div>
                <div>
                  <p className="text-xl font-black" style={{ color: '#94a3b8', fontFamily: 'var(--font-space)' }}>{totalCount}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: '#475569' }}>Total</p>
                </div>
              </div>
            </div>

            {/* Summary + Bar chart */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Executive Summary</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {report.mode} mode
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{report.summary}</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Keyword Breakdown</p>
                <KeywordBarChart keywords={report.keyword_analysis} />
              </div>
            </div>
          </div>

          {/* ── Row 2: Radar + Recommendations ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Radar */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Skill Coverage Radar
              </p>
              <SkillsRadar keywords={report.keyword_analysis} />
            </div>

            {/* Recommendations */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Actionable Recommendations
              </p>
              {report.recommendations.length > 0
                ? <Recommendations recs={report.recommendations} />
                : <p className="text-sm italic text-slate-500">No critical improvements needed.</p>
              }
            </div>
          </div>


          {/* ── Scoring breakdown ── */}
          {report.scoring_breakdown?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Scoring Method
              </p>
              <div className="grid gap-3 md:grid-cols-5">
                {report.scoring_breakdown.map((criterion) => (
                  <div key={criterion.criterion} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-900">{criterion.criterion}</p>
                    <p className="mt-2 text-xl font-black" style={{ color: scoreColor(Math.round((criterion.score / criterion.max_score) * 100)), fontFamily: 'var(--font-space)' }}>
                      {criterion.score}/{criterion.max_score}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">Weight {criterion.weight}%</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{criterion.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.rubric?.dimensions?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Published Rubric
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {report.rubric.version}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {report.rubric.dimensions.map((dimension) => (
                  <div key={dimension.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{dimension.label}</p>
                      <span className="text-xs font-semibold text-slate-500">{dimension.weight}%</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{dimension.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.deductions?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Score Deductions
              </p>
              <div className="space-y-3">
                {report.deductions.map((deduction) => {
                  const sev = severityColor(deduction.severity);
                  return (
                    <div key={`${deduction.code}-${deduction.title}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{deduction.title}</p>
                        <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}>
                          {deduction.severity}
                        </span>
                        <span className="text-xs font-semibold text-rose-600">-{deduction.points_lost} pts</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{deduction.evidence}</p>
                      <p className="mt-2 text-xs text-slate-500">{deduction.recommendation}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Evaluation Context
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Job</span> {report.context.job_title || 'Unknown'}{report.context.job_company ? ` · ${report.context.job_company}` : ''}</p>
                <p><span className="font-semibold text-slate-900">Resume</span> {report.context.resume_id ? `#${report.context.resume_id}` : 'Current workspace CV'}</p>
                <p><span className="font-semibold text-slate-900">Locale</span> {report.context.resume_locale || 'default'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Runtime
              </p>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-900">Provider</span> {report.context.provider || appSettings.ats_llm.provider}</p>
                <p><span className="font-semibold text-slate-900">Model</span> {report.context.model_name || appSettings.ats_llm.model_name}</p>
                <p><span className="font-semibold text-slate-900">Mode</span> {report.mode}</p>
              </div>
            </div>
          </div>
          {/* ── Row 3: Full keyword table ── */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
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
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                color: '#dbeafe',
                boxShadow: '0 0 20px rgba(37,99,235,0.25)',
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
