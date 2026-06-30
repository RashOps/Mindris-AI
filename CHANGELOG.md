# Changelog

All notable changes to Mindris AI are documented here.

## Unreleased

No unreleased changes.

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
