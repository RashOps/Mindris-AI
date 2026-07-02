milestone: Phase 15 (see docs/roadmap.md)

# Run 15 - Configuration and local runtime control

contract: The frontend remains a client-only surface. All configuration state, provider defaults, model discovery, and runtime diagnostics are backend-owned and read through explicit APIs.

contract: Phase 15 closes the operability gap between the already-shipped backend configuration primitives and the operator experience exposed in the AppShell.

decision: Treat existing work as baseline, not new scope.

decision: The following capabilities are already present and must be preserved:
- backend-owned runtime configuration persistence in `packages/utils/runtime_config.py`
- secure configuration and secret routes in `services/api-gateway/routers/system.py`
- Ollama discovery route at `/api/v1/system/ollama-models`
- Bun renderer watch reload in `services/renderer/package.json`
- initial `ConfigurationDrawer` in `apps/web/src/components/settings/ConfigurationDrawer.tsx`

decision: Run 15 focuses only on the missing closure work:
- expose runtime diagnostics in the AppShell configuration surface
- surface backend readiness and local runtime state without source edits
- align configuration UX with the backend contract already in place
- add explicit validation coverage for configuration, Ollama discovery, and diagnostics

decision: The `Configuration` entry lives as a dedicated AppShell sidebar section positioned above `Local Services`, not as a header-only action.

contract: The configuration surface must expose:
- task-level provider/model defaults
- PDF ingestion mode
- provider configuration status
- write-only secret slot state
- runtime diagnostics summary for API, renderer, storage, SQLite, and local Ollama discovery

contract: Runtime diagnostics data is read-only in the browser.

invariant: The browser must never infer backend health from hidden local state when an API contract already exists.

decision: Runtime diagnostics will be served by backend and renderer endpoints, then aggregated in the frontend UI.

contract: Diagnostics payload must cover:
- API readiness
- renderer reachability
- storage and vector DB writability
- SQLite readiness
- logs/storage paths as metadata only
- Ollama discovery status and discovered model count

decision: Renderer diagnostics should reuse existing public health endpoints if sufficient; otherwise add a small explicit status endpoint in the renderer service.

failure: If a diagnostics source is unreachable, the UI shows degraded state and actionable text, but configuration editing remains available where backend APIs still respond.

failure: If Ollama is unavailable, the UI must show that discovery is unavailable without blocking non-Ollama providers.

test: Backend tests must cover configuration read/write, secret masking, Ollama discovery behavior, and diagnostics aggregation endpoints.

test: Frontend tests must cover configuration mapping, diagnostics rendering states, and degraded/unavailable service states without relying on browser-local hidden logic.

deferred: Full release automation CI is not part of Run 15.

deferred: ATS transparency, workflow ledger, and orchestration remain later runs.

## Working notes

- Audit result: `ConfigurationDrawer` already loads `/api/v1/system/configuration` and `/api/v1/system/ollama-models`, but it does not yet close the runtime diagnostics goal in a product-complete way.
- Audit result: `/api/v1/system/status`, `/api/v1/system/ready`, and `/api/v1/system/metrics` already exist on the API side.
- Audit result: Bun watch reload is already enabled via `bun --watch src/server.ts`.
- Likely implementation center:
  - extend backend system contract or add a composite diagnostics route
  - add a diagnostics section/card inside `ConfigurationDrawer`
  - add tests for degraded renderer / unavailable Ollama cases
