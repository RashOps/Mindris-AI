# Plan: Run 20 product polish and secondary UX

spec: `docs/staging/specs/2026-07-02-run20-product-polish-and-secondary-ux.md`

- [x] T1: Internal guide in AppShell
  goal: Add an integrated product guide inside the AppShell so users can understand the main Mindris flows without leaving the workspace.
  files: `apps/web/src/components/help/GuideDrawer.tsx`, `apps/web/src/components/layout/AppShell.tsx`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run20-product-polish-and-secondary-ux.md`

- [x] T2: Theme system visibility and shell integration
  goal: Expose dark/light switching in the shell and align key shell surfaces with theme tokens.
  files: `apps/web/src/components/ThemeToggle.tsx`, `apps/web/src/components/layout/AppShell.tsx`, `apps/web/src/app/tools/markdown/page.tsx`
  acceptance: `cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run20-product-polish-and-secondary-ux.md`

- [x] T3: Markdown DOCX export
  goal: Add backend-owned DOCX export for the Markdown workspace and surface it in the tool UI.
  files: `services/api-gateway/exporters.py`, `services/api-gateway/routers/markdown.py`, `services/api-gateway/main.py`, `services/api-gateway/schemas.py`, `apps/web/src/app/tools/markdown/page.tsx`, `tests/test_markdown_api.py`
  acceptance: `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest tests/test_markdown_api.py -q && cd apps/web && bun run lint && bun run typecheck`
  spec: `docs/staging/specs/2026-07-02-run20-product-polish-and-secondary-ux.md`
