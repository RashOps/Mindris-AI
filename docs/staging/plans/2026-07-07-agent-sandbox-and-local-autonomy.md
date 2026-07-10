# Plan — Agent Sandbox And Local Autonomy

spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`

- [x] T1: Add agent runtime documentation
goal: Add a canonical repository guide for sandbox layout, protected paths, recommended persistent approval prefixes, and local autonomy levels.
files: `docs/agent-runtime.md`, `README.md`, `docs/local-development.md`
acceptance: `rg -n "agent runtime|sandbox|prefix_rule|autonomy" docs README.md`
spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`

- [x] T2: Add repo-level validation entrypoints
goal: Add stable script wrappers for lint/typecheck and tests so local agents can iterate through repo-owned commands.
files: `scripts/lint_all.sh`, `scripts/test_all.sh`
acceptance: `bash -n scripts/lint_all.sh scripts/test_all.sh`
spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`

- [x] T3: Wire documentation to real commands
goal: Update contributor-facing docs so the recommended autonomy workflow points to the new scripts and clearly separates local checks from stack-dependent checks.
files: `docs/local-development.md`, `CONTRIBUTING.md`, `README.md`
acceptance: `rg -n "lint_all|test_all|agent-runtime" README.md CONTRIBUTING.md docs/local-development.md docs/agent-runtime.md`
spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`

- [x] T4: Add one-command validation wrapper
goal: Add a wrapper that chains lint and tests, and optionally smoke checks when the local stack is already running.
files: `scripts/check_all.sh`
acceptance: `bash -n scripts/check_all.sh`
spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`

- [x] T5: Document validation profiles and approval rules
goal: Publish copyable validation profiles and a ready-to-approve persistent permission list for local agent autonomy.
files: `docs/agent-runtime.md`, `docs/local-development.md`, `README.md`
acceptance: `rg -n "check_all|validation profile|prefixes|persistent approval" docs/agent-runtime.md docs/local-development.md README.md`
spec: `docs/staging/specs/2026-07-07-agent-sandbox-and-local-autonomy.md`
