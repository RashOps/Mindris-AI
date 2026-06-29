import { describe, expect, test } from "bun:test";

import {
  buildRuntimeSummary,
  normalizeReadinessPayload,
  type RuntimeProbe,
} from "./runtime-readiness";

describe("runtime readiness helpers", () => {
  test("mark both services ready when payload statuses are ready", () => {
    const apiProbe = normalizeReadinessPayload("api", {
      status: "ready",
      checks: {
        storage: { ok: true },
        sqlite: { ok: true },
      },
    });
    const rendererProbe = normalizeReadinessPayload("renderer", {
      status: "ready",
      checks: {
        templates: { ok: true },
        pdf: { ok: true },
      },
    });

    const summary = buildRuntimeSummary([apiProbe, rendererProbe]);

    expect(apiProbe.state).toBe("ready");
    expect(rendererProbe.state).toBe("ready");
    expect(summary.ready).toBe(true);
    expect(summary.title).toBe("Workspace ready");
  });

  test("surface waiting state when one service is degraded", () => {
    const probes: RuntimeProbe[] = [
      normalizeReadinessPayload("api", {
        status: "degraded",
        checks: {
          storage: { ok: true },
          sqlite: { ok: false },
        },
      }),
      normalizeReadinessPayload("renderer", {
        status: "ready",
        checks: {
          templates: { ok: true },
          pdf: { ok: true },
        },
      }),
    ];

    const summary = buildRuntimeSummary(probes);

    expect(probes[0].state).toBe("degraded");
    expect(probes[0].detail).toContain("sqlite");
    expect(summary.ready).toBe(false);
    expect(summary.actionLabel).toBe("Retry now");
  });
});
