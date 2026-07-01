# Plan: Run 13 QA Hardening and Community Templates

spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md`

- [x] T1: Community template package contract and backend validation
  goal: Define the V1 package manifest/template schema, validate required files and compatibility, and reject malformed or unsafe community template packages.
  files: `services/api-gateway/schemas.py`, `services/api-gateway/routers/templates.py`, `tests/test_templates_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_templates_api.py -q`
  spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md#run-13-qa-hardening-and-community-templates`

- [x] T2: Template package import/export and preview persistence
  goal: Import and export `.mindris-template` packages through backend-owned APIs and expose preview-ready installed template metadata to the frontend.
  files: `services/api-gateway/routers/templates.py`, `services/api-gateway/persistence.py`, `tests/test_templates_api.py`, `tests/smoke_mvp1_backend.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_templates_api.py -q` and `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-run13 uv run --no-sync python tests/smoke_mvp1_backend.py`
  spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md#run-13-qa-hardening-and-community-templates`

- [ ] T3: Builder/dashboard community template flows
  goal: Let the frontend import, export, preview, and create resumes from installed community templates while staying strictly client-only.
  files: `apps/web/src/lib/templates.ts`, `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/tools/cv-creator/page.tsx`, `apps/web/src/store/useCVStore.ts`, `apps/web/src/store/useCVStore.test.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck && bun test src/store/useCVStore.test.ts`
  spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md#run-13-qa-hardening-and-community-templates`

- [ ] T4: Renderer package CSS safety and preview parity
  goal: Reuse renderer-side CSS sanitation for community template packages and keep previews/PDF behavior aligned with installed template metadata.
  files: `services/renderer/src/templates/engine.ts`, `services/renderer/src/templates/engine.test.ts`, `services/api-gateway/routers/templates.py`
  acceptance: `cd services/renderer && bun run typecheck && bun test src/templates/engine.test.ts`
  spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md#run-13-qa-hardening-and-community-templates`

- [ ] T5: CI and browser QA hardening for multilingual and template flows
  goal: Add a reliable browser QA entry point for critical flows, cover multilingual regressions, and remove ambiguous selectors from the maintained E2E path.
  files: `.github/workflows/ci.yml`, `scripts/e2e_browser.sh`, `tests/e2e/mvp1_browser.py`, `tests/test_templates_api.py`, `docs/local-development.md`
  acceptance: `./scripts/smoke_local.sh` and `./scripts/e2e_browser.sh`
  spec: `docs/staging/specs/2026-07-01-run13-qa-hardening-and-community-templates.md#run-13-qa-hardening-and-community-templates`
