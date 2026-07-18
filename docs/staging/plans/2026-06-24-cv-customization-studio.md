# CV Customization Studio Plan

spec: docs/staging/specs/2026-06-24-cv-customization-studio.md

- [x] T1: Backend customization contract and migration
  goal: Add a versioned backend schema for page, layout, typography, colors, sections, locale, and legacy `global_settings` migration.
  files: services/api-gateway/schemas.py, services/api-gateway/persistence.py, tests/test_resumes_api.py
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T2: Customization catalogue API
  goal: Expose backend-owned allowed options, presets, ranges, section types, languages, and template compatibility for the Studio UI.
  files: services/api-gateway/routers/templates.py, services/api-gateway/schemas.py, tests/test_templates_api.py
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_templates_api.py`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T3: Renderer semantic section pipeline
  goal: Render sections from backend section configuration with deterministic order, labels, visibility, placement, and export-safe fallbacks.
  files: services/renderer/src/templates/engine.ts, services/renderer/src/templates/styles/*.css, services/renderer/src/server.ts
  acceptance: `cd services/renderer && bun run typecheck && bun run build`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T4: Advanced layout, typography, and color tokens
  goal: Apply A4/Letter, one/two columns, sidebar position/width, density, header alignment, photo flags, font pairing, date/bullet styles, palettes, monochrome mode, and contrast-safe colors.
  files: services/renderer/src/templates/engine.ts, services/renderer/src/templates/styles/*.css, services/api-gateway/schemas.py, tests/test_resumes_api.py
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py && cd services/renderer && bun run typecheck`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T5: Advanced section data
  goal: Add certifications, volunteering, publications, references, and custom sections through backend validation, editor state, renderer, and open exports.
  files: services/api-gateway/schemas.py, services/api-gateway/exporters.py, apps/web/src/store/useCVStore.ts, apps/web/src/components/Editor.tsx, tests/test_resumes_api.py
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_resumes_api.py tests/test_mvp_resume_flow.py`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T6: Backend-driven Studio UI
  goal: Rebuild the StylePanel/structure controls around the customization catalogue while keeping the frontend as an API client only.
  files: apps/web/src/components/StylePanel.tsx, apps/web/src/store/useCVStore.ts, apps/web/src/lib/customization-catalogue.ts, apps/web/src/lib/customization-catalogue.test.ts, apps/web/src/types/bun-test.d.ts
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

- [x] T7: Export parity and E2E customization flow
  goal: Verify custom labels, hidden sections, ordering, ATS strict mode, PDF, DOCX, HTML, Markdown, and browser critical paths.
  files: tests/e2e/mvp1_browser.py, scripts/e2e_browser.sh, tests/smoke_mvp1_backend.py, docs/command_control.md
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ai-customization-test uv run --no-sync python tests/smoke_mvp1_backend.py` and `./scripts/e2e_browser.sh`
  spec: docs/staging/specs/2026-06-24-cv-customization-studio.md#cv-customization-studio

[parallel] T2 can run after T1 schema decisions are merged. T3 and T4 should remain sequential because renderer semantics and tokens touch the same files. T5 should run before T6 so the UI consumes the final section model. T7 runs last.

# Mise à jour du 18 juillet 2026

La répartition des sections est désormais exposée sous forme de colonnes
visuelles dans l'onglet Sections. Les boutons de transfert constituent le
mécanisme accessible principal et le glisser-déposer reste un complément pour
l'ordre et les déplacements intercolonnes. Voir
[`ADR 020`](../../adr/020-accessible-cv-section-placement.md).
