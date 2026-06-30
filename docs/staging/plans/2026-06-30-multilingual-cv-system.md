# Plan: Multilingual CV System

spec: `docs/staging/specs/2026-06-30-multilingual-cv-system.md`

- [x] T1: Backend multilingual contract and lazy migration
  goal: Extend persisted resumes with a backend-owned multilingual block, keep `cvData` backward-compatible, and lazily migrate legacy single-locale resumes during serialization and update flows.
  files: `services/api-gateway/schemas.py`, `services/api-gateway/persistence.py`, `services/api-gateway/routers/resumes.py`, `tests/test_resumes_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-30-multilingual-cv-system.md#multilingual-cv-system`

- [x] T2: Locale variant API operations
  goal: Add API operations to create, switch, and delete locale variants with normalized errors and revision-aware persistence.
  files: `services/api-gateway/routers/resumes.py`, `services/api-gateway/persistence.py`, `tests/test_resumes_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-30-multilingual-cv-system.md#multilingual-cv-system`

- [ ] T3: Builder/store locale-aware editing
  goal: Keep the frontend client-only by making the store and builder consume multilingual metadata from the API, switch locale variants explicitly, and edit only the selected locale payload.
  files: `apps/web/src/store/useCVStore.ts`, `apps/web/src/store/useCVStore.test.ts`, `apps/web/src/app/tools/cv-creator/page.tsx`, `apps/web/src/components/Editor.tsx`, `apps/web/src/components/StylePanel.tsx`
  acceptance: `cd apps/web && bun run lint && bun run typecheck && bun test src/store/useCVStore.test.ts`
  spec: `docs/staging/specs/2026-06-30-multilingual-cv-system.md#multilingual-cv-system`

- [ ] T4: Locale-aware exports, revisions, and browser verification
  goal: Resolve exports and revision workflows from the selected locale variant and cover the main multilingual user path in browser and backend smoke tests.
  files: `services/api-gateway/routers/resumes.py`, `services/api-gateway/persistence.py`, `tests/test_resumes_api.py`, `tests/smoke_mvp1_backend.py`, `tests/e2e/mvp1_browser.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-run12 uv run --no-sync python tests/smoke_mvp1_backend.py` and `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py -q`
  spec: `docs/staging/specs/2026-06-30-multilingual-cv-system.md#multilingual-cv-system`
