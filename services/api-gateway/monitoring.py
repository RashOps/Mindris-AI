"""Lightweight in-memory runtime monitoring for the API gateway."""

from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock


@dataclass
class RouteStats:
    """Aggregated request stats for one route."""

    total_count: int = 0
    error_count: int = 0
    avg_duration_ms: float = 0.0
    max_duration_ms: float = 0.0
    last_duration_ms: float = 0.0
    last_status: int = 0
    methods: dict[str, int] = field(default_factory=dict)

    def record(self, method: str, status: int, duration_ms: float) -> None:
        """Update the route aggregate with one completed request."""
        self.total_count += 1
        if status >= 400:
            self.error_count += 1
        self.avg_duration_ms = (
            (self.avg_duration_ms * (self.total_count - 1)) + duration_ms
        ) / self.total_count
        self.max_duration_ms = max(self.max_duration_ms, duration_ms)
        self.last_duration_ms = duration_ms
        self.last_status = status
        self.methods[method] = self.methods.get(method, 0) + 1


class RuntimeMonitor:
    """Track request latency, readiness snapshots, and pipeline failures."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._routes: dict[str, RouteStats] = {}
        self._total_count = 0
        self._error_count = 0
        self._pipeline_failures: dict[str, int] = {
            "optimize": 0,
            "cv_upload_pdf": 0,
            "ats_score": 0,
            "cover_letter": 0,
        }

    def record_request(
        self,
        *,
        route: str,
        method: str,
        status: int,
        duration_ms: float,
    ) -> None:
        """Store one request measurement for the given route."""
        with self._lock:
            self._total_count += 1
            if status >= 400:
                self._error_count += 1
            stats = self._routes.setdefault(route, RouteStats())
            stats.record(method=method, status=status, duration_ms=duration_ms)

    def increment_pipeline_failure(self, pipeline: str) -> None:
        """Increment the failure counter for a named pipeline."""
        with self._lock:
            self._pipeline_failures[pipeline] = (
                self._pipeline_failures.get(pipeline, 0) + 1
            )

    def snapshot(self, *, readiness: dict | None = None) -> dict:
        """Return a serializable monitoring snapshot for the service."""
        with self._lock:
            total_count = self._total_count
            error_count = self._error_count
            routes = {
                route: {
                    "total_count": stats.total_count,
                    "error_count": stats.error_count,
                    "avg_duration_ms": round(stats.avg_duration_ms, 2),
                    "max_duration_ms": round(stats.max_duration_ms, 2),
                    "last_duration_ms": round(stats.last_duration_ms, 2),
                    "last_status": stats.last_status,
                    "methods": dict(stats.methods),
                }
                for route, stats in self._routes.items()
            }
            failures = dict(self._pipeline_failures)
        return {
            "status": "success",
            "service": "api-gateway",
            "readiness": readiness or {"status": "unknown"},
            "requests": {
                "total_count": total_count,
                "error_count": error_count,
                "routes": routes,
            },
            "pipelines": {
                "failures": {
                    **failures,
                    "total": sum(failures.values()),
                }
            },
        }


monitor = RuntimeMonitor()
