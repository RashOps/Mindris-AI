# Plan: Open-source differentiation v1

spec: `docs/staging/specs/2026-06-25-open-source-differentiation-v1.md`

- [x] T1: LaTeX / Typst export backend
  goal: Add backend-owned LaTeX and Typst exports for resumes and expose them in the product.
  files: `services/api-gateway/exporters.py`, `services/api-gateway/routers/resumes.py`, `apps/web/src/app/tools/cv-creator/page.tsx`, `tests/test_resumes_api.py`, `tests/smoke_mvp1_backend.py`, `docs/open-exports.md`, `docs/command_control.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-tex-export uv run --no-sync python tests/smoke_mvp1_backend.py`; `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync ruff check services/api-gateway/exporters.py services/api-gateway/routers/resumes.py tests/test_resumes_api.py tests/smoke_mvp1_backend.py`; `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-06-25-open-source-differentiation-v1.md#export-latex-typst`

- [x] T2: Revision comparison API and UI
  goal: Expose a diff between two resume snapshots and show it from the version history panel.
  files: `services/api-gateway/persistence.py`, `services/api-gateway/routers/resumes.py`, `services/api-gateway/schemas.py`, `apps/web/src/app/dashboard/page.tsx`, `tests/test_resumes_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py`; `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-06-25-open-source-differentiation-v1.md#revision-comparison`

- [x] T3: One page challenge mode
  goal: Add a dense layout mode that prefers one-page output without silently dropping content.
  files: `services/api-gateway/schemas.py`, `services/renderer/src/templates/engine.ts`, `services/renderer/src/templates/styles/*.css`, `apps/web/src/components/StylePanel.tsx`, `tests/test_resumes_api.py`, `tests/e2e/mvp1_browser.py`
  acceptance: `cd services/renderer && bun run typecheck && bun run build`; `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py`
  spec: `docs/staging/specs/2026-06-25-open-source-differentiation-v1.md#one-page-challenge`

- [x] T4: Local-first / BYOK / Ollama hardening
  goal: Keep the frontend as a client-only shell while making local provider settings and persistence explicit and robust.
  files: `apps/web/src/store/useCVStore.ts`, `apps/web/src/components/LLMSelector.tsx`, `apps/web/src/components/StylePanel.tsx`, `services/api-gateway/schemas.py`, `services/intelligence/llm_config.py`, `tests/test_llm.py`, `tests/test_ollama.py`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`; `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_llm.py tests/test_ollama.py -q -s`
  spec: `docs/staging/specs/2026-06-25-open-source-differentiation-v1.md#local-first-byok-ollama`

[parallel] T1 and T4 can start in parallel after the run spec is approved. T2 should wait for revision payload shape. T3 should follow after the layout contract is fixed.
