"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useCVStore } from "@/store/useCVStore";
import { AtsScoreWidget } from "@/components/ats/AtsScoreWidget";
import { apiUrl, jsonHeaders } from "@/lib/api";
import { saveDraft } from "@/lib/drafts";
import { useI18n } from "@/i18n/I18nProvider";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clipboard,
  GripVertical,
  MessageCircle,
  Medal,
  PenLine,
  ShieldCheck,
  Target,
  TriangleAlert,
  CircleCheck,
  CircleDashed,
  X,
} from "lucide-react";



// ── Draggable Skill Tag ────────────────────────────────────────────────────────

function DraggableSkill({ skill, type }: { skill: string; type: "hard" | "soft" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `skill::${skill}`,
    data: { kind: "skill", skill, type },
  });

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-grab border transition-all select-none
        ${type === "hard"
          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
        }
        ${isDragging ? "opacity-50 scale-95 ring-2 ring-blue-400" : ""}
      `}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 } : undefined}
    >
      <GripVertical className="h-3 w-3" aria-hidden="true" /> {skill}
    </span>
  );
}

// ── Draggable Bullet ──────────────────────────────────────────────────────────

function DraggableBullet({ bullet, index }: { bullet: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bullet::${index}`,
    data: { kind: "bullet", bullet },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex items-start gap-2 p-2.5 rounded-lg border bg-white cursor-grab text-xs text-slate-700 transition-all select-none
        ${isDragging ? "opacity-50 ring-2 ring-blue-400 scale-95" : "hover:border-blue-200 hover:bg-blue-50"}
      `}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 } : undefined}
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
      <span className="leading-relaxed" style={{ color: '#94a3b8' }}>{bullet}</span>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function provenanceTone(value?: string): string {
  switch (value) {
    case "verified":
      return "#10b981";
    case "derived":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface JobInsightsPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: "drawer" | "embedded";
}

export function JobInsightsPanel({ open, onClose, variant = "drawer" }: JobInsightsPanelProps) {
  const { messages } = useI18n();
  const reviewCopy = messages.agent.review;
  const {
    jobInsights, clearJobInsights,
    loadResumes,
    calculateAtsScore,
  } = useCVStore();

  const [isPatchLoading, setIsPatchLoading] = useState(false);
  const [patchStatus, setPatchStatus] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [excludedOperations, setExcludedOperations] = useState<Set<string>>(
    new Set(),
  );
  const selectedOperations = new Set(
    jobInsights?.resume_patch?.operations
      .map((operation) => operation.operation_id)
      .filter((operationId) => !excludedOperations.has(operationId)) ?? [],
  );
  const [previewImpact, setPreviewImpact] = useState<{
    diff: Array<{ path: string; kind: string; before: unknown; after: unknown }>;
    manifest: {
      document?: { pageCount?: number; overflow?: boolean };
      warnings?: Array<{ messageId?: string; severity?: string }>;
    };
  } | null>(null);

  const invokeProposalTool = async (
    toolName: "render_resume_preview" | "commit_resume_revision",
  ) => {
    if (
      !jobInsights?.proposal_id ||
      !jobInsights.resume_revision ||
      !jobInsights.resume_patch
    ) {
      throw new Error(reviewCopy.persistedUnavailable);
    }
    const argumentsPayload =
      toolName === "render_resume_preview"
        ? {
            resume_id: Number(useCVStore.getState().activeResumeId),
            revision: jobInsights.resume_revision,
            proposal_id: jobInsights.proposal_id,
            proposal: jobInsights.resume_patch,
            accepted_operation_ids: [...selectedOperations],
          }
        : {
            resume_id: Number(useCVStore.getState().activeResumeId),
            proposal_id: jobInsights.proposal_id,
            base_revision: jobInsights.resume_revision,
            accepted_operation_ids: [...selectedOperations],
            human_approved: true,
          };
    const response = await fetch(
      apiUrl(`/api/v1/resume-agents/tools/${toolName}`),
      {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ arguments: argumentsPayload, actor: "user" }),
      },
    );
    if (!response.ok) {
      throw new Error(reviewCopy.processingFailed);
    }
    return response.json();
  };

  const previewProposal = async () => {
    setIsPatchLoading(true);
    setPatchStatus(null);
    try {
      const data = await invokeProposalTool("render_resume_preview");
      setPreviewImpact({
        diff: data.item?.diff ?? [],
        manifest: data.item?.manifest ?? {},
      });
    } catch (error) {
      setPatchStatus(errorMessage(error, reviewCopy.previewUnavailable));
    } finally {
      setIsPatchLoading(false);
    }
  };

  const commitProposal = async () => {
    if (selectedOperations.size === 0) return;
    setIsPatchLoading(true);
    setPatchStatus(null);
    try {
      await invokeProposalTool("commit_resume_revision");
      await loadResumes();
      setPatchStatus(reviewCopy.revisionSaved);
    } catch (error) {
      setPatchStatus(errorMessage(error, reviewCopy.applyFailed));
    } finally {
      setIsPatchLoading(false);
    }
  };

  const rejectProposal = async () => {
    if (!jobInsights?.proposal_id) return;
    setIsPatchLoading(true);
    try {
      const response = await fetch(
        apiUrl(
          `/api/v1/resume-agents/proposals/${jobInsights.proposal_id}/reject`,
        ),
        {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ reason: "user_rejected" }),
        },
      );
      if (!response.ok) throw new Error("Rejet impossible.");
      setExcludedOperations(
        new Set(
          jobInsights.resume_patch?.operations.map(
            (operation) => operation.operation_id,
          ) ?? [],
        ),
      );
      setPatchStatus(reviewCopy.rejected);
    } catch (error) {
      setPatchStatus(errorMessage(error, reviewCopy.rejectFailed));
    } finally {
      setIsPatchLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!jobInsights) return;
    navigator.clipboard.writeText(jobInsights.raw_markdown);
    setPatchStatus("Copied to clipboard!");
    setTimeout(() => setPatchStatus(null), 2000);
  };

  const openInMarkdown = async () => {
    if (!jobInsights) return;
    await saveDraft("markdown", {
      markdown: jobInsights.raw_markdown,
      style: "document",
      title: "Job Insights",
    });
    window.open("/tools/markdown", "_blank");
  };

  if (!open) return null;

  const isEmbedded = variant === "embedded";
  const evidenceSummary = jobInsights?.evidence_matrix.reduce(
    (summary, match) => {
      summary[match.status] += 1;
      return summary;
    },
    { matched: 0, partial: 0, missing: 0 },
  );

  return (
    <>
      {!isEmbedded && <div className="fixed inset-0 z-40 pointer-events-none" />}
      <aside
        className={`theme-dark-tool flex h-full w-full flex-col bg-slate-950 ${
          isEmbedded
            ? "border-0"
            : "fixed top-0 right-0 z-50 w-80 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out"
        }`}
        style={isEmbedded ? undefined : { boxShadow: "-8px 0 40px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-100" style={{ fontFamily: "var(--font-space)" }}>Job Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-500 transition-colors hover:text-slate-200"
          ><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>

        {/* No insights yet */}
        {!jobInsights ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Target className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">No job insights yet</p>
              <p className="mt-1 text-xs text-slate-500">Paste a job URL and click Optimize to generate tailored content.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Job summary */}
            <div className="flex flex-col gap-2 border-b border-white/10 bg-slate-900/70 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">{jobInsights.job_title}</p>
                <p className="text-xs text-slate-400">{jobInsights.company}</p>
              </div>
              {/* ATS Score widget */}
              {jobInsights.score !== null ? (
                <AtsScoreWidget
                  score={jobInsights.score}
                  onClick={() => {
                    void (async () => {
                      if (jobInsights.ats_report) {
                        await saveDraft("ats-report", {
                          report: jobInsights.ats_report,
                        });
                      }
                      window.open("/tools/ats-score", "_blank");
                    })();
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
                  <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Score indisponible. Les propositions restent à vérifier.
                </div>
              )}
              {/* Score my CV button */}
              <button
                onClick={async () => {
                  setIsScoring(true);
                  await calculateAtsScore();
                  setIsScoring(false);
                }}
                disabled={isScoring}
                className="flex w-full items-center justify-center gap-1 rounded border border-white/10 bg-white/5 py-1.5 text-[10px] font-medium text-slate-400 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {isScoring ? (
                  <span className="w-2 h-2 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {reviewCopy.scoreResume}
              </button>
            </div>

            {(jobInsights.proposed_changes?.length ?? 0) > 0 ? (
              <section className="border-b border-border px-4 py-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {reviewCopy.title}
                </p>
                <p className="mb-3 text-[10px] leading-relaxed text-muted-foreground">
                  {reviewCopy.sourceRevision} #
                  {jobInsights.resume_revision ?? "—"}.{" "}
                  {reviewCopy.noImplicitCommit}
                </p>
                <div className="space-y-2">
                  {(jobInsights.proposed_changes ?? []).map((change) => {
                    const selected = selectedOperations.has(change.operation_id);
                    return (
                      <label
                        key={change.operation_id}
                        className="flex cursor-pointer gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setExcludedOperations((current) => {
                              const next = new Set(current);
                              if (selected) {
                                next.add(change.operation_id);
                              } else {
                                next.delete(change.operation_id);
                              }
                              return next;
                            });
                          }}
                          className="mt-0.5 h-3.5 w-3.5 accent-emerald-500"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            {change.type.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                            {change.reason}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-muted-foreground/70">
                            {reviewCopy.evidence} :{" "}
                            {change.source_fact_ids.join(", ") ||
                              reviewCopy.noNewFact}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPatchLoading || selectedOperations.size === 0}
                    onClick={() => void previewProposal()}
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-[10px] font-medium text-foreground disabled:opacity-50"
                  >
                    {reviewCopy.inspectImpact}
                  </button>
                  <button
                    type="button"
                    disabled={isPatchLoading || selectedOperations.size === 0}
                    onClick={() => void commitProposal()}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-50"
                  >
                    <CircleCheck className="h-3 w-3" aria-hidden="true" />
                    {reviewCopy.applySelection}
                  </button>
                  <button
                    type="button"
                    disabled={isPatchLoading}
                    onClick={() => void rejectProposal()}
                    className="rounded-md px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground disabled:opacity-50"
                  >
                    {reviewCopy.reject}
                  </button>
                </div>
                {previewImpact ? (
                  <div className="mt-3 rounded-lg border border-border bg-background p-2.5">
                    <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
                      <span>
                        {previewImpact.diff.length} {reviewCopy.changes}
                      </span>
                      <span>
                        {previewImpact.manifest.document?.pageCount ?? "—"}{" "}
                        {reviewCopy.pages}
                      </span>
                    </div>
                    {previewImpact.manifest.document?.overflow ? (
                      <p className="mt-1 text-[10px] text-amber-600">
                        {reviewCopy.overflow}
                      </p>
                    ) : null}
                    <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                      {previewImpact.diff.slice(0, 12).map((change) => (
                        <p
                          key={`${change.kind}-${change.path}`}
                          className="truncate text-[10px] text-foreground"
                        >
                          <span className="text-muted-foreground">
                            {change.kind}
                          </span>{" "}
                          {change.path}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {(jobInsights.evidence_matrix?.length ?? 0) > 0 ? (
              <section className="border-b border-white/10 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    Exigences et preuves
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>{evidenceSummary?.matched ?? 0} couvertes</span>
                    <span>{evidenceSummary?.partial ?? 0} partielles</span>
                    <span>{evidenceSummary?.missing ?? 0} manquantes</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {jobInsights.evidence_matrix.map((match) => {
                    const StatusIcon =
                      match.status === "matched"
                        ? CircleCheck
                        : match.status === "partial"
                          ? CircleDashed
                          : TriangleAlert;
                    const tone =
                      match.status === "matched"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : match.status === "partial"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-200";
                    return (
                      <div
                        key={match.requirement_id}
                        className={`rounded-lg border p-2.5 ${tone}`}
                      >
                        <div className="flex items-start gap-2">
                          <StatusIcon
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-relaxed">
                              {match.requirement}
                            </p>
                            <p className="mt-1 text-[10px] leading-relaxed opacity-80">
                              {match.rationale}
                            </p>
                            {match.matched_fact_ids.length > 0 ? (
                              <p className="mt-1 text-[10px] opacity-60">
                                Preuves : {match.matched_fact_ids.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {(jobInsights.warnings?.length ?? 0) > 0 ? (
              <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-200">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Points à vérifier
                </p>
                {(jobInsights.warnings ?? []).map((warning) => (
                  <p key={warning} className="text-[10px] text-amber-100/80">
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}

            {patchStatus ? (
              <p className="border-b border-border px-4 py-2 text-center text-xs text-muted-foreground">
                {patchStatus}
              </p>
            ) : null}


            {/* Company Intel */}
            {jobInsights.company_insight && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  <Building2 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Company Intel
                </p>
                <div className="space-y-2 text-xs" style={{ color: '#94a3b8' }}>
                  <p><span style={{ color: '#cbd5e1' }}>Industry:</span> {jobInsights.company_insight.industry}</p>
                  <p><span style={{ color: '#cbd5e1' }}>Size:</span> {jobInsights.company_insight.size}</p>
                  {jobInsights.company_insight.work_mode && (
                    <p><span style={{ color: '#cbd5e1' }}>Work mode:</span> {jobInsights.company_insight.work_mode}</p>
                  )}
                  {jobInsights.company_insight.canonical_domain && (
                    <p><span style={{ color: '#cbd5e1' }}>Domain:</span> {jobInsights.company_insight.canonical_domain}</p>
                  )}
                  {jobInsights.company_insight.unavailable_reason && <p>{jobInsights.company_insight.unavailable_reason}</p>}
                  {jobInsights.company_insight.culture_values?.length > 0 && <p>Values: {jobInsights.company_insight.culture_values.join(', ')}</p>}
                  {jobInsights.company_insight.tech_stack_known?.length > 0 && <p>Known stack: {jobInsights.company_insight.tech_stack_known.join(', ')}</p>}
                  {jobInsights.company_insight.provenance && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Provenance
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(jobInsights.company_insight.provenance).slice(0, 6).map(([key, value]) => (
                          <span
                            key={key}
                            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: provenanceTone(value),
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          >
                            {key}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobInsights.company_insight.role_fit && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Role fit
                      </p>
                      {jobInsights.company_insight.role_fit.skills_to_foreground?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>Foreground:</span> {jobInsights.company_insight.role_fit.skills_to_foreground.join(', ')}</p>
                      ) : null}
                      {jobInsights.company_insight.role_fit.wording_to_mirror?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>Mirror:</span> {jobInsights.company_insight.role_fit.wording_to_mirror.join(', ')}</p>
                      ) : null}
                      {jobInsights.company_insight.role_fit.cv_emphasis?.length ? (
                        <p><span style={{ color: '#cbd5e1' }}>CV:</span> {jobInsights.company_insight.role_fit.cv_emphasis.join(' ')}</p>
                      ) : null}
                    </div>
                  )}
                  {jobInsights.company_insight.risk_flags && jobInsights.company_insight.risk_flags.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>
                        Risks & unknowns
                      </p>
                      <div className="space-y-1.5">
                        {jobInsights.company_insight.risk_flags.slice(0, 3).map((risk) => (
                          <div
                            key={risk.code}
                            className="rounded-lg px-2 py-1.5"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <p className="text-[11px] font-semibold" style={{ color: '#e2e8f0' }}>
                              {risk.title}
                            </p>
                            <p className="text-[11px]" style={{ color: '#94a3b8' }}>
                              {risk.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Hard Skills */}
            {jobInsights.hard_skills.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  <Target className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Required Skills — drag to Skills section
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jobInsights.hard_skills.map(s => (
                    <DraggableSkill key={s} skill={s} type="hard" />
                  ))}
                </div>
              </div>
            )}

            {/* Soft Skills */}
            {jobInsights.soft_skills.length > 0 && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  <MessageCircle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Soft Skills — drag to Skills section
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {jobInsights.soft_skills.map(s => (
                    <DraggableSkill key={s} skill={s} type="soft" />
                  ))}
                </div>
              </div>
            )}

            {/* Drafted Bullets */}
            {jobInsights.drafted_bullets.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#475569' }}>
                  <PenLine className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  AI Bullets — drag to Experience
                </p>
                <div className="space-y-1.5">
                  {jobInsights.drafted_bullets.map((bullet, i) => (
                    <DraggableBullet key={i} bullet={bullet} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        {jobInsights && (
          <div className="flex shrink-0 gap-2 border-t border-white/10 bg-slate-900/70 px-4 py-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10"
            >
              <Clipboard className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Copy
            </button>
            <button
              onClick={() => {
                void openInMarkdown();
              }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10"
            >
              <ArrowRight className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Markdown
            </button>
            <button
              onClick={() => { clearJobInsights(); }}
              className="px-2 py-1.5 text-xs text-slate-500 transition-colors hover:text-rose-400"
              title="Clear"
            ><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
      </aside>
    </>
  );
}
