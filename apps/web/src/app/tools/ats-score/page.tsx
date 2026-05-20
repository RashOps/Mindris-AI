"use client";

import { useEffect, useState } from "react";
import type { AtsReport } from "@/store/useCVStore";

export default function AtsScorePage() {
  const [report, setReport] = useState<AtsReport | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ats_report");
    if (saved) {
      try {
        setReport(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse ATS report from localStorage", err);
      }
    }
  }, []);

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center text-slate-500">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">No ATS Report Found</h2>
          <p className="text-sm">Please generate a report from the CV Creator first.</p>
        </div>
      </div>
    );
  }

  // Calculate some stats
  const keywordsFound = report.keyword_analysis.filter((k) => k.found).length;
  const totalKeywords = report.keyword_analysis.length;
  const matchPercentage = totalKeywords > 0 ? Math.round((keywordsFound / totalKeywords) * 100) : 0;

  // Gauge color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500";
    if (score >= 60) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">High</span>;
      case "medium":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Medium</span>;
      case "low":
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">Low</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ── */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ATS Audit Report</h1>
            <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">{report.summary}</p>
          </div>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            Close Report
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── Score Overview ── */}
          <section className="col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Global Match Score</h2>
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-100" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  className={getScoreColor(report.score)}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${report.score * 2.51} 251.2`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black ${getScoreColor(report.score).split(" ")[0]}`}>
                  {report.score}
                </span>
                <span className="text-xs font-medium text-slate-400 mt-1">/ 100</span>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 w-full flex justify-between px-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-700">{keywordsFound}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Keywords Found</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-700">{totalKeywords - keywordsFound}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Missing</p>
              </div>
            </div>
          </section>

          {/* ── Recommendations ── */}
          <section className="col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <span>💡</span> Actionable Recommendations
            </h2>
            {report.recommendations.length > 0 ? (
              <ul className="space-y-3">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 text-sm text-blue-900">
                    <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No critical recommendations at this time.</p>
            )}
          </section>

        </div>

        {/* ── Keyword Density Table ── */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span>📊</span> Keyword Density & Semantic Analysis
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Keyword / Skill</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold">Density / Context</th>
                  <th className="px-6 py-4 font-semibold text-center">Severity if Missing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.keyword_analysis.map((kw, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {kw.keyword}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {kw.found ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Found
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Missing
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 ${kw.found ? "text-slate-600" : "text-slate-400 italic"}`}>
                      {kw.density}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getSeverityBadge(kw.severity)}
                    </td>
                  </tr>
                ))}
                {report.keyword_analysis.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                      No keywords analyzed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
