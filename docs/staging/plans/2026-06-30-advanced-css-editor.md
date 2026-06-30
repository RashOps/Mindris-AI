# Plan: Advanced CSS Editor

spec: `docs/staging/specs/2026-06-30-advanced-css-editor.md`

- [x] T1: Backend `advanced_css` contract and validation
  goal: Extend the persisted CV customization contract with a backend-owned `advanced_css` block and reject obviously unsafe payloads.
  files: `services/api-gateway/schemas.py`, `services/api-gateway/routers/templates.py`, `tests/test_resumes_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-30-advanced-css-editor.md#advanced-css-editor`

- [x] T2: Renderer CSS sanitation and warnings
  goal: Sanitize custom CSS inside the renderer and surface non-fatal warnings while keeping Shadow DOM scoping intact.
  files: `services/renderer/src/templates/engine.ts`, `services/renderer/src/templates/engine.test.ts`
  acceptance: `cd services/renderer && bun run typecheck && bun test src/templates/engine.test.ts`
  spec: `docs/staging/specs/2026-06-30-advanced-css-editor.md#advanced-css-editor`

- [x] T3: Builder expert UI for advanced CSS
  goal: Add an expert editing surface in the builder that reads capability metadata from the backend catalogue and persists `advanced_css` through the resume API only.
  files: `apps/web/src/components/StylePanel.tsx`, `apps/web/src/store/useCVStore.ts`, `apps/web/src/lib/customization-catalogue.ts`, `apps/web/src/store/useCVStore.test.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck && bun test src/store/useCVStore.test.ts`
  spec: `docs/staging/specs/2026-06-30-advanced-css-editor.md#advanced-css-editor`

- [x] T4: End-to-end preview/export stability
  goal: Verify advanced CSS persists, warnings surface, preview stays readable, and semantic exports ignore the custom CSS path.
  files: `tests/e2e/mvp1_browser.py`, `tests/smoke_mvp1_backend.py`, `tests/test_resumes_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-run11 uv run --no-sync python tests/smoke_mvp1_backend.py` and `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-30-advanced-css-editor.md#advanced-css-editor`
