# Plan: Run 22 Workflow reliability and data integrity

spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md

- [x] T1: Audit the current workflow graph and persistence invariants
  goal: Identify the exact backend records, linkage fields, and failure states for opportunity, ATS, cover letter, resume, locale variant, tracker, and history integration.
  files: services/api-gateway/**, services/intelligence/**, packages/database/**, docs/architecture.md
  acceptance: audit note added to the run plan or spec with concrete invariants and weak points
  spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md
  audit:
  - Source-of-truth workflow anchor is `OpportunityRecord`; state transitions are appended in `OpportunityTransitionRecord`.
  - `serialize_opportunity()` currently resolves linked artifacts best-effort, but silently omits missing linked rows instead of exposing integrity health.
  - `ApplicationRecord` deletion in `services/api-gateway/routers/tracker.py` can leave `OpportunityRecord.application_id` orphaned.
  - Resume deletion in `services/api-gateway/routers/resumes.py` can leave `OpportunityRecord.resume_id` orphaned.
  - Locale deletion in `delete_resume_locale_variant()` can invalidate `OpportunityRecord.resume_locale` for linked opportunities without repairing them.
  - History ledger builders already aggregate workflow links, but they also degrade silently and cannot distinguish healthy vs detached links.
  - Current workflow tests are happy-path only; no regression coverage exists for orphan creation, degraded-state surfacing, or bounded repair flows.

- [ ] T2: Add backend integrity checks and normalized degraded states
  goal: Detect orphaned or inconsistent workflow links and surface them through stable API metadata instead of implicit null handling.
  files: packages/database/**, services/api-gateway/**, shared workflow persistence modules
  acceptance: uv run pytest tests -q -k "workflow or history or tracker"
  spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md

- [ ] T3: Implement bounded repair and retry actions
  goal: Allow safe re-link, retry, or detach flows for incomplete ATS / LM / tracker states without corrupting the workflow graph.
  files: services/api-gateway/routers/**, workflow services, apps/web workflow-facing pages
  acceptance: targeted API tests for retry/repair endpoints plus frontend typecheck/lint
  spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md

- [ ] T4: Expose workflow integrity and recovery affordances in the UI
  goal: Make degraded workflow states visible in opportunity/history/tracker surfaces with clear next actions and no frontend-owned workflow logic.
  files: apps/web/src/app/tools/**, apps/web/src/components/**, apps/web/src/store/**
  acceptance: cd apps/web && bun run lint && bun run typecheck
  spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md

- [ ] T5: Add regression coverage for resumed and partially failed workflows
  goal: Lock the continuity contract with backend and browser tests around real linked flows.
  files: tests/**, apps/web/tests/**, scripts/** as needed
  acceptance: project-targeted pytest plus Playwright run for the workflow suite
  spec: docs/staging/specs/2026-07-02-run22-workflow-reliability-and-data-integrity.md
