# Plan: Run 16 ATS transparency and evaluation integrity

spec: `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`

- [x] T1: ATS report contract with mode, rubric, deductions, and fallback integrity
  goal: Extend the ATS scoring schema and scoring service so reports always include explicit mode, rubric metadata, deduction reasons, and a safe fallback contract.
  files: `services/intelligence/ats_score.py`, `services/api-gateway/schemas.py`, `tests/test_ats_score.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_ats_score.py -q`
  spec: `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`

- [x] T2: ATS API and persistence traceability
  goal: Accept ATS mode through the scoring API, persist ATS transparency metadata and context, and serialize it consistently through history/tracker consumers.
  files: `packages/database/records.py`, `packages/database/migrations.py`, `services/api-gateway/persistence.py`, `services/api-gateway/routers/cv.py`, `tests/test_system_api.py`, `tests/test_tracker_crud.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_tracker_crud.py tests/test_ats_score.py -q`
  spec: `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`

- [x] T3: ATS transparency UI
  goal: Expose ATS mode selection, published rubric, top deductions, and persisted context in the ATS page without moving scoring policy into the frontend.
  files: `apps/web/src/store/useCVStore.ts`, `apps/web/src/app/tools/ats-score/page.tsx`, `apps/web/src/store/useCVStore.test.ts`
  acceptance: `cd apps/web && bun test src/store/useCVStore.test.ts && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`

- [x] T4: Phase closure and validation
  goal: Run cross-stack validation for ATS transparency, sync docs, and close Phase 16 in the roadmap when all tests are green.
  files: `docs/roadmap.md`, `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`, `docs/staging/plans/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_ats_score.py tests/test_tracker_crud.py -q && cd apps/web && bun test src/store/useCVStore.test.ts && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run16-ats-transparency-and-evaluation-integrity.md`
