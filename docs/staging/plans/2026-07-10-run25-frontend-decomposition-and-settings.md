# Plan: Phase 25 Frontend surface decomposition and IA settings refactor

spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md

- [x] T1: Split configuration into clear operator sections
  goal: Separate provider defaults, secret slots, and local runtime diagnostics into clearer UI sections without changing backend contracts or moving business logic into the browser.
  files: apps/web/src/components/settings/ConfigurationDrawer.tsx, apps/web/src/components/settings/*
  acceptance: cd apps/web && bun run typecheck && bun run lint
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-25---frontend-surface-decomposition-and-operator-ia-settings-refactor

- [x] T2: Decompose CV Builder header and local action surfaces
  goal: Extract the dense CV Builder header into stable subcomponents so resume context, locale management, runtime controls, and actions stop drifting together.
  files: apps/web/src/app/tools/cv-creator/page.tsx, apps/web/src/app/tools/cv-creator/*
  acceptance: cd apps/web && bun run typecheck && bun run lint
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-25---frontend-surface-decomposition-and-operator-ia-settings-refactor

- [x] T3: Decompose workflow and tracker presentation helpers
  goal: Move repeated presentation logic and dense card sections out of monolithic page files so future UI fixes land in smaller ownership units.
  files: apps/web/src/app/tools/workflow/page.tsx, apps/web/src/app/tools/workflow/*, apps/web/src/app/tools/tracker/page.tsx, apps/web/src/app/tools/tracker/*
  acceptance: cd apps/web && bun run typecheck && bun run lint
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-25---frontend-surface-decomposition-and-operator-ia-settings-refactor

- [x] T4: Add focused regression coverage for the new frontend seams
  goal: Protect the decomposed configuration and builder surfaces with targeted tests that prove navigation structure and client-only settings behavior remain intact.
  files: apps/web/src/components/settings/*.test.ts, apps/web/src/config/layout.test.ts, apps/web/src/components/ThemeProvider.test.ts
  acceptance: cd apps/web && bun test src/components/ThemeProvider.test.ts src/config/layout.test.ts src/components/settings/*.test.ts
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#test

- [x] T5: Re-baseline roadmap and docs after the decomposition pass
  goal: Mark the phase complete in staging and roadmap docs once the decomposed surfaces and settings contract match the shipped UI.
  files: docs/roadmap.md, docs/staging/plans/2026-07-10-run25-frontend-decomposition-and-settings.md, docs/ui-system.md
  acceptance: manual: verify Phase 25 is reflected accurately in roadmap and UI-system docs after validation passes.
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-25---frontend-surface-decomposition-and-operator-ia-settings-refactor
