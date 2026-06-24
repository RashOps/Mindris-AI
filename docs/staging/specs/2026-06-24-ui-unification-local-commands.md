# UI unification and non-Docker local commands

milestone: Phase 7 - UI unification and local developer experience (see `docs/roadmap.md`)

## Audit

finding: App UI is visually split across three systems.
- `/dashboard` uses a light SaaS layout with its own local sidebar.
- `/tools/*` uses a dark tool shell with a separate sidebar/topbar implementation.
- `/` uses a dark marketing landing page with heavy inline styles and decorative blobs.

finding: UI implementation is inconsistent.
- Many pages and components use inline `style={{ ... }}` for colors, borders, backgrounds and hover states.
- Navigation uses emoji icons in `apps/web/src/config/layout.ts`; this conflicts with a professional SaaS tool surface.
- Radius usage is inconsistent, with many `rounded-xl` and `rounded-2xl` panels.
- Some screens duplicate product chrome inside pages even when they are already inside `tools/layout.tsx`.
- Toast/status language uses emoji prefixes and differs by page.

finding: Design tokens exist but are not yet the source of truth.
- `apps/web/src/app/globals.css` has theme variables and tool-specific utilities.
- `apps/web/src/components/ui/*` exists, but major surfaces bypass these components.

finding: Non-Docker onboarding is fragmented.
- Backend, frontend and renderer install commands are documented separately.
- There is no root command that resets dependencies, installs all required packages and launches the three local services.
- Existing `scripts/smoke_self_hosting.sh` validates Docker/self-hosted services only after they are running.

## Decisions

contract: The frontend remains a pure API client.
- The UI refactor must not move product/business source-of-truth logic into browser storage.
- CV, templates, drafts, tracker, exports and analysis remain backend/renderer API concerns.
- Frontend local state is limited to UI state, form state, view state and existing theme preference.

contract: Use one SaaS app shell for product pages.
- `/dashboard` and `/tools/*` share a single `AppShell`.
- Shell contains primary navigation, service status, current context and global actions.
- The shell supports desktop sidebar and mobile top/drawer navigation.
- Tool pages no longer render their own Mindris logo/header unless it is page-specific context.

contract: Use one visual language.
- Default product UI is light, dense and operational.
- Dark surfaces are reserved for terminal/log/preview/code panels only.
- Cards use radius `8px` or the existing `rounded-lg` token.
- Buttons, tabs, form fields, status pills and panels use shared components/tokens.
- Navigation uses `lucide-react` icons instead of emojis.
- Text hierarchy is restrained: compact headings inside dashboards/tools, no marketing-sized type in app pages.

contract: Add reusable UI primitives before rewriting screens.
- Add layout primitives: `AppShell`, `PageHeader`, `PageToolbar`, `SectionPanel`, `MetricTile`, `EmptyState`, `StatusBanner`.
- Add interaction primitives: `IconButton`, `SegmentedControl`, `ToolbarButton`, `Toast` or shared status surface.
- Prefer component classes and tokens over inline style objects.

contract: Preserve existing routes and API calls.
- `/dashboard`, `/tools/cv-creator`, `/tools/ats-score`, `/tools/tracker`, `/tools/markdown` keep their routes.
- Existing API contracts remain unchanged.
- The refactor may reorganize components but must not change backend behavior.

contract: Add non-Docker local commands.
- Provide root scripts for:
  - dependency reset/reinstall without deleting lockfiles;
  - first-time setup;
  - launching API, renderer and frontend together;
  - local smoke check.
- Scripts must use `uv` for Python and `bun` for JS.
- Scripts must avoid printing secrets.
- Scripts must fail clearly when `uv`, `bun`, or required ports are unavailable.

deferred: Full landing page redesign can be limited to aligning navigation/CTA with the app shell.

deferred: Auth, billing, multi-tenant SaaS navigation and account settings remain out of scope.

deferred: DOCX export remains out of scope.

## Acceptance

test: `cd apps/web && bun run lint`

test: `cd apps/web && bun run typecheck`

test: `cd apps/web && bun run build`

test: `cd services/renderer && bun run typecheck`

test: `cd services/renderer && bun run build`

test: `UV_CACHE_DIR=/tmp/uv-cache STORAGE_DIR=/tmp/mindris-ui-local-smoke uv run --no-sync python tests/smoke_mvp1_backend.py`

test: `sh -n scripts/*.sh`

manual: Run the non-Docker launcher and verify:
- API responds on `http://localhost:8000/`.
- Renderer responds on `http://localhost:4000/`.
- Frontend responds on `http://localhost:3000/`.
- Dashboard and each tool page share the same app shell.
- CV export buttons still call backend endpoints.

manual: Inspect desktop and mobile widths:
- no overlapping text;
- navigation remains usable;
- cards/panels stay visually consistent;
- dark panels are limited to preview/code/log contexts.
