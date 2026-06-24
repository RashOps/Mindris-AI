# Plan: DOCX, hardening, Docker, E2E

spec: `docs/staging/specs/2026-06-24-docx-hardening-docker-e2e.md`

- [x] T1: DOCX export backend and CV Builder action

goal: Add backend-owned DOCX export and expose it from the CV Builder.
files: `services/api-gateway/exporters.py`, `services/api-gateway/routers/resumes.py`, `services/api-gateway/pyproject.toml`, `apps/web/src/app/tools/cv-creator/page.tsx`, `tests/test_resumes_api.py`, `tests/smoke_mvp1_backend.py`, `docs/open-exports.md`, `docs/command_control.md`
acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-docx-test uv run --no-sync python tests/smoke_mvp1_backend.py`; `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync ruff check services/api-gateway/exporters.py services/api-gateway/routers/resumes.py tests/test_resumes_api.py tests/smoke_mvp1_backend.py`; `cd apps/web && bun run lint && bun run typecheck`
spec: `docs/staging/specs/2026-06-24-docx-hardening-docker-e2e.md#docx-export`

- [x] T2: Microservice hardening

goal: Add readiness/health checks, normalized representative errors, timeout-aware service calls, and stricter local storage safety.
files: `services/api-gateway/main.py`, `services/api-gateway/routers/system.py`, `services/api-gateway/routers/cv.py`, `services/api-gateway/routers/optimize.py`, `services/api-gateway/routers/resumes.py`, `services/api-gateway/persistence.py`, `services/renderer/src/server.ts`, `services/renderer/README.md`, `tests/test_api_health.py`, `tests/smoke_mvp1_backend.py`
acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-hardening-test uv run --no-sync python tests/smoke_mvp1_backend.py`; `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync ruff check services/api-gateway/main.py services/api-gateway/routers/system.py services/api-gateway/routers/cv.py services/api-gateway/routers/optimize.py services/api-gateway/routers/resumes.py services/api-gateway/persistence.py tests/test_api_health.py tests/smoke_mvp1_backend.py`; `cd services/renderer && bun run typecheck && bun run build`
spec: `docs/staging/specs/2026-06-24-docx-hardening-docker-e2e.md#microservice-hardening`

- [x] T3: Docker validation path

goal: Make self-hosted Docker startup verifiable and document any environment-specific blocker exactly.
files: `docker-compose.yml`, `Dockerfile`, `apps/web/Dockerfile`, `services/renderer/Dockerfile`, `scripts/smoke_self_hosting.sh`, `docs/self-hosting.md`, `docs/command_control.md`
acceptance: `docker compose config --quiet`; `sh -n scripts/smoke_self_hosting.sh`; full `docker compose up --build` verified or blocked with the exact Docker/network reason documented.
spec: `docs/staging/specs/2026-06-24-docx-hardening-docker-e2e.md#docker-validation`

- [x] T4: Browser E2E critical paths

goal: Add a stable browser E2E suite for the critical user paths without requiring paid LLM keys.
files: `apps/web/package.json`, `apps/web`, `tests/e2e`, `scripts`, `docs/command_control.md`, `docs/local-development.md`
acceptance: one documented E2E command runs create/load CV, template change, PDF export, DOCX export, ATS fixture/mocked flow, and Job Tracker add/move paths; `cd apps/web && bun run lint && bun run typecheck && bun run build`
spec: `docs/staging/specs/2026-06-24-docx-hardening-docker-e2e.md#browser-e2e`

[parallel] T1, T2, T3 after shared endpoint names are fixed. T4 depends on T1 and T2.
