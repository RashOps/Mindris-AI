# Changelog

All notable changes to Mindris AI are documented here.

## Unreleased

### Added

- Ten backend-driven CV templates with distinct visual families, filterable
  gallery previews, deterministic preset resolution, and A4/Letter coverage.
- Evidence-led resume adaptation contracts with a fact ledger, requirement
  matrix, structured evaluator feedback, and explicit human approval.
- Backend-owned `ui_locale` with typed FR/EN dictionaries and contextual Guide
  paths whose checklist progress is persisted by the API.
- Dynamic provider model discovery with cached registry snapshots and duplicate
  model normalization.
- Standard-library contributor CLI with Unix, PowerShell, and CMD launchers,
  cross-platform diagnostics, local service supervision, quality commands, and
  release verification.
- Native PowerShell installer for Docker Desktop self-hosting on Windows.
- Canonical runtime observability tree separating service events, supervised
  process output, and CLI state under a single per-instance log root.

### Changed

- Simplified Markdown PDF, ATS Score, Tracker, History, and Workflow Beta using
  progressive tabs, mobile-specific views, and backend-owned artifact groups.
- Split the template catalogue from its API routes and extracted renderer style
  assets/registry to keep complex modules within the agreed size guardrails.
- Expanded renderer validation to all ten templates across short, medium, and
  long A4/Letter content, plus real Chromium PDF exports for five families.
- Split candidate builds from stable release promotion: pull requests only
  validate, RC tags build once, and stable GHCR tags reuse the tested manifest
  digests without rebuilding.
- Reworked the public README as a complete project, installation, architecture,
  CLI, contribution, and documentation entry point.
- Delegated local shell workflows to the cross-platform CLI and hardened
  process supervision against invalid ports, stale PIDs, and reused process
  identifiers.
- Workflow Beta now reports artifact dates and resume revisions, detects ATS
  reports evaluated against stale resume revisions, blocks degraded readiness,
  and offers bounded replacement actions.

### Fixed

- Letter exports now emit an explicit Letter-sized PDF page instead of relying
  on an A4 Puppeteer default.
- Invalid or unsupported AI evidence links are rejected instead of being
  presented as grounded CV changes.

## v0.4.0 - 2026-07-18

### Added

- Backend-owned artifact lineage linking jobs, resume revisions, ATS reports,
  cover letters, opportunities, tracker entries, and LLM runs.
- Unified History ledger, Workflow Beta readiness checklist, recovery paths,
  and persistent Markdown cover-letter versioning.
- RuntimeGate readiness contract for the API Gateway and renderer.
- Three CV Builder modes (`Simple`, `Normal`, `Avance`) with Structure and
  Style exposed as accessible tabs.
- Advanced renderer-backed CV customization for templates, layout,
  typography, spacing, colors, header, links, photo, section presentation,
  and sanitized custom CSS.
- Accessible section placement board with independent main/sidebar ordering,
  transfer buttons, and cross-column drag and drop.
- Visual product guide, French-first product copy, centralized theme tokens,
  and a Lucide-only interface icon contract.
- One-command self-hosting through versioned GHCR images with install, update,
  uninstall, cleanup, and release smoke scripts.

### Changed

- Reorganized the advanced CV Builder around Offer, AI, Actions, and
  diagnostics while keeping business decisions in backend services.
- Simplified Dashboard, ATS Score, Tracker, Markdown PDF, History, and
  Workflow surfaces across light and dark themes.
- Centralized toolbar dropdowns and responsive shell behavior.
- Expanded service, application, script, installation, architecture, and
  contributor documentation.

### Fixed

- RuntimeGate no longer remains blocked after both readiness endpoints pass.
- CV template CSS now follows dynamic renderer markup for every built-in
  template.
- Section `display_mode`, `detail_level`, photo, header, link, and placement
  controls affect preview and export consistently.
- Two-column CV layouts compact each column independently after moving a
  section, eliminating implicit CSS Grid gaps.
- Theme hydration, hardcoded light surfaces, dropdown alignment, mobile
  overflow, and incomplete Unicode interface icons were corrected.
- Renderer concurrency slots are released even when Chromium fails before a
  page is created, preventing permanent PDF queue saturation.
- The latest ATS report remains available after React remounts instead of
  being consumed as a one-shot draft.
- Local setup now installs both Playwright Chromium and the Chrome build pinned
  by Puppeteer for renderer-backed PDF exports.
- Self-hosted frontends can use any loopback port without being blocked by
  CORS; remote browser origins remain explicit through `CORS_ORIGINS`.

### Security

- Browser code no longer carries public API credentials or persists product
  secrets locally.
- Upload, template, Markdown, HTML, URL, and advanced CSS boundaries are
  validated or sanitized by backend-owned contracts.
- Secret slots remain write-only and logs redact sensitive values.

### Verified

- Python backend suite, Ruff, frontend tests/lint/typecheck/build, renderer
  tests/typecheck/build, browser E2E, and Docker release smoke are release
  gates for `v0.4.0`.

## v0.3.0 - 2026-07-02

### Added

- Portable community template packages with manifest validation, backend import/export, preview delivery, and dashboard install/export flows.
- Browser E2E coverage for community templates, CV Builder, multilingual FR/EN variant handling, exports, ATS fixture flow, and Job Tracker.
- Manual CI `browser-e2e` workflow for stack-level regression checks with log artifact upload.
- Stable frontend test selectors for template, locale, and tracker critical actions.

### Fixed

- Community template preview routing now supports namespaced template ids containing `/`.
- Community template previews now load through authenticated browser-safe URLs and reject invalid PNG payloads server-side.
- Dashboard revision calls no longer hit backend endpoints with temporary non-persisted local resume ids.
- Renderer startup now respects `PORT`, making alternate local port runs behave as documented.

### Verified

- Run 13 QA hardening and community templates is complete with green local smoke, backend validation, frontend lint/typecheck, renderer tests, and browser E2E.

## v0.2.0 - 2026-06-30

### Added

- Backend-owned LaTeX and Typst exports for reusable native resume sources.
- Resume revision comparison API and dashboard diff flow for semantic snapshot review.
- One-page challenge layout mode with overflow warning support in the renderer.
- Local-first provider hardening with explicit BYOK status and Ollama-first local mode.

### Verified

- Phase 9 open-source differentiation run is complete and covered by backend, frontend, and renderer validation.

### Added

- FR/EN locale exposure in the builder and backend resume persistence.
- Community template presets in the backend catalogue and dashboard gallery.
- Simple resume versioning with snapshot, list, and restore endpoints.
- Frontend normalization for partial CV payloads to keep advanced sections stable.

### Fixed

- Partial CV imports no longer crash advanced editor sections.
- Resume locale inference now respects bilingual template presets.
- Dashboard and style controls keep community templates and locale state aligned with the backend contract.

## v0.1.0 - 2026-06-24

### Added

- MVP1 local release for the open-source resume studio.
- Backend-owned CV library with create, duplicate, delete, import JSON, autosave, and exports.
- Five resume templates: `modern`, `compact`, `ats`, `student`, and `creative`.
- CV Builder with structured editing, live preview, style controls, and PDF export without watermark.
- Open exports through the API: JSON, Markdown, and standalone HTML.
- ATS Scorer flow with CV upload, job URL analysis, score report, keyword table, and recommendations.
- Job Tracker with backend-driven applications, statuses, notes, tasks, and document association.
- Markdown to PDF workspace through the renderer service.
- Shared SaaS app shell and unified light UI for dashboard, CV Builder, ATS Scorer, Markdown PDF, and Job Tracker.
- Local non-Docker commands and documentation for running API, renderer, and web services.
- FastAPI Swagger and ReDoc endpoints at `/docs` and `/redoc`.

### Technical Notes

- Frontend remains a client: business state is owned by backend APIs and renderer services.
- Import PDF, ATS scoring, and cover letter generation depend on the selected LLM provider and credentials.
- Docker self-hosting files are present, but full image build should be verified in an environment with Docker network access.
