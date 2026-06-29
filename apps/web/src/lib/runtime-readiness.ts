export type RuntimeService = "api" | "renderer";
export type RuntimeProbeState = "checking" | "ready" | "degraded" | "unreachable";

export type RuntimeProbe = {
  service: RuntimeService;
  label: string;
  state: RuntimeProbeState;
  detail: string;
};

type ReadinessPayload = {
  status?: unknown;
  checks?: Record<string, { ok?: unknown } | undefined>;
};

export type RuntimeSummary = {
  ready: boolean;
  title: string;
  description: string;
  actionLabel: string;
};

function serviceLabel(service: RuntimeService): string {
  return service === "api" ? "API Gateway" : "Renderer";
}

function failedChecks(checks?: ReadinessPayload["checks"]): string[] {
  if (!checks) return [];
  return Object.entries(checks)
    .filter(([, value]) => value?.ok !== true)
    .map(([name]) => name);
}

export function normalizeReadinessPayload(
  service: RuntimeService,
  payload: unknown,
): RuntimeProbe {
  if (!payload || typeof payload !== "object") {
    return {
      service,
      label: serviceLabel(service),
      state: "unreachable",
      detail: "No readiness payload",
    };
  }

  const readiness = payload as ReadinessPayload;
  const status = typeof readiness.status === "string" ? readiness.status.toLowerCase() : "";
  const failures = failedChecks(readiness.checks);

  if (status === "ready" && failures.length === 0) {
    return {
      service,
      label: serviceLabel(service),
      state: "ready",
      detail: "Ready",
    };
  }

  if (status === "healthy") {
    return {
      service,
      label: serviceLabel(service),
      state: "ready",
      detail: "Healthy",
    };
  }

  if (status === "degraded" || failures.length > 0) {
    return {
      service,
      label: serviceLabel(service),
      state: "degraded",
      detail: failures.length > 0 ? `Waiting on ${failures.join(", ")}` : "Degraded",
    };
  }

  return {
    service,
    label: serviceLabel(service),
    state: "unreachable",
    detail: status ? `Unexpected status: ${status}` : "Unavailable",
  };
}

export function buildRuntimeSummary(probes: RuntimeProbe[]): RuntimeSummary {
  const ready = probes.length > 0 && probes.every((probe) => probe.state === "ready");

  if (ready) {
    return {
      ready: true,
      title: "Workspace ready",
      description: "All local services responded. Loading the product workspace.",
      actionLabel: "Open workspace",
    };
  }

  const degraded = probes.filter((probe) => probe.state === "degraded");
  if (degraded.length > 0) {
    return {
      ready: false,
      title: "Waiting for local services",
      description: degraded.map((probe) => `${probe.label}: ${probe.detail}`).join(" • "),
      actionLabel: "Retry now",
    };
  }

  return {
    ready: false,
    title: "Checking local services",
    description: "API Gateway and renderer must be reachable before the workspace can open.",
    actionLabel: "Retry now",
  };
}
