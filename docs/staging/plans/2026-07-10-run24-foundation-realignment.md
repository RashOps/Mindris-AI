# Plan: Phase 24 Theme system completion and UI contract normalization

spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md

- [ ] T1: Lock the theme bootstrap and semantic token contract
  goal: Make theme selection deterministic across first paint, persistence, and shell navigation, and remove ambiguity between global tokens and page-local overrides.
  files: apps/web/src/components/ThemeProvider.tsx, apps/web/src/app/globals.css, apps/web/src/components/layout/AppShell.tsx, docs/ui-system.md
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-24---theme-system-completion-and-ui-contract-normalization

- [ ] T2: Normalize high-traffic tool surfaces onto shared theme states
  goal: Replace remaining unreadable or mixed-theme surfaces in the highest-traffic routes with shared semantic panel, input, border, and hover states.
  files: apps/web/src/app/tools/cv-creator/page.tsx, apps/web/src/components/Editor.tsx, apps/web/src/components/StylePanel.tsx, apps/web/src/app/tools/ats-score/page.tsx, apps/web/src/app/tools/tracker/page.tsx, apps/web/src/app/tools/history/page.tsx, apps/web/src/app/tools/workflow/page.tsx, apps/web/src/components/layout/RuntimeGate.tsx
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#phase-24---theme-system-completion-and-ui-contract-normalization

- [ ] T3: Add focused regression coverage for theme switching and readability
  goal: Protect the new theme contract against regressions in theme toggling, surface contrast, and shell/tool consistency.
  files: apps/web/src/components/ThemeProvider.tsx, apps/web/src/components/layout/AppShell.tsx, apps/web/src/config/layout.test.ts, apps/web/src/store/useCVStore.test.ts
  acceptance: cd apps/web && bun test src/config/layout.test.ts src/store/useCVStore.test.ts && bun run typecheck
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#test

- [ ] T4: Re-baseline product-facing guidance after the theme pass
  goal: Update the UI-system and roadmap documentation so the completed theme contract and remaining follow-up runs are explicit and accurate.
  files: docs/ui-system.md, docs/roadmap.md, docs/staging/specs/2026-07-10-run24-foundation-realignment.md
  acceptance: manual: verify docs/ui-system.md describes the actual theme contract and docs/roadmap.md clearly shows Phase 24-27 ordering and status.
  spec: docs/staging/specs/2026-07-10-run24-foundation-realignment.md#run-breakdown
