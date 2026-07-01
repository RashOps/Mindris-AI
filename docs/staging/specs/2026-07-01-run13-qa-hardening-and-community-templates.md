milestone: Phase 13 (see docs/roadmap.md)

# Run 13: QA Hardening and Community Templates

## Approaches considered

approach: Start with marketplace-linked install by code or remote id.

tradeoff:
- attractive UX on paper
- too much early coupling between app and marketplace
- weaker self-hosting story
- harder offline workflow
- larger failure surface for first release

approach: Start with raw CSS/template text copy-paste.

tradeoff:
- low initial implementation cost
- poor workflow quality
- weak validation story
- unsafe by default
- hard to support and version

approach: Start with portable package import/export, and let the marketplace distribute the same package artifact.

tradeoff:
- slightly more upfront structure
- best workflow consistency
- compatible with open-source, local-first, and self-hosted operation
- easiest path to add hosted install later

decision: Run 13 starts with portable template packages plus QA hardening. Marketplace-linked remote install is deferred.

## Contract

contract: Run 13 combines two tracks under one milestone:
- QA hardening for CI and browser flows
- community templates V1

contract: Community templates V1 are distributed as portable package files. The same package artifact is:
- exported from Mindris
- imported into Mindris
- downloadable from the marketplace

contract: The frontend remains client-only:
- uploads template packages
- requests install/export through API routes
- displays previews, metadata, and validation errors

contract: Template install, validation, compatibility checks, and persistence are backend-owned.

contract: Renderer remains the style execution boundary. Community template CSS is validated and sanitized before application.

contract: V1 does not require live marketplace integration from inside Mindris. File-based install is the only required installation path.

## Data

data: A community template package contains at minimum:
- `manifest.json`
- `template.json`
- `styles.css`
- `preview.png`

data: `manifest.json` includes:
- `id`
- `name`
- `version`
- `author`
- `license`
- `description`
- `category`
- `tags`
- `engine_version` (`"1"` for V1)

data: `template.json` includes backend-owned template defaults and rendering metadata:
- preset settings
- supported sections
- palette
- typography defaults
- layout defaults

data: Installed community templates are persisted as data records, not executable extensions.
data: V1 stores the original package bytes server-side so export is a round trip of the same portable artifact.

data: V1 package validation currently requires a PNG preview file named `preview.png`.

## Invariants

invariant: Imported template packages never execute arbitrary code.

invariant: Frontend does not parse or sanitize CSS as a service layer.

invariant: Package validation errors are explicit and block installation.

invariant: Template identity must avoid collisions through namespaced ids.

invariant: Marketplace distribution and local export use the same package contract.

invariant: QA hardening adds robustness without weakening the client-only frontend rule.

## Failure

failure: Missing required package files return normalized validation errors.

failure: Unsupported `engine_version` returns a compatibility error and aborts install.

failure: Invalid or unsafe CSS is rejected or stripped renderer-side with explicit warnings.

failure: Duplicate template ids are rejected unless explicit replacement behavior is defined later.

failure: Browser E2E tests must use stable selectors and fail on ambiguous affordances.

## API shape

contract: Template APIs must support V1 operations:
- export installed template package
- import template package
- list community and local template metadata
- expose preview-ready metadata to the frontend

contract: CI/QA hardening must cover:
- browser E2E path for critical flows
- multilingual flow assertions
- selector stability checks where UI collisions previously occurred

## Test

test: Backend tests validate package manifest parsing, install rejection on malformed packages, template metadata persistence, and export/import round trips.

test: Renderer tests validate community template CSS sanitation with package-provided styles.

test: Frontend tests validate stable affordances for locale switching and template installation flows.

test: CI or a manual pipeline job executes the browser E2E path against the local stack, including multilingual assertions.

## Deferred

deferred: Install from URL.

deferred: Install by marketplace id or code.

deferred: Marketplace authentication and author accounts.

deferred: Signature verification and trust levels.

deferred: Automatic update checks for installed community templates.

## Working notes

Reference product note:
- `docs/community-templates-marketplace.md`

Run 13 should stay strict on scope:
- V1 package import/export only
- QA hardening only where it protects real critical flows
- no registry protocol unless it is needed by the package contract itself
