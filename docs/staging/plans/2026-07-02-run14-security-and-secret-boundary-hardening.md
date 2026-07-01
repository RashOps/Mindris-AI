# Plan: Run 14 Security and Secret Boundary Hardening

spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md`

- [x] T1: Backend-owned configuration and secret contract
  goal: Define and expose a backend-owned settings contract with masked secret slots and safe status metadata for providers and runtime configuration.
  files: `services/api-gateway/schemas.py`, `services/api-gateway/routers/system.py`, `packages/utils/config.py`, `tests/test_system_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_system_api.py -q`
  spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md#foundation-hardening-and-product-roadmap`

- [x] T2: Configuration UI and BYOK flows in the AppShell
  goal: Add a configuration surface in the frontend that reads backend-owned settings, updates task/provider configuration, and writes secrets without exposing plaintext values.
  files: `apps/web/src/lib/api.ts`, `apps/web/src/app/layout.tsx`, `apps/web/src/components/layout/AppShell.tsx`, `apps/web/src/components/settings/*`, `apps/web/src/store/useCVStore.ts`, `apps/web/src/store/useCVStore.test.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck && bun test src/store/useCVStore.test.ts`
  spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md#foundation-hardening-and-product-roadmap`

- [x] T3: Secret redaction and runtime trust-boundary hardening
  goal: Ensure secrets never leak through logs or API reads, and tighten runtime validation around local auth and provider configuration.
  files: `packages/utils/logger.py`, `packages/utils/config.py`, `services/api-gateway/auth.py`, `tests/test_logger.py`, `tests/test_system_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_logger.py tests/test_system_api.py -q`
  spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md#foundation-hardening-and-product-roadmap`

- [ ] T4: Upload and template package security review hardening
  goal: Tighten validation for uploaded documents and community template packages, including explicit failure behavior for malformed or unsafe inputs.
  files: `services/api-gateway/routers/cv.py`, `services/api-gateway/routers/templates.py`, `tests/test_templates_api.py`, `tests/test_cv_upload_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_templates_api.py tests/test_cv_upload_api.py -q`
  spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md#foundation-hardening-and-product-roadmap`

- [ ] T5: Repo hygiene, contributor agent guide, and Bun dev reload
  goal: Remove or repurpose dead files, add contributor guidance for coding agents, and make renderer development reload changes automatically in development only.
  files: `AGENTS.md`, `services/renderer/package.json`, `services/renderer/src/server.ts`, `docs/command_control.md`, `docs/local-development.md`
  acceptance: `cd services/renderer && bun run typecheck && bun run build`
  spec: `docs/staging/specs/2026-07-02-foundation-hardening-and-product-roadmap.md#foundation-hardening-and-product-roadmap`
