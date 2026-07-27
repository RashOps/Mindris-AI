"use client";

import { useEffect, useRef, useState } from "react";
import { connectApiEventStream } from "@/lib/api";
import { useI18n } from "@/i18n/I18nProvider";
import {
  CheckCircle2,
  Circle,
  LoaderCircle,
  Play,
  Square,
  XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GhostEvent {
  id: string;
  event: string;       // node_start | node_done | pipeline_start | done | error | ping
  message: string;
  messageId?: string;
  score?: number;
  content?: string;
  ts: number;
}

export type GhostPayload = Record<string, unknown>;

interface GhostModeProps {
  jobId: string | null;
  onDone?: () => void;
  onError?: () => void;
  onJobResult?: (data: GhostPayload) => void;  // Called when job_result SSE event arrives
  onCompanyResult?: (data: GhostPayload) => void;
}



// ── Component ─────────────────────────────────────────────────────────────────

export function GhostMode({ jobId, onDone, onError, onJobResult, onCompanyResult }: GhostModeProps) {
  const { messages } = useI18n();
  const agentCopyRef = useRef(messages.agent);
  const [events, setEvents] = useState<GhostEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Stable refs for callbacks (never trigger the effect) ──────────────────
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const onJobResultRef = useRef(onJobResult);
  const onCompanyResultRef = useRef(onCompanyResult);

  useEffect(() => {
    onDoneRef.current = onDone;
    onErrorRef.current = onError;
    onJobResultRef.current = onJobResult;
    onCompanyResultRef.current = onCompanyResult;
  }, [onDone, onError, onJobResult, onCompanyResult]);

  useEffect(() => {
    agentCopyRef.current = messages.agent;
  }, [messages.agent]);

  // ── Connect SSE only when jobId changes ────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      setEvents([]);
      setStatus("running");
    });

    const handleEvent = (eventType: string, rawData: string) => {
      try {
        const data = JSON.parse(rawData) as GhostPayload;
        if (eventType === "ping") return;

        const messageId =
          typeof data.message_id === "string" ? data.message_id : undefined;
        const statusKey = messageId
          ? {
              "agent.pipeline.started": "started",
              "agent.pipeline.scraping": "scraping",
              "agent.pipeline.scraping_failed": "scrapingFailed",
              "agent.pipeline.scraping_timeout": "scrapingTimeout",
              "agent.pipeline.empty_source": "emptySource",
              "agent.pipeline.scraped": "scraped",
              "agent.pipeline.analyzing_job": "analyzingJob",
              "agent.pipeline.job_analysis_timeout": "jobAnalysisTimeout",
              "agent.pipeline.job_analysis_failed": "jobAnalysisFailed",
              "agent.pipeline.job_ready": "jobReady",
              "agent.workflow.searching_evidence": "searchingEvidence",
              "agent.workflow.evidence_found": "evidenceFound",
              "agent.workflow.drafting": "drafting",
              "agent.workflow.draft_ready": "draftReady",
              "agent.workflow.evaluating": "evaluating",
              "agent.workflow.score_ready": "scoreReady",
              "agent.workflow.score_unavailable": "scoreUnavailable",
              "agent.pipeline.workflow_timeout": "workflowTimeout",
              "agent.pipeline.completed": "completed",
              "agent.resume_not_found": "resumeNotFound",
              "agent.resume_locale_invalid": "invalidLocale",
            }[messageId]
          : undefined;
        const localizedMessage = statusKey
          ? agentCopyRef.current.statuses[
              statusKey as keyof typeof agentCopyRef.current.statuses
            ]
          : undefined;
        const entry: GhostEvent = {
          id: `${Date.now()}-${Math.random()}`,
          event: eventType,
          message:
            localizedMessage ??
            (typeof data.message === "string" ? data.message : ""),
          messageId,
          score: typeof data.score === "number" ? data.score : undefined,
          content: typeof data.content === "string" ? data.content : undefined,
          ts: Date.now(),
        };

        setEvents((prev) => [...prev, entry]);

        if (eventType === "company_result") {
          onCompanyResultRef.current?.(data);
          return;
        }
        if (eventType === "job_result") {
          // Forward structured data to parent without displaying in terminal
          onJobResultRef.current?.(data);
          return;
        }
        if (eventType === "done") {
          setStatus("done");
          controller.abort();
          onDoneRef.current?.();
        }
        if (eventType === "error") {
          setStatus("error");
          controller.abort();
          onErrorRef.current?.();
        }
      } catch {
        // ignore malformed events
      }
    };

    void connectApiEventStream(
      `/api/v1/optimize/stream?job_id=${encodeURIComponent(jobId)}`,
      {
        onEvent: handleEvent,
        onError: () => {
          setStatus("error");
          setEvents((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              event: "error",
              message: agentCopyRef.current.connectionLost,
              ts: Date.now(),
            },
          ]);
          onErrorRef.current?.();
        },
      },
      controller.signal,
    );

    return () => controller.abort();
  }, [jobId]); // ← ONLY jobId — callbacks via ref, never trigger re-connection


  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // ── Status badge ─────────────────────────────────────────────────────────────
  const badge = {
    idle:    { label: messages.agent.standby, color: "bg-slate-500" },
    running: { label: messages.agent.live, color: "bg-green-500 animate-pulse" },
    done:    { label: messages.agent.complete, color: "bg-blue-500" },
    error:   { label: messages.agent.error, color: "bg-red-500" },
  }[status];

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 font-mono text-sm">

      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#161b22] shrink-0">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-400 flex-1">
          Ghost Mode — {messages.agent.title}
        </span>
        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Event stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {events.length === 0 && status === "idle" && (
          <div className="text-slate-600 text-xs pt-2">
            {messages.agent.waiting}
          </div>
        )}

        {events.length === 0 && status === "running" && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="w-3 h-3 border border-slate-500 border-t-slate-300 rounded-full animate-spin" />
            {messages.agent.connecting}
          </div>
        )}

        {events.map((evt) => (
          <EventLine key={evt.id} evt={evt} />
        ))}

        {/* Blinking cursor while running */}
        {status === "running" && (
          <Square className="mt-1 h-3 w-3 animate-pulse fill-current text-[#818cf8]" aria-hidden="true" />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom status */}
      {status === "done" && (
        <div className="px-4 py-2.5 border-t border-white/8 bg-[#161b22] text-xs text-green-400 flex items-center gap-2 shrink-0">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Pipeline complete — CV tailored and ready for export.
        </div>
      )}
      {status === "error" && (
        <div className="px-4 py-2.5 border-t border-white/8 bg-[#161b22] text-xs text-red-400 flex items-center gap-2 shrink-0">
          <XCircle className="h-4 w-4" aria-hidden="true" /> Pipeline encountered an error. Check the API gateway logs.
        </div>
      )}
    </div>
  );
}

// ── Event line ────────────────────────────────────────────────────────────────

function EventLine({ evt }: { evt: GhostEvent }) {
  const colorMap: Record<string, string> = {
    pipeline_start: "text-indigo-400",
    node_start:     "text-slate-400",
    node_done:      "text-green-400",
    done:           "text-blue-400",
    error:          "text-red-400",
  };
  const color = colorMap[evt.event] ?? "text-slate-400";
  const time = new Date(evt.ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const EventIcon =
    evt.event === "error"
      ? XCircle
      : evt.event === "done" || evt.event === "node_done"
        ? CheckCircle2
        : evt.event === "pipeline_start"
          ? Play
          : evt.event === "node_start"
            ? LoaderCircle
            : Circle;

  return (
    <div className="flex items-start gap-2.5 leading-relaxed">
      <span className="text-slate-600 text-[10px] shrink-0 mt-0.5 w-16">{time}</span>
      <EventIcon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${evt.event === "node_start" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className={`text-xs ${color} flex-1`}>
        {evt.message}
        {evt.score !== undefined && (
          <span className={`ml-2 font-bold ${evt.score >= 80 ? "text-green-400" : evt.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
            ({evt.score}/100)
          </span>
        )}
      </span>
    </div>
  );
}
