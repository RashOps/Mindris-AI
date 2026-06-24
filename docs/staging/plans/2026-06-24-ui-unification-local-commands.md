# UI unification and non-Docker local commands

spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md`

- [ ] T1: Create the shared SaaS shell and design tokens
  goal: Add the common app layout and reusable primitives that every product page will use.
  files: `apps/web/src/app/globals.css`, `apps/web/src/components/layout/*`, `apps/web/src/components/ui/*`, `apps/web/src/config/layout.ts`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T2: Migrate dashboard into the shared shell
  goal: Remove the dashboard-specific sidebar/chrome and align cards, actions, status banners and template grid with the new SaaS UI.
  files: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/components/layout/*`
  acceptance: Manual check: `/dashboard` uses the shared shell, keeps create/import/export/duplicate/delete flows, and still calls backend APIs.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T3: Migrate CV Creator into the shared shell
  goal: Keep the builder power layout while replacing page-local chrome, emoji controls and inline styling with shared toolbar/panel primitives.
  files: `apps/web/src/app/tools/cv-creator/page.tsx`, `apps/web/src/components/Editor.tsx`, `apps/web/src/components/LivePreview.tsx`, `apps/web/src/components/GhostMode.tsx`, `apps/web/src/components/StylePanel.tsx`, `apps/web/src/components/CoverLetterModal.tsx`
  acceptance: Manual check: `/tools/cv-creator` keeps editing, preview, autosave, optimize, imports and exports; product data remains API-backed.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T4: Migrate ATS, tracker and Markdown tools
  goal: Make secondary tools visually consistent with the shell and shared components while preserving their API/renderer workflows.
  files: `apps/web/src/app/tools/ats-score/page.tsx`, `apps/web/src/app/tools/tracker/page.tsx`, `apps/web/src/app/tools/markdown/page.tsx`, `apps/web/src/components/ats/*`
  acceptance: Manual check: all tool routes share navigation, density, panels and status treatment; existing API calls still execute from the frontend.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T5: Add non-Docker setup and launch commands
  goal: Provide root-level scripts for clean dependency reinstall, first-time setup, three-service launch and local smoke validation.
  files: `scripts/reset_local_deps.sh`, `scripts/setup_local.sh`, `scripts/dev_local.sh`, `scripts/smoke_local.sh`, `docs/command_control.md`, `README.md`
  acceptance: `sh -n scripts/*.sh` and manual check of documented commands.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T6: Update documentation and roadmap
  goal: Document the unified UI direction and local non-Docker workflow.
  files: `docs/ui-system.md`, `docs/local-development.md`, `docs/adr/011-ui-system-local-dev.md`, `docs/mvp1-status.md`, `docs/roadmap.md`
  acceptance: Documentation names the shell, primitives, local commands, ports and frontend client-only invariant.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#decisions`

- [ ] T7: Full verification and scope review
  goal: Validate the repo after the UI refactor and local command additions.
  files: frontend, scripts, docs
  acceptance: `cd apps/web && bun run lint && bun run typecheck && bun run build`; `cd services/renderer && bun run typecheck && bun run build`; backend smoke passes; `git diff --check` passes; storage scan shows no new product data storage in the frontend.
  spec: `docs/staging/specs/2026-06-24-ui-unification-local-commands.md#acceptance`

[parallel] T2, T3, T4 after T1 is complete.
