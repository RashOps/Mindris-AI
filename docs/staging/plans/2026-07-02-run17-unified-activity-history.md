# Plan: Run 17 Unified activity history

spec: `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`

- [x] T1: Unified ledger backend contract
  goal: Add one aggregate history endpoint that emits normalized ledger items across jobs, ATS reports, cover letters, resume revisions, tracker entries, and derived LLM runs.
  files: `services/api-gateway/routers/history.py`, `services/api-gateway/persistence.py`, `services/api-gateway/schemas.py`, `tests/test_history_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_history_api.py -q`
  spec: `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`

- [x] T2: Artifact lineage and filtering
  goal: Compute lineage links between persisted artifacts and expose backend filters by subject type, related job id, and related resume id without breaking older records.
  files: `services/api-gateway/routers/history.py`, `services/api-gateway/persistence.py`, `tests/test_history_api.py`, `tests/test_tracker_crud.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_history_api.py tests/test_tracker_crud.py -q`
  spec: `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`

- [x] T3: AppShell audit page
  goal: Add a dedicated audit-oriented history page in the AppShell with type filters, chronological browsing, and lineage inspection driven entirely by backend payloads.
  files: `apps/web/src/config/layout.ts`, `apps/web/src/app/tools/history/page.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/store/useCVStore.ts`, `apps/web/src/store/useCVStore.test.ts`
  acceptance: `cd apps/web && bun test src/store/useCVStore.test.ts && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`

- [x] T4: Phase closure and validation
  goal: Run cross-stack validation for unified history, sync staging docs, and close Phase 17 in the roadmap when the run is green.
  files: `docs/roadmap.md`, `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`, `docs/staging/plans/2026-07-02-run17-unified-activity-history.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_history_api.py tests/test_tracker_crud.py -q && cd apps/web && bun test src/store/useCVStore.test.ts && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run17-unified-activity-history.md`
