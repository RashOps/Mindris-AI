# Contributing to Mindris

Thanks for contributing.

## Scope

Mindris is an open source project for candidate workflow tooling. Contributions should preserve the existing product constraints:

- the frontend is client-only
- product state and secrets are backend-owned
- browser code communicates through API calls only

See [AGENTS.md](AGENTS.md) for the contributor operating rules used in this repository.

## Before opening a change

- keep edits scoped
- prefer existing contracts and patterns
- avoid unrelated refactors
- add or update tests when product behavior changes

## Local validation

Backend:

```bash
uv run pytest
uv run ruff check .
```

Frontend:

```bash
cd apps/web
bun run lint
bun run typecheck
```

Renderer:

```bash
cd services/renderer
bun run typecheck
bun run build
```

## Brand and trademark note

By contributing code, documentation, or assets, you agree that the contribution may be distributed under the repository license for the relevant content.

The source code remains under the MIT License, but the `Mindris` name, logos, and brand assets are governed separately by [TRADEMARKS.md](TRADEMARKS.md).

If you contribute brand-related material, assume it is intended for official project use unless the maintainers state otherwise.

Public forks and derivative services should not use the official Mindris identity in a way that creates confusion about authorship, endorsement, or official status.

## Pull request hygiene

- explain the user-facing or operational impact
- note tests run
- mention follow-up work if the change is intentionally partial
