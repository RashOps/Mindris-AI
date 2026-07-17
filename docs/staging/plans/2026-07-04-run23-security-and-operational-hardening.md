# Plan: Run 23 Security and Operational Hardening

spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md

- [x] T1: Harden untrusted inputs and rendering contracts
  goal: Reject malformed or unsafe uploads, template packages, CSS payloads, markdown/html content, and remote URLs with normalized API failures.
  files: services/api-gateway/routers/cv.py, services/api-gateway/routers/templates.py, services/api-gateway/schemas.py, services/renderer/src/markdown.ts, tests/test_cv_upload_api.py, tests/test_templates_api.py, services/renderer/src/openapi.test.ts
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_cv_upload_api.py tests/test_templates_api.py -q && cd services/renderer && bun test
  spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md#scope
  validation:
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_cv_upload_api.py tests/test_templates_api.py -q
  - cd services/renderer && bun test

- [x] T2: Tighten runtime API behavior and error boundaries
  goal: Enforce stricter runtime validation, consistent request correlation, safer CORS and security headers, and normalized failure envelopes without leaking internals.
  files: packages/utils/config.py, services/api-gateway/main.py, services/api-gateway/auth.py, services/api-gateway/routers/system.py, tests/test_system_api.py, tests/test_logger.py
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_system_api.py tests/test_logger.py -q
  spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md#2-runtime-and-api-hardening
  validation:
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_system_api.py tests/test_logger.py -q

- [x] T3: Remove unsafe client secret handling paths
  goal: Stop relying on unsafe browser-visible API-key transport, keep secret writes backend-owned, and prevent persistence of sensitive auth/runtime state in client storage.
  files: apps/web/src/lib/api.ts, apps/web/src/components/GhostMode.tsx, apps/web/src/app/tools/ats-score/page.tsx, apps/web/src/components/settings/ConfigurationDrawer.tsx, apps/web/src/store/useCVStore.ts, tests/test_system_api.py, apps/web/src/store/useCVStore.test.ts
  acceptance: cd apps/web && bun run lint && bun run typecheck && bun test src/store/useCVStore.test.ts
  spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md#3-secret-and-local-state-hardening
  validation:
  - cd apps/web && bun test src/store/useCVStore.test.ts src/lib/templates.test.ts
  - cd apps/web && bun run typecheck
  - cd apps/web && bun run lint

- [x] T4: Strengthen operational resilience and diagnostics
  goal: Improve structured logs, readiness signal fidelity, and recovery documentation for local storage and runtime incidents.
  files: packages/utils/logger.py, services/api-gateway/monitoring.py, services/renderer/src/logger.ts, docs/local-development.md, docs/command_control.md, docs/self-hosting.md, tests/test_logger.py
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_logger.py -q && cd services/renderer && bun run typecheck && bun run build
  spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md#4-operational-resilience
  validation:
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_logger.py -q
  - cd services/renderer && bun run typecheck
  - cd services/renderer && bun run build

- [x] T5: Lock the hardening pass with regression coverage
  goal: Re-run critical API/frontend/renderer paths under the hardened contracts and document the validated security/stability baseline for the phase.
  files: tests/e2e/mvp1_browser.py, tests/smoke_mvp1_backend.py, docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md, docs/roadmap.md
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync python tests/e2e/mvp1_browser.py && UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync python tests/smoke_mvp1_backend.py
  spec: docs/staging/specs/2026-07-04-run23-security-and-operational-hardening.md#test
  validation:
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync python tests/smoke_mvp1_backend.py
  - ./scripts/dev_local.sh
  - ./scripts/smoke_local.sh
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync python tests/e2e/mvp1_browser.py
  - UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync ruff check services/api-gateway/main.py services/api-gateway/routers/templates.py services/api-gateway/schemas.py tests/conftest.py tests/test_system_api.py tests/test_templates_api.py
