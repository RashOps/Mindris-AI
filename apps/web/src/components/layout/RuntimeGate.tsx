"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw, Server } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BROWSER_API_AUTH_MODE, apiUrl, rendererUrl } from "@/lib/api";
import {
  buildRuntimeSummary,
  normalizeReadinessPayload,
  type RuntimeProbe,
} from "@/lib/runtime-readiness";

const CACHE_TTL_MS = 15_000;
const RETRY_INTERVAL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 2_500;

let cachedReadyAt = 0;
let cachedProbes: RuntimeProbe[] | null = null;

function initialProbes(): RuntimeProbe[] {
  return [
    { service: "api", label: "API Gateway", state: "checking", detail: "Checking..." },
    { service: "renderer", label: "Renderer", state: "checking", detail: "Checking..." },
  ];
}

async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function stateTone(state: RuntimeProbe["state"]): string {
  if (state === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "degraded") return "border-amber-200 bg-amber-50 text-amber-800";
  if (state === "checking") return "border-border bg-muted/50 text-foreground";
  return "border-red-200 bg-red-50 text-red-800";
}

export function RuntimeGate({ children }: { children: ReactNode }) {
  const [probes, setProbes] = useState<RuntimeProbe[]>(() => {
    if (cachedProbes && Date.now() - cachedReadyAt < CACHE_TTL_MS) {
      return cachedProbes;
    }
    return initialProbes();
  });
  const [isChecking, setIsChecking] = useState(() => !(cachedProbes && Date.now() - cachedReadyAt < CACHE_TTL_MS));

  const summary = useMemo(() => buildRuntimeSummary(probes), [probes]);

  const checkServices = useCallback(async () => {
    setIsChecking(true);

    const [apiResult, rendererResult] = await Promise.allSettled([
      fetchWithTimeout(apiUrl("/api/v1/system/ready")),
      fetchWithTimeout(rendererUrl("/ready")),
    ]);

    const nextProbes: RuntimeProbe[] = [
      apiResult.status === "fulfilled"
        ? normalizeReadinessPayload("api", apiResult.value)
        : {
            service: "api",
            label: "API Gateway",
            state: "unreachable",
            detail: apiResult.reason instanceof Error ? apiResult.reason.message : "Unavailable",
          },
      rendererResult.status === "fulfilled"
        ? normalizeReadinessPayload("renderer", rendererResult.value)
        : {
            service: "renderer",
            label: "Renderer",
            state: "unreachable",
            detail:
              rendererResult.reason instanceof Error
                ? rendererResult.reason.message
                : "Unavailable",
          },
    ];

    setProbes(nextProbes);
    setIsChecking(false);

    if (nextProbes.every((probe) => probe.state === "ready")) {
      cachedProbes = nextProbes;
      cachedReadyAt = Date.now();
    }
  }, []);

  useEffect(() => {
    if (summary.ready) return;

    const initialCheck = window.setTimeout(() => {
      void checkServices();
    }, 0);
    const timer = window.setInterval(() => {
      void checkServices();
    }, RETRY_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialCheck);
      window.clearInterval(timer);
    };
  }, [checkServices, summary.ready]);

  if (summary.ready) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Startup gate
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-foreground">{summary.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{summary.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void checkServices()}
              disabled={isChecking}
            >
              {isChecking ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {summary.actionLabel}
            </Button>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Home
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {probes.map((probe) => (
            <section
              key={probe.service}
              className={`rounded-xl border px-4 py-4 ${stateTone(probe.state)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{probe.label}</p>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {probe.state}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6">{probe.detail}</p>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          The frontend remains a client only. Runtime access follows the{" "}
          <span className="font-medium text-foreground">{BROWSER_API_AUTH_MODE}</span>{" "}
          contract and waits for API-backed readiness before exposing the workspace.
        </div>
      </div>
    </div>
  );
}
