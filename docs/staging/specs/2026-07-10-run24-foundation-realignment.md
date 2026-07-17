milestone: Phase 24 (see docs/roadmap.md)

# Run 24+ - Foundation realignment after the global product audit

contract: Mindris must consolidate its product foundations before adding new feature surface. The next work is split into bounded runs that tighten UI coherence, trust boundaries, maintainability, and product consistency without breaking the frontend-only invariant.

invariant: The frontend remains a client shell. Theme state, local view preferences, and ephemeral UI affordances may live in the browser, but durable product state, secrets, auth boundaries, workflow truth, and destructive actions remain backend-owned.

invariant: Any new online-readiness or hosted-readiness work must reduce browser-visible trust leakage. No run may reintroduce frontend-owned secret transport, query-string credentials, or hidden business logic in the client.

decision: Execute the audit follow-up as four runs, not one broad refactor.

reason: The issues are related, but they do not share the same risk profile. Theme normalization, frontend decomposition, online boundary hardening, and product-content coherence should be sequenced so each run leaves the repo greener and easier to validate.

## Approaches

decision: Three sequencing approaches were considered.

### A. Theme-first only

contract: Fix dark/light mode, colors, and layout polish first, then revisit architecture later.

tradeoff: Fast visible improvement, but it leaves weak API trust boundaries and oversized frontend modules in place.

### B. Boundary-first only

contract: Focus first on auth/API-key cleanup and hosted-readiness, then revisit UX consistency later.

tradeoff: Stronger trust posture, but the application remains visually inconsistent and harder to maintain.

### C. Hybrid foundation-first

contract: First complete the design-system/theme contract, then decompose unstable frontend surfaces, then harden the online/API boundary, then finish with product coherence and regression coverage.

tradeoff: Slightly longer sequence, but it removes the main current sources of product drift in the right order.

decision: Choose approach C.

## Run breakdown

### Phase 24 - Theme system completion and UI contract normalization

contract: Finish the theme system instead of relying on partial dark-mode overrides and screen-local fixes.

scope:
- canonical light/dark token contract
- deterministic theme bootstrap and persistence rules
- shared surface, border, hover, input, and panel states
- normalization of the highest-traffic product routes first
- focused regression coverage for theme switching and hover/readability issues

invariant: No tool page should require bespoke theme hacks to remain readable.

failure: If a route cannot fully adopt semantic tokens yet, it must be isolated behind explicit component-level wrappers rather than new inline color literals.

### Phase 25 - Frontend surface decomposition and operator IA settings refactor

contract: Reduce UI drift by breaking oversized product surfaces into stable modules and by separating configuration concerns.

scope:
- split large frontend files around CV Builder, workflow, tracker, and store logic
- separate operator configuration, local service diagnostics, and secret/provider settings into clearer surfaces
- simplify the CV Builder header and toolbar zones without changing backend contracts
- normalize shared product sections so tools stop feeling like adjacent mini-apps

invariant: Refactors must preserve the frontend-only boundary and prefer existing backend APIs over new client-local orchestration.

### Phase 26 - Online boundary and API trust contract hardening

contract: Prepare Mindris for a future hosted form by removing current browser-visible trust leaks and tightening API entry semantics.

scope:
- remove public-env API-key assumptions from the client transport model
- stop accepting query-string credential aliases
- define a stricter local-dev vs future-hosted auth boundary
- normalize API error/auth behavior around the current local-first product

invariant: Local self-hosting ergonomics may remain simple, but the contract must no longer teach unsafe hosted patterns.

deferred: Full multi-user auth, billing, tenancy, and RBAC remain out of scope.

### Phase 27 - Product coherence, QA, and content governance

contract: Close the loop with regression coverage and product-content normalization once the structural runs are done.

scope:
- targeted regression coverage for theme, builder layout, settings, and startup/runtime gates
- normalize in-app copy, product guidance, and branding usage
- align guide content and operational documentation with actual runtime behavior
- remove remaining UI drift observations left after the previous runs

invariant: Product documentation inside the app and in repo docs must describe the real runtime, not aspirational behavior.

## Test

test: Each run must leave `cd apps/web && bun run lint && bun run typecheck` green.

test: Phase 24 and Phase 25 must add focused frontend regression coverage for the changed surfaces.

test: Phase 26 must add backend tests for auth/API boundary behavior and keep `UV_CACHE_DIR=/tmp/uv-cache uv run --no-sync pytest ...` green for touched modules.

test: Phase 27 must re-run the critical local product validation path after the coherence pass.

## Out of scope

deferred: Net-new feature expansion unrelated to the audit findings.

deferred: A full visual rebrand or logo replacement inside the app.

deferred: Hosted SaaS rollout mechanics.

## Working notes

- `docs/tech-spec.md` is still absent. Existing project context continues to rely on `docs/architecture.md`.
- The strongest unresolved product risks from the audit are split between incomplete theme coverage and an API trust model that is still too local/dev-shaped for future online exposure.
- The oversized frontend modules are now a maintainability issue, not just a style issue. They are driving regressions and making theme fixes expensive.
