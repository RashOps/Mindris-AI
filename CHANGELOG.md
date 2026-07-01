# Changelog

All notable changes to Mindris AI are documented here.

## Unreleased

No unreleased changes.

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
