# Plan: Run 19 recruiter intelligence layer

spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`

- [x] T1: Deterministic company profile contract
  goal: Extend the company insight model with deterministic profile fields, provenance markers, evidence snippets, and cache metadata without requiring any LLM call.
  files: `services/intelligence/company_analyzer.py`, `services/api-gateway/schemas.py`, `packages/database/records.py`, `tests/test_company_intelligence.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_company_intelligence.py -q`
  spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`

- [x] T2: Local role-fit and risk engine
  goal: Compute role-fit hints and explicit risk/unknown signals from job + company + optional resume context with deterministic rules only.
  files: `services/intelligence/company_analyzer.py`, `services/api-gateway/routers/company.py`, `tests/test_company_intelligence.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_company_intelligence.py -q`
  spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`

- [x] T3: API integration and cache reuse
  goal: Expose the richer company intelligence payload in backend routes, preserve backward compatibility, and avoid repeated expensive analysis for cached identities.
  files: `services/api-gateway/routers/company.py`, `services/api-gateway/routers/optimize.py`, `services/api-gateway/persistence.py`, `tests/test_company_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_company_api.py tests/test_company_intelligence.py -q`
  spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`

- [x] T4: Recruiter intelligence UI
  goal: Surface company profile, provenance, hints, and unknowns in the app without introducing frontend-owned orchestration.
  files: `apps/web/src/components/JobInsightsPanel.tsx`, `apps/web/src/app/tools/*`, `apps/web/src/store/useCVStore.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`

- [x] T5: Optional synthesis and phase validation
  goal: Add explicit optional synthesis over the deterministic payload, validate backend/frontend slices, and update the roadmap when the run is green.
  files: `services/intelligence/company_analyzer.py`, `docs/roadmap.md`, `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`, `docs/staging/plans/2026-07-02-run19-recruiter-intelligence-layer.md`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_company_intelligence.py tests/test_company_api.py -q && cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run19-recruiter-intelligence-layer.md`
