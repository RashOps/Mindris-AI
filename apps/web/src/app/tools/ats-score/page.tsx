'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell,
} from 'recharts';
import { useCVStore } from '@/store/useCVStore';
import type { AtsReport, KeywordStatus } from '@/store/useCVStore';
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
    case 'high':   return { bg: 'rgba(239,68,68,0.12)', text: '#fca5a5', border: 'rgba(239,68,68,0.2)' };
    case 'medium': return { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: 'rgba(245,158,11,0.2)' };
    default:       return { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8', border: 'rgba(100,116,139,0.15)' };
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
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
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
        <PolarGrid stroke="rgba(255,255,255,0.06)" />
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
          contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
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
    { id: 'found',   label: '✓ Found',     count: keywords.filter(k => k.found).length },
    { id: 'missing', label: '✗ Missing',   count: keywords.filter(k => !k.found).length },
    { id: 'high',    label: '🔴 Critical', count: keywords.filter(k => !k.found && k.severity === 'high').length },
  ];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f.id ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
              color:      filter === f.id ? '#c4b5fd'               : '#64748b',
              border:     `1px solid ${filter === f.id ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {f.label}
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Keyword / Skill', 'Status', 'Density', 'Impact if Missing'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
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
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: '#e2e8f0' }}>{kw.keyword}</td>
                  <td className="px-4 py-3">
                    {kw.found ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Found
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Missing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: kw.found ? '#94a3b8' : '#475569', fontStyle: kw.found ? 'normal' : 'italic' }}>
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
          className="flex gap-4 p-4 rounded-xl"
          style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', fontFamily: 'var(--font-space)' }}
          >
            {i + 1}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{rec}</p>
        </div>
      ))}
    </div>
  );
}

// ── Hero / Input section ──────────────────────────────────────────────────────

interface HeroProps {
  jobUrl: string;
  setJobUrl: (v: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  cvLoaded: boolean;
  onCvLoaded: (data: object) => void;
}

function AtsHero({ jobUrl, setJobUrl, onAnalyze, isAnalyzing, cvLoaded, onCvLoaded }: HeroProps) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 pt-8 pb-4">
      {/* Title */}
      <div>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <span>⚡</span> Enterprise-Grade ATS Analysis
        </div>
        <h1
          className="text-4xl font-black tracking-tight mb-3"
          style={{ color: '#f1f5f9', fontFamily: 'var(--font-space)' }}
        >
          ATS Score Analyzer
        </h1>
        <p className="text-base" style={{ color: '#64748b' }}>
          Deep keyword density analysis · Skill gap detection · Actionable recommendations
        </p>
      </div>

      {/* Input card */}
      <div
        className="p-6 rounded-2xl space-y-5 text-left"
        style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
      >
        {/* Step 1 — CV */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-2" style={{ color: '#8b5cf6' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>1</span>
            Your CV
            {cvLoaded && <span className="text-emerald-400 normal-case font-normal">✓ loaded</span>}
          </p>
          <CVUploadZone onCvLoaded={onCvLoaded} compact />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

        {/* Step 2 — Job URL */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-2" style={{ color: '#8b5cf6' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>2</span>
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
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </div>

        <LLMSelector taskKey="ats_llm" label="ATS Model" />

        {/* Analyze button */}
        <button
          id="ats-analyze-btn"
          onClick={onAnalyze}
          disabled={isAnalyzing || !cvLoaded || !jobUrl.trim()}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isAnalyzing || !cvLoaded || !jobUrl.trim()
              ? 'rgba(139,92,246,0.2)'
              : 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: '#f5f3ff',
            boxShadow: isAnalyzing || !cvLoaded || !jobUrl.trim() ? 'none' : '0 0 20px rgba(139,92,246,0.3)',
          }}
        >
          {isAnalyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Analyzing… (30-60s)
            </>
          ) : (
            <> ⚡ Analyze ATS Score </>
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
    <div
      className="max-w-2xl mx-auto p-4 rounded-xl font-mono text-xs space-y-1"
      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {messages.slice(-8).map((m, i) => (
        <div key={i} style={{ color: '#64748b' }}>
          <span style={{ color: '#8b5cf6' }}>›</span> {m}
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1" style={{ color: '#8b5cf6' }}>
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
        setReport(draft.report);
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
            }),
          });
          if (scoreRes.ok) {
            const atsData = await scoreRes.json();
            const newReport: AtsReport = atsData.ats_report ?? atsData;
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
  }, [cvLoaded, jobUrl, cvData, appSettings]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const foundCount   = report?.keyword_analysis.filter(k => k.found).length ?? 0;
  const totalCount   = report?.keyword_analysis.length ?? 0;
  const missingHigh  = report?.keyword_analysis.filter(k => !k.found && k.severity === 'high').length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1a', color: '#e2e8f0' }}>

      {/* Hero section */}
      <div className="px-6">
        <AtsHero
          jobUrl={jobUrl}
          setJobUrl={setJobUrl}
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
          <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}>
            ❌ {error}
          </div>
        </div>
      )}

      {/* Dashboard */}
      {report && (
        <div className="max-w-5xl mx-auto px-6 pb-16 mt-8 space-y-6">

          {/* ── Row 1: Score + Summary + Bar Chart ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Score gauge */}
            <div
              className="flex flex-col items-center justify-center p-6 rounded-2xl gap-4"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
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
            <div
              className="md:col-span-2 p-6 rounded-2xl space-y-4"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Executive Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{report.summary}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>Keyword Breakdown</p>
                <KeywordBarChart keywords={report.keyword_analysis} />
              </div>
            </div>
          </div>

          {/* ── Row 2: Radar + Recommendations ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Radar */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
                📡 Skill Coverage Radar
              </p>
              <SkillsRadar keywords={report.keyword_analysis} />
            </div>

            {/* Recommendations */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
                💡 Actionable Recommendations
              </p>
              {report.recommendations.length > 0
                ? <Recommendations recs={report.recommendations} />
                : <p className="text-sm italic" style={{ color: '#475569' }}>No critical improvements needed.</p>
              }
            </div>
          </div>


          {/* ── Scoring breakdown ── */}
          {report.scoring_breakdown?.length > 0 && (
            <div
              className="p-6 rounded-2xl"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
                Scoring Method
              </p>
              <div className="grid gap-3 md:grid-cols-5">
                {report.scoring_breakdown.map((criterion) => (
                  <div key={criterion.criterion} className="rounded-xl border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>{criterion.criterion}</p>
                    <p className="mt-2 text-xl font-black" style={{ color: scoreColor(Math.round((criterion.score / criterion.max_score) * 100)), fontFamily: 'var(--font-space)' }}>
                      {criterion.score}/{criterion.max_score}
                    </p>
                    <p className="mt-1 text-[10px]" style={{ color: '#64748b' }}>Weight {criterion.weight}%</p>
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{criterion.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ── Row 3: Full keyword table ── */}
          <div
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: '#475569' }}>
              📊 Keyword Density & Semantic Analysis
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
              🎯 Apply fixes in CV Creator →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
