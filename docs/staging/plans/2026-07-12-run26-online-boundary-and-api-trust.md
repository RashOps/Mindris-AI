# Plan: Phase 26 Online boundary and API trust contract

spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md

- [x] T1: Replace browser public-key transport assumptions with explicit local-browser semantics
  goal: Stop teaching the frontend to carry a public API key and make the local browser path explicit in the shared transport helpers.
  files: apps/web/src/lib/api.ts, apps/web/src/components/layout/RuntimeGate.tsx, apps/web/src/lib/*.test.ts
  acceptance: cd apps/web && bun run typecheck && bun test src/lib/runtime-readiness.test.ts src/lib/system-diagnostics.test.ts
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-26---online-boundary-and-api-trust-contract-hardening

- [x] T2: Tighten backend auth entry behavior and remove query-string credential aliases
  goal: Accept API credentials only through safe backend-owned channels, preserve local-first ergonomics, and normalize auth failures around the local-vs-hosted boundary.
  files: services/api-gateway/auth.py, services/api-gateway/main.py, services/api-gateway/routers/system.py, tests/test_api_health.py, tests/test_system_api.py
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_api_health.py tests/test_system_api.py
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-26---online-boundary-and-api-trust-contract-hardening

- [x] T3: Re-baseline docs and local/self-hosting guidance for the trust boundary
  goal: Document the local-browser boundary, remove stale public-env instructions, and align roadmap status with the shipped contract.
  files: README.md, docs/self-hosting.md, docs/command_control.md, docs/adr/006-backend-source-of-truth-and-saas-ready-stabilization.md, docs/roadmap.md, docs/staging/plans/2026-07-12-run26-online-boundary-and-api-trust.md
  acceptance: manual: verify browser instructions no longer require NEXT_PUBLIC_API_KEY and local-vs-hosted auth behavior is stated consistently.
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-26---online-boundary-and-api-trust-contract-hardening
