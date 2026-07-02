spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [x] T1: Replace guide drawer with a dedicated in-app guide page
  goal: Add a first-class Guide route in the AppShell, move current help content into a structured page, and keep navigation coherent in collapsed and expanded shell states.
  files: apps/web/src/config/layout.ts, apps/web/src/components/layout/AppShell.tsx, apps/web/src/app/tools/guide/page.tsx, apps/web/src/components/help/*, apps/web/src/config/layout.test.ts
  acceptance: cd apps/web && bun test src/config/layout.test.ts
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [ ] T2: Stabilize shell behavior and normalize shared UI tokens
  goal: Remove shell content shifting on sidebar hover and align shared surfaces, hover states, and dark mode tokens across the AppShell baseline.
  files: apps/web/src/components/layout/AppShell.tsx, apps/web/src/app/globals.css, apps/web/src/components/ThemeToggle.tsx
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [x] T3: Implement backend-owned history purge with destructive confirmation
  goal: Add a transactional history purge endpoint and connect it to the history UI with irreversible confirmation and clear success/error handling.
  files: services/api-gateway/routers/history.py, services/api-gateway/main.py, tests/test_history_api.py, apps/web/src/app/tools/history/page.tsx
  acceptance: UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_history_api.py -q
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [x] T4: Compact the job tracker interaction model
  goal: Reduce tracker card height by default, keep primary metadata visible, and disclose reminders/actions only when needed.
  files: apps/web/src/app/tools/tracker/page.tsx
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [ ] T5: Refactor the CV Builder header into stable toolbar zones
  goal: Rebuild the builder header so CV context, optimization inputs, and actions remain aligned in expanded shell mode and under wrap pressure.
  files: apps/web/src/app/tools/cv-creator/page.tsx
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md

- [ ] T6: Finish dark-mode normalization on high-traffic tool panels
  goal: Remove remaining unreadable or mixed-theme surfaces from ATS, Style Panel, and Job Insights while keeping the client-only boundary intact.
  files: apps/web/src/app/tools/ats-score/page.tsx, apps/web/src/components/StylePanel.tsx, apps/web/src/components/JobInsightsPanel.tsx
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-02-run21-ui-system-consolidation.md
