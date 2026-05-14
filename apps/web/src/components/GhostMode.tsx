"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GhostEvent {
  id: string;
  event: string;       // node_start | node_done | pipeline_start | done | error | ping
  icon: string;
  message: string;
  score?: number;
  content?: string;
  ts: number;
}

interface GhostModeProps {
  jobId: string | null;
  onDone?: () => void;
  onError?: () => void;
  onJobResult?: (data: any) => void;  // Called when job_result SSE event arrives
}

const API = "http://localhost:8000";

// ── Component ─────────────────────────────────────────────────────────────────

export function GhostMode({ jobId, onDone, onError, onJobResult }: GhostModeProps) {
  const [events, setEvents] = useState<GhostEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // ── Stable refs for callbacks (never trigger the effect) ──────────────────
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  const onJobResultRef = useRef(onJobResult);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;
  onJobResultRef.current = onJobResult;

  // ── Connect SSE only when jobId changes ────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;

    // Reset terminal
    setEvents([]);
    setStatus("running");
    esRef.current?.close();

    const es = new EventSource(`${API}/api/v1/optimize/stream?job_id=${jobId}`);
    esRef.current = es;

    const handleEvent = (evt: MessageEvent, eventType: string) => {
      try {
        const data = JSON.parse(evt.data);
        if (eventType === "ping") return;

        const entry: GhostEvent = {
          id: `${Date.now()}-${Math.random()}`,
          event: eventType,
          icon: data.icon ?? (eventType === "error" ? "❌" : "•"),
          message: data.message ?? "",
          score: data.score,
          content: data.content,
          ts: Date.now(),
        };

        setEvents((prev) => [...prev, entry]);

        if (eventType === "job_result") {
          // Forward structured data to parent without displaying in terminal
          onJobResultRef.current?.(data);
          return;
        }
        if (eventType === "done") {
          setStatus("done");
          es.close();
          onDoneRef.current?.();
        }
        if (eventType === "error") {
          setStatus("error");
          es.close();
          onErrorRef.current?.();
        }
      } catch {
        // ignore malformed events
      }
    };

    const eventTypes = ["pipeline_start", "node_start", "node_done", "done", "error", "ping", "job_result"];
    eventTypes.forEach((type) => {
      es.addEventListener(type, (evt) => handleEvent(evt as MessageEvent, type));
    });

    es.onerror = () => {
      setStatus("error");
      setEvents((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          event: "error",
          icon: "❌",
          message: "Lost connection to the pipeline.",
          ts: Date.now(),
        },
      ]);
      es.close();
      onErrorRef.current?.();
    };

    return () => es.close();
  }, [jobId]); // ← ONLY jobId — callbacks via ref, never trigger re-connection


  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // ── Status badge ─────────────────────────────────────────────────────────────
  const badge = {
    idle:    { label: "Standby",    color: "bg-slate-500" },
    running: { label: "Live",       color: "bg-green-500 animate-pulse" },
    done:    { label: "Complete",   color: "bg-blue-500" },
    error:   { label: "Error",      color: "bg-red-500" },
  }[status];

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 font-mono text-sm">

      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#161b22] shrink-0">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-xs text-slate-400 flex-1">Ghost Mode — Live Intelligence Feed</span>
        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Event stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
        {events.length === 0 && status === "idle" && (
          <div className="text-slate-600 text-xs pt-2">
            Waiting for a job URL to be submitted…
          </div>
        )}

        {events.length === 0 && status === "running" && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="w-3 h-3 border border-slate-500 border-t-slate-300 rounded-full animate-spin" />
            Connecting to pipeline…
          </div>
        )}

        {events.map((evt) => (
          <EventLine key={evt.id} evt={evt} />
        ))}

        {/* Blinking cursor while running */}
        {status === "running" && (
          <div className="text-[#818cf8] animate-pulse text-base leading-none mt-1">█</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom status */}
      {status === "done" && (
        <div className="px-4 py-2.5 border-t border-white/8 bg-[#161b22] text-xs text-green-400 flex items-center gap-2 shrink-0">
          <span>✅</span> Pipeline complete — CV tailored and ready for export.
        </div>
      )}
      {status === "error" && (
        <div className="px-4 py-2.5 border-t border-white/8 bg-[#161b22] text-xs text-red-400 flex items-center gap-2 shrink-0">
          <span>❌</span> Pipeline encountered an error. Check the API gateway logs.
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

  return (
    <div className="flex items-start gap-2.5 leading-relaxed">
      <span className="text-slate-600 text-[10px] shrink-0 mt-0.5 w-16">{time}</span>
      <span className="shrink-0">{evt.icon}</span>
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
