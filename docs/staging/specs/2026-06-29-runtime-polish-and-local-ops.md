# Run: Runtime polish and local operations

date: 2026-06-29
milestone: Phase 10 (see `docs/roadmap.md`)

## Scope

ship:
- Simplify the CV Builder header with grouped upload/download actions.
- Add a frontend startup gate that waits for backend and renderer readiness.
- Expose automatic OpenAPI documentation for the renderer service.
- Add structured Bun renderer logs in `.logs`.
- Refactor Python logging for clearer service-level logging.
- Keep `llama-parse` and add a selectable full-local PDF ingestion mode.
- Add lightweight runtime monitoring primitives.

deferred:
- Full centralized observability stack.
- Multi-user audit logs.
- Queue-backed ingestion orchestration.

## T1 Header cleanup

contract:
- The CV Builder top bar exposes `Upload CV` and `Download CV` as grouped actions.
- Upload menu contains at least PDF and JSON.
- Download menu contains PDF, DOCX, JSON, Markdown, HTML, LaTeX, and Typst.
- Existing backend-driven upload/export flows remain unchanged behind the UI.

failure:
- Menus remain keyboard reachable.
- Failed uploads/exports still surface clear toast errors.

test:
- Frontend lint/typecheck.
- Browser E2E verifies grouped upload/download access still works.

## T2 Startup gate

contract:
- The frontend does not render the full app shell until API and renderer readiness are known.
- Readiness screen reports service status and retries automatically.
- No business-data mocks replace the backend.

## T3 Renderer OpenAPI

contract:
- Renderer exposes generated OpenAPI docs and machine-readable OpenAPI JSON.
- Routes stay aligned with actual request schemas.

## T4/T5 Logging

contract:
- Renderer writes structured logs to `.logs`.
- Python services use a consistent logger strategy with cleaner handler setup and service separation.

## T6 Ingestion modes

contract:
- PDF ingestion offers at least `llama_parse`, `local_text`, and `auto`.
- Users can keep the existing `llama-parse` path or force a full-local pipeline.
- `auto` resolves to `llama_parse` when `LLAMA_CLOUD_API_KEY` is configured and otherwise resolves to `local_text`.
- The frontend stores the selected ingestion mode and only forwards it to the API; parsing logic stays server-side.

## T7 Monitoring

contract:
- Minimal runtime metrics cover route latency, render failures, pipeline failures, and readiness state.
