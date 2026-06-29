# Plan: Runtime polish and local operations

spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md`

- [x] T1: CV Builder grouped upload/download header
  goal: Replace the noisy upload/export button cluster with two grouped menus while keeping current flows intact.
  files: `apps/web/src/app/tools/cv-creator/page.tsx`, `tests/e2e/mvp1_browser.py`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t1-header-cleanup`

- [x] T2: Frontend startup gate
  goal: Block the app shell until API and renderer readiness are known and visible to the user.
  files: `apps/web/src/app`, `apps/web/src/components/layout`, `docs/command_control.md`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t2-startup-gate`

- [x] T3: Renderer OpenAPI
  goal: Add generated OpenAPI docs and OpenAPI JSON to the Bun renderer.
  files: `services/renderer/src/server.ts`, `services/renderer/package.json`, `docs/command_control.md`
  acceptance: `cd services/renderer && bun run typecheck && bun run build`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t3-renderer-openapi`

- [ ] T4: Bun renderer structured logging
  goal: Replace console logging with file-backed structured logging in `.logs`.
  files: `services/renderer/src/server.ts`, `services/renderer/src`, `.logs`
  acceptance: `cd services/renderer && bun run typecheck && bun run build`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t4t5-logging`

- [ ] T5: Python logger refactor
  goal: Rework `packages/utils/logger.py` into a cleaner multi-service logging base.
  files: `packages/utils/logger.py`, `services/api-gateway`, `services/intelligence`, `services/scraper`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_api_health.py -q`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t4t5-logging`

- [ ] T6: Dual PDF ingestion modes
  goal: Keep `llama-parse` and add a selectable local parsing path plus `auto`.
  files: `services/intelligence/pdf_parser.py`, `services/api-gateway/routers/cv.py`, `apps/web/src`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_api_health.py tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t6-ingestion-modes`

- [ ] T7: Lightweight monitoring
  goal: Add runtime instrumentation without introducing a heavy observability stack.
  files: `services/api-gateway`, `services/renderer`, `docs`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_api_health.py -q`
  spec: `docs/staging/specs/2026-06-29-runtime-polish-and-local-ops.md#t7-monitoring`

[parallel] T1 can ship independently. T2 and T3 can proceed after T1. T4 and T5 should be aligned before T7. T6 depends on the logging baseline only if we want ingestion-path metrics from day one.
