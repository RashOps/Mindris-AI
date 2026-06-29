export type RouteMetric = {
    total_count: number;
    error_count: number;
    avg_duration_ms: number;
    max_duration_ms: number;
    last_duration_ms: number;
    last_status: number;
    methods: Record<string, number>;
};

export type RendererMetricsSnapshot = {
    status: "success";
    service: "renderer";
    readiness: {
        status: "ready";
        checks: {
            templates: { ok: true };
            pdf: { ok: true };
        };
    };
    requests: {
        total_count: number;
        error_count: number;
        routes: Record<string, RouteMetric>;
    };
    render: {
        failures: {
            total_count: number;
            routes: Record<string, number>;
        };
    };
};

function createRouteMetric(): RouteMetric {
    return {
        total_count: 0,
        error_count: 0,
        avg_duration_ms: 0,
        max_duration_ms: 0,
        last_duration_ms: 0,
        last_status: 0,
        methods: {},
    };
}

export class RendererMonitor {
    private totalCount = 0;
    private errorCount = 0;
    private readonly routes = new Map<string, RouteMetric>();
    private renderFailureTotal = 0;
    private readonly renderFailures = new Map<string, number>();

    recordRequest(route: string, method: string, status: number, durationMs: number) {
        this.totalCount += 1;
        if (status >= 400) {
            this.errorCount += 1;
        }
        const metric = this.routes.get(route) ?? createRouteMetric();
        metric.total_count += 1;
        if (status >= 400) {
            metric.error_count += 1;
        }
        metric.avg_duration_ms = (
            ((metric.avg_duration_ms * (metric.total_count - 1)) + durationMs)
            / metric.total_count
        );
        metric.max_duration_ms = Math.max(metric.max_duration_ms, durationMs);
        metric.last_duration_ms = durationMs;
        metric.last_status = status;
        metric.methods[method] = (metric.methods[method] ?? 0) + 1;
        this.routes.set(route, metric);
    }

    recordRenderFailure(route: string) {
        this.renderFailureTotal += 1;
        this.renderFailures.set(route, (this.renderFailures.get(route) ?? 0) + 1);
    }

    snapshot(): RendererMetricsSnapshot {
        return {
            status: "success",
            service: "renderer",
            readiness: {
                status: "ready",
                checks: {
                    templates: { ok: true },
                    pdf: { ok: true },
                },
            },
            requests: {
                total_count: this.totalCount,
                error_count: this.errorCount,
                routes: Object.fromEntries(this.routes.entries().map(([route, metric]) => [
                    route,
                    {
                        ...metric,
                        avg_duration_ms: Number(metric.avg_duration_ms.toFixed(2)),
                        max_duration_ms: Number(metric.max_duration_ms.toFixed(2)),
                        last_duration_ms: Number(metric.last_duration_ms.toFixed(2)),
                    },
                ])),
            },
            render: {
                failures: {
                    total_count: this.renderFailureTotal,
                    routes: Object.fromEntries(this.renderFailures.entries()),
                },
            },
        };
    }
}
