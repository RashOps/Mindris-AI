# Run: Open-source differentiation v1

date: 2026-06-25
milestone: Phase 9 (see `docs/roadmap.md`)

## Scope

ship:
- Export LaTeX and Typst for resumes.
- Semantic comparison of resume revisions.
- Mode "1 page challenge" for dense, one-page oriented layouts.
- Local-first / BYOK / Ollama hardening without turning the frontend into a service.

deferred:
- Community template marketplace.
- Full Git branching and merge history.
- Public portfolio hosting.
- Auth, billing, and multi-tenant SaaS flows.

## Export LaTeX Typst

contract:
- Backend exposes LaTeX and Typst exports next to JSON, Markdown, HTML, and DOCX.
- Frontend only triggers downloads and displays status.
- Export remains server-side and uses the existing resume data model.
- If a visual feature cannot be represented natively, the exporter degrades to readable semantic text.

failure:
- Invalid resume id returns normalized 404.
- Unsupported content falls back to semantic text, not a crash.
- Export errors return normalized JSON errors.

test:
- API smoke verifies both exports return files with the expected content type.
- Regression coverage verifies empty optional fields and malformed data do not crash export.

## Revision Comparison

contract:
- API exposes a compare view between two snapshots of the same resume.
- Payload contains revision metadata, field-level changes, and section-level summaries.
- Frontend renders the diff but never mutates the stored resume state.

failure:
- Comparing revisions from different resumes returns 404 or normalized validation error.
- Unknown revision ids return 404.

test:
- Backend tests validate compare payload shape and error handling.
- UI tests verify the diff can be opened from the version history panel.

## One Page Challenge

contract:
- A dedicated mode prefers one-page layouts by tightening density and hiding low-priority content before it sacrifices core content.
- ATS strict mode still wins over decorative layout choices.
- The renderer can emit warnings when content overflows one page.

failure:
- The mode must not drop data silently.
- If a one-page fit is impossible, the export stays readable and reports the overflow.

test:
- Renderer tests verify the mode changes density and page-break behavior.
- Browser tests verify the toggle persists and the preview/export remain stable.

## Local-first BYOK Ollama

contract:
- The frontend remains a client: it stores UI state and issues API calls only.
- Provider selection and optional local credentials are configured as user-owned settings, not a frontend service.
- Ollama remains the default local path when configured.
- Local persistence and backend synchronization stay compatible with the current resume model.

failure:
- Missing provider configuration returns a clear normalized error.
- Invalid local settings fall back to defaults without corrupting saved resumes.

test:
- Backend tests validate provider/config normalization.
- Frontend tests cover settings persistence and controlled inputs.

## Acceptance

release acceptance:
- LaTeX and Typst exports are available and tested.
- Revision comparison is available in API and UI.
- One page challenge mode is usable end to end.
- Frontend still behaves as an API client only.
- `CHANGELOG.md` has an `Unreleased` entry for the run.

## Working notes

- This run is intentionally narrower than the full open-source wishlist.
- The goal is to ship useful differentiation without reopening the whole architecture.
- Keep backend as the source of truth and avoid moving business logic into the frontend.
