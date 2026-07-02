# Plan: Run 18 workflow automation

spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`

- [ ] T1: Opportunity workflow backend contract
  goal: Introduce one persisted `opportunity` anchor and its transition log so the application workflow becomes explicit, auditable, and backend-owned.
  files: `packages/database/records.py`, `packages/database/migrations.py`, `services/api-gateway/schemas.py`, `tests/test_database_migrations.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_database_migrations.py -q`
  spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`

- [ ] T2: Workflow persistence and API
  goal: Expose backend endpoints to create an opportunity, link artifacts, create/attach tracker entries, and mark the workflow ready to apply with deterministic state transitions.
  files: `services/api-gateway/persistence.py`, `services/api-gateway/routers/workflows.py`, `services/api-gateway/main.py`, `services/api-gateway/schemas.py`, `tests/test_workflows_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_workflows_api.py -q`
  spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`

- [ ] T3: History and lineage integration
  goal: Extend the unified ledger so opportunities and workflow transitions appear with lineage to job, resume, ATS, cover letter, and tracker artifacts.
  files: `services/api-gateway/routers/history.py`, `services/api-gateway/persistence.py`, `tests/test_history_api.py`, `tests/test_workflows_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_history_api.py tests/test_workflows_api.py -q`
  spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`

- [ ] T4: Guided workflow UI
  goal: Add one client-only workflow surface in the AppShell that reads backend opportunity state, linked artifacts, and next actions without frontend orchestration logic.
  files: `apps/web/src/app/tools/*`, `apps/web/src/lib/api.ts`, `apps/web/src/store/*`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`

- [ ] T5: Phase validation and closure
  goal: Run targeted validation for workflow automation, update roadmap progress, and close the run when backend and frontend flows are green.
  files: `docs/roadmap.md`, `docs/staging/specs/2026-07-02-run18-workflow-automation.md`, `docs/staging/plans/2026-07-02-run18-workflow-automation.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_database_migrations.py tests/test_workflows_api.py tests/test_history_api.py -q && cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run18-workflow-automation.md`
