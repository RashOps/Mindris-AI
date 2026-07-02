# Mindris AI - Contributor Guide for Coding Agents

## Project shape

- `apps/web`: Next.js frontend client
- `services/api-gateway`: FastAPI backend entrypoint and product API
- `services/renderer`: Bun/Elysia HTML/PDF renderer
- `services/intelligence`: LLM, ATS, parsing, and workflow logic
- `services/scraper`: scraping providers and fallback strategy
- `packages/database`: shared SQLite and vector persistence
- `packages/utils`: shared settings, logging, and runtime utilities

## Core invariants

- The frontend is client-only.
- The frontend must not become a backend or hidden service layer.
- Product state and secrets are backend-owned.
- Browser code reads and writes through API calls only.
- API routes must not leak raw secret values in responses or logs.
- `.logs/` is the canonical local log directory.

## Implementation rules

- Prefer existing backend contracts over frontend-local state.
- Keep source-of-truth decisions in Python services, not in the browser.
- When changing product behavior, add or update tests first.
- Keep edits scoped; do not refactor unrelated modules during feature work.
- Use `apply_patch` for manual source edits.
- Do not commit generated artifacts, runtime logs, caches, or local databases.

## Local development

- Python workspace: `uv`
- Frontend and renderer: `bun`
- Local full stack: `./scripts/dev_local.sh`
- Renderer dev mode must use watch reload in development only.

## Files to avoid editing casually

- `.env`
- `.logs/*`
- `storage/*`
- `logs/*`
- `.venv/*`
- lockfiles, unless the task explicitly requires dependency changes

## Validation

- Backend Python: `uv run pytest ...` and `uv run ruff check ...`
- Frontend: `cd apps/web && bun run lint && bun run typecheck`
- Renderer: `cd services/renderer && bun run typecheck && bun run build`
