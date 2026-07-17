# Agent Sandbox And Local Autonomy

milestone: Phase 24 (pending roadmap update)

contract: Add a repository-owned local agent runtime guide that defines writable paths, protected paths, escalation boundaries, reusable command prefixes, and a stable script surface for local iteration.
contract: Add repo-first validation entrypoints so an agent can run setup, lint, typecheck, tests, smoke checks, and browser E2E through a small set of versioned scripts instead of ad hoc shell commands.
contract: Keep the frontend client-only; no new browser-side service behavior, persistence of secrets, or local backend logic is introduced.

invariant: Source-of-truth behavior remains backend-owned; this run only improves local operator workflows, validation ergonomics, and permission guidance.
invariant: Existing protected paths remain protected in documentation: `.env`, `storage/`, `.logs/*`, lockfiles unless explicitly required.
invariant: New scripts must be compositional wrappers around existing project commands and must not mutate runtime state outside the repository and `/tmp`.

data: `docs/agent-runtime.md` becomes the canonical contributor-facing guide for sandbox setup and persistent escalation rules.
data: `scripts/lint_all.sh` provides one repo entrypoint for lint and typecheck.
data: `scripts/test_all.sh` provides one repo entrypoint for targeted backend tests, frontend tests, renderer tests, and optional browser E2E when the local stack is already running.
data: `scripts/check_all.sh` provides a one-command wrapper that chains repo-first validation and optionally local smoke checks when the stack is already running.
data: The runtime guide documents explicit validation profiles and a copyable persistent approval list for the host sandbox.

failure: Missing local dependencies must fail fast with explicit shell errors from the underlying tooling.
failure: Browser E2E remains opt-in and must not be run implicitly by aggregate scripts that do not start the stack.
failure: No script may print secret values from `.env`.

test: New scripts have shell syntax validation with `bash -n`.
test: Aggregate scripts execute successfully for non-network local checks already supported by the repository.
test: Documentation references only scripts and constraints that actually exist in the repo after implementation.

deferred: CI changes for agent-specific flows.
deferred: Host-level sandbox provisioning outside repository documentation.
deferred: Persistent approval state, which is controlled by the runtime host rather than the repository.

## Working notes

- `docs/tech-spec.md` does not exist in this repository; `docs/architecture.md` is the closest living architecture document.
- Existing local scripts cover setup, reset, dev, smoke, self-host smoke, and browser E2E.
- The missing piece is a thin, predictable command surface for validation plus a dedicated operator guide for sandbox/autonomy expectations.
