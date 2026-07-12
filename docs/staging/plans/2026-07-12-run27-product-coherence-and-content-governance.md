# Plan: Phase 27 Product coherence, QA, and content governance

spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md

- [x] T1: Normalize shared page primitives and guide surfaces onto the final UI contract
  goal: Remove remaining page-local visual drift in common product primitives and the Guide route so the shell surfaces read as one coherent workspace.
  files: apps/web/src/components/layout/PagePrimitives.tsx, apps/web/src/app/tools/guide/page.tsx, apps/web/src/app/tools/layout.tsx, docs/ui-system.md
  acceptance: cd apps/web && bun run typecheck && bun run lint
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-27---product-coherence-qa-and-content-governance

- [x] T2: Align in-app copy and metadata with the actual local-first runtime
  goal: Remove aspirational or stale wording from core product guidance and metadata so Mindris describes the shipped local-first, backend-owned behavior accurately.
  files: apps/web/src/components/help/guide-content.ts, apps/web/src/app/layout.tsx, apps/web/src/app/tools/cv-creator/layout.tsx, README.md
  acceptance: cd apps/web && bun run typecheck
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-27---product-coherence-qa-and-content-governance

- [ ] T3: Add focused coherence regressions and re-run the local validation path
  goal: Lock guide/navigation/runtime copy expectations with targeted tests and verify the critical local product path after the coherence pass.
  files: apps/web/src/config/layout.test.ts, apps/web/src/components/help/guide-content.test.ts, apps/web/src/lib/api.test.ts, docs/roadmap.md, docs/staging/plans/2026-07-12-run27-product-coherence-and-content-governance.md
  acceptance: cd apps/web && bun test src/config/layout.test.ts src/components/help/guide-content.test.ts src/lib/api.test.ts && ./scripts/smoke_local.sh
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#test
