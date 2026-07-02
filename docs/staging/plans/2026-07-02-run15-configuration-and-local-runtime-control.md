# Plan: Run 15 Configuration and local runtime control

spec: `docs/staging/specs/2026-07-02-run15-configuration-and-local-runtime-control.md`

- [x] T1: Dedicated Configuration section in AppShell
  goal: Move configuration from a header-only drawer trigger to a first-class AppShell section placed above `Local Services` in the sidebar while keeping frontend behavior client-only.
  files: `apps/web/src/components/layout/AppShell.tsx`, `apps/web/src/components/settings/ConfigurationDrawer.tsx`, `apps/web/src/config/layout.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run15-configuration-and-local-runtime-control.md`

- [x] T2: Runtime diagnostics contract and backend coverage
  goal: Expose a backend-owned diagnostics payload that aggregates readiness, storage, SQLite, renderer reachability, and Ollama discovery status for the configuration surface.
  files: `services/api-gateway/schemas.py`, `services/api-gateway/routers/system.py`, `tests/test_system_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_system_api.py -q`
  spec: `docs/staging/specs/2026-07-02-run15-configuration-and-local-runtime-control.md`

- [x] T3: Configuration diagnostics UI
  goal: Add a full runtime diagnostics section inside the configuration surface with degraded states, provider visibility, and local-ops metadata.
  files: `apps/web/src/components/settings/ConfigurationDrawer.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/store/useCVStore.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run15-configuration-and-local-runtime-control.md`

- [x] T4: Frontend and backend validation closure
  goal: Add or extend tests for configuration mapping, diagnostics fallback behavior, and backend diagnostics responses, then update roadmap status for Phase 15 when the run is green.
  files: `apps/web/src/store/useCVStore.test.ts`, `tests/test_system_api.py`, `docs/roadmap.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_system_api.py -q && cd apps/web && bun test src/store/useCVStore.test.ts && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run15-configuration-and-local-runtime-control.md`
