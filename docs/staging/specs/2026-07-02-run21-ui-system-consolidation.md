# Run 21 - UI system consolidation

milestone: Phase 21 (see docs/roadmap.md)

contract: Mindris must expose a coherent in-app operating surface where navigation, documentation, theme behavior, destructive history actions, tracker density, and CV builder controls feel like one product instead of adjacent tools.

invariant: The frontend remains a client-only shell. Documentation pages, theme state, and compact/expanded UI affordances may live in the browser, but durable workflow state, destructive history actions, and artifact deletion stay backend-owned and API-mediated.

decision: Replace the current contextual guide drawer with a dedicated Guide page inside the AppShell. The page becomes the canonical internal product manual and operational guide.

decision: Normalize high-traffic product surfaces around shared semantic tokens and component states instead of screen-local hex colors. This run targets AppShell, Guide, ATS, CV Builder, Tracker, History, Style Panel, and Job Insights first.

decision: History clearing is a backend-owned destructive workflow. The frontend may trigger it only through an explicit confirmation dialog that makes irreversible deletion clear.

contract: The history API must support a bounded global purge endpoint that deletes persisted history-bearing artifacts across jobs, ATS reports, cover letters, resume revisions, tracker applications, reminders, and opportunities in one transaction.

failure: If history purge fails, no partial deletion should be reported as success. The API must return a non-2xx response and preserve transactional consistency.

decision: Job Tracker defaults to a compact card density where primary signals stay visible and follow-up editing is progressively disclosed.

decision: The CV Builder header becomes a stable multi-zone toolbar. Secondary actions move into menus or grouped surfaces so the layout remains aligned when the shell width changes.

decision: The desktop AppShell must stop shifting the whole content area on sidebar hover. The collapsed rail may expand via overlay/flyout behavior, but page layout should remain spatially stable.

test: Frontend validation must keep `bun run lint` and `bun run typecheck` green after navigation, theming, and layout changes.

test: Backend validation must cover the history purge contract and keep `uv run pytest` green for the new destructive endpoint.

test: UI regression coverage must assert the Guide navigation entry, stable shell configuration, and at least one compact-tracker or builder-header behavior through focused frontend tests.

deferred: This run does not attempt a full visual redesign of every landing/marketing screen.

deferred: This run does not introduce role-based access control or remote multi-user security semantics; it remains local/open-source runtime hardening.

## Working notes

- Current guide surface is a drawer in `apps/web/src/components/help/GuideDrawer.tsx`; it is insufficient for long-form operational documentation.
- Current sidebar changes root content padding based on hover state in `apps/web/src/components/layout/AppShell.tsx`.
- Current history route set in `services/api-gateway/routers/history.py` exposes reads and job deletion, but no global purge primitive.
- Current tracker cards render reminders inline for every item, which hurts scan efficiency.
- Current CV Builder header in `apps/web/src/app/tools/cv-creator/page.tsx` mixes CV management, locale management, provider controls, optimization input, and exports in one wrapping row.
