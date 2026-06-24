# Run: DOCX, service hardening, Docker validation, E2E

date: 2026-06-24
milestone: Phase 6 continuation (see `docs/roadmap.md`)

## Scope

ship:
- Export DOCX for resumes.
- Production hardening for local/self-hosted microservices.
- End-to-end Docker validation.
- Browser E2E automation for critical user paths.

deferred:
- Auth, Stripe, billing, account management.
- Telemetry product analytics.
- New AI product modes beyond stabilizing existing flows.
- SaaS go-to-market work.

## DOCX Export

contract:
- Backend exposes a resume DOCX export endpoint next to existing JSON/Markdown/HTML exports.
- Frontend CV Builder exposes a DOCX download action that calls the API.
- Export is generated server-side; frontend never builds DOCX locally.

format:
- Recruiter-friendly `.docx`.
- Text-based document, no watermark.
- Uses existing CV data model.
- Initial layout prioritizes clean ATS/recruiter readability over pixel-perfect template parity.

failure:
- Invalid resume id returns normalized 404.
- Export generation errors return normalized JSON error response.
- Empty optional fields are omitted, not rendered as placeholder text.

test:
- API smoke verifies `export-docx` returns a DOCX content type and non-empty file.
- Unit/regression coverage verifies malformed resume data does not crash export.

## Microservice Hardening

contract:
- API Gateway, renderer, and supporting services expose useful health/readiness behavior.
- Errors returned by APIs are normalized enough for frontend display and troubleshooting.
- Service-to-service calls use explicit timeouts and clear failure messages.
- Required env vars and service URLs are validated at startup or before first use.

storage:
- Local storage remains the default for MVP continuation.
- Storage paths are configurable by env.
- Missing directories are created safely.
- Path traversal and unsafe filenames are rejected where files are generated or served.

logging:
- Logs are structured enough to identify service, route, status, and failure cause.
- Sensitive values and API keys are not logged.

test:
- Backend smoke covers health/readiness and representative normalized errors.
- Renderer smoke covers health and a failed render request.
- Lint/typecheck/build remain green.

## Docker Validation

contract:
- `docker compose up --build` should start the full stack in a normal Docker network environment.
- Compose healthchecks must reflect real service readiness, not just process start.
- Documentation must list required env values and expected ports.

failure:
- If Docker cannot be fully validated in the agent environment, document the exact blocker and provide a reproducible command for local verification.

test:
- `docker compose config --quiet`
- `docker compose up --build` in a Docker-enabled environment.
- Smoke script verifies API, renderer, and web endpoints.

## Browser E2E

contract:
- E2E tests run against local services.
- Tests exercise backend-owned flows through the frontend.
- Tests do not require paid LLM keys by default; LLM-dependent flows use deterministic mocks, fixtures, or are marked separately.

critical paths:
- Create or load a CV in CV Builder.
- Change resume template.
- Export PDF.
- Export DOCX.
- Run ATS page with a fixture or mocked response.
- Add and move a job tracker application.

test:
- One command runs the stable E2E suite.
- CI/local docs explain required services and env.

## Acceptance

release acceptance:
- DOCX export works from API and frontend.
- Existing JSON/Markdown/HTML/PDF exports still work.
- Services expose health/readiness checks.
- Docker compose config is valid and full Docker run is either verified or blocked with a documented external reason.
- E2E suite covers the critical paths above.
- `CHANGELOG.md` has an `Unreleased` entry for the run.

## Working notes

- The user clarified that "SaaS Ready" does not mean auth/billing yet. Current goal is more content and stability, with AI product depth planned later.
- DOCX should likely live in API Gateway exporters first, because exports are backend-owned.
- The renderer may not need DOCX responsibilities unless template parity becomes a requirement later.
