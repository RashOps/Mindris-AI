milestone: Phase 23 (see docs/roadmap.md)

# Run 23 Security and Operational Hardening

contract: Run 23 hardens Mindris for exposed or semi-exposed environments without changing the frontend-only invariant.

contract: The run is limited to security, resilience, and operator trust boundaries across API Gateway, renderer, shared runtime utilities, and the client bootstrap path.

invariant: The frontend remains a client that only calls backend APIs. No business logic, secret storage, or fallback service behavior moves into the browser.

invariant: Secrets must never be returned in plaintext by product APIs, rendered into frontend state snapshots, or persisted in client storage.

invariant: All externally supplied content must be treated as untrusted input, including template packages, uploaded files, markdown, HTML/CSS customizations, and scraped URLs.

decision: Use a bounded hardening run rather than a broad "security sweep."

reason: The highest leverage work is in a few trust boundaries that already exist in the product surface: secrets, uploads, template rendering, network policies, and runtime observability.

## Approaches

decision: Three implementation approaches were considered.

### A. Infrastructure-first

contract: Prioritize Docker, reverse proxy headers, deployment examples, and production env posture before product-surface validation.

tradeoff: Good for hosting readiness, weak for current product integrity because it leaves input and secret boundaries under-tested.

### B. App-first

contract: Prioritize browser UX warnings, startup gating, and safer flows while leaving most backend/runtime enforcement unchanged.

tradeoff: Improves operator confidence but does not materially raise the security floor.

### C. Boundary-first hybrid

contract: Prioritize the concrete trust boundaries already exercised by users, then add minimal operational controls and production checklists.

tradeoff: Slightly broader than a single subsystem refactor, but it gives the best risk reduction per run.

decision: Choose approach C.

## Scope

contract: Run 23 covers four implementation blocks.

### 1. Input and rendering hardening

contract: Strengthen validation and sanitization for:
- CV uploads
- community template packages and previews
- advanced CSS input
- markdown/HTML export surfaces
- scraped and user-supplied URLs

invariant: Unsafe or malformed content must fail closed with normalized API errors.

### 2. Runtime and API hardening

contract: Tighten runtime behavior for:
- strict environment/config validation
- bounded timeouts and retries
- stricter CORS and security headers where applicable
- request correlation ids
- normalized error envelopes

invariant: Runtime defaults must favor explicit failure over silent fallback.

### 3. Secret and local-state hardening

contract: Re-audit BYOK and provider settings for:
- masked UI state only
- no plaintext logging
- no leakage through API reads
- no unsafe browser persistence

invariant: Secret presence may be observable; secret values may not.

### 4. Operational resilience

contract: Add minimal operator-grade observability and recovery guidance:
- structured log coverage across services
- health/readiness signal review
- backup/restore notes for local storage
- stability-focused regression checks for critical flows

## Failure modes

contract: The run explicitly handles these failures:
- malformed template package import
- hostile CSS or HTML payloads
- invalid remote URLs for scraping or analysis
- missing or inconsistent runtime env configuration
- timeout/retry amplification across service boundaries
- secret value accidentally surfacing in logs, config reads, or client snapshots

decision: Failure responses must be normalized and user-facing wording must avoid leaking internals.

## Test

test: Python API tests cover reject/normalize behavior for unsafe uploads, URLs, and config states.

test: Frontend validation covers startup gating and secret-setting flows without storing secret values locally.

test: Renderer/build validation confirms hardened paths do not break HTML/PDF generation.

test: End-to-end smoke covers critical user flows after hardening: CV builder, exports, ATS, tracker, workflow continuity.

## Out of scope

deferred: Full multi-user authentication and authorization.

deferred: Heavy observability stack such as Prometheus/Grafana/Sentry self-hosting.

deferred: Commercial licensing, billing, and hosted tenancy controls.

deferred: Reverse-proxy deployment automation beyond minimal documented expectations.

## Working notes

- `docs/tech-spec.md` is absent in the repo. Existing architecture context is currently sourced from `docs/architecture.md`.
- Previous hardening exists in Run 14, but it focused on BYOK, trust boundaries, and repo hygiene. Run 23 is a second-pass operational hardening run, not a duplicate.
- Current local deployment still uses an API key header from frontend runtime config for authenticated API calls. Run 23 removes query-string leakage and client persistence of runtime settings, but a full session/cookie bootstrap model is still deferred.
