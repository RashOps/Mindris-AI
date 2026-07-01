milestone: Post-Phase 13 foundation hardening (see docs/roadmap.md)

# Foundation Hardening and Product Roadmap

contract: Mindris should prioritize trust, correctness, and workflow integrity before adding broad new product surface.

contract: Proposed work is grouped into ordered runs, where each run improves one of:
- security and secret handling
- platform observability and runtime ergonomics
- recruiter workflow continuity
- product transparency and explainability
- contributor operability

contract: Proposed items are classified into:
- `P0 now`: should ship before major new features
- `P1 next`: strong leverage, low architecture risk
- `P2 later`: useful after foundations are stable
- `deferred`: interesting but should not compete with current platform hardening
- `reject/reframe`: the original idea should be replaced by a safer or more effective variant

invariant: Frontend remains a client, not a business-service host.

invariant: Any feature that handles keys, model selection, templates, scraped content, or generated documents must improve auditability and reduce hidden state.

invariant: Security work is not a single feature. It must span secrets, template safety, uploaded content, auth boundaries, logs, dependency posture, and release posture.

## Priorities

contract: Priority order for the submitted ideas is:

### P0 now

1. Full application security hardening
2. BYOK from the UI with safe backend storage and redaction
3. Configuration surface in the AppShell for provider/model/runtime settings
4. ATS severity hardening with explicit evaluation method and visible rubric
5. Purge or repurpose unused files and dead paths
6. Automatic Bun dev reload in development only
7. Contributor guidance via `AGENTS.md`
8. Automatic Ollama model detection and selection assistance

### P1 next

9. History of scraped jobs, cover letters, ATS reports, and model runs
10. Workflow automation from scrape -> CV -> cover letter -> tracker entry
11. Job tracker reminders and follow-up tasks
12. Enterprise analyzer
13. Auto release CI

### P2 later

14. Markdown-to-PDF DOCX conversion
15. Internal in-app Mindris guide
16. Dark/light theme switching

### Deferred

17. Commercial/pro license strategy
18. Random motivational quotes on landing page

## Better solutions

contract: Several submitted ideas should be reframed before implementation.

### ATS severity

decision: Do not simply "make ATS harsher."

decision: Replace it with a transparent scoring engine:
- explicit rubric by dimension
- severity levels with thresholds
- explainable deductions
- evidence snippets
- strict mode vs standard mode

reason: Harsher scoring without method transparency becomes noisy and arbitrary.

### Job / LLM / report history

decision: Do not build separate ad hoc histories for each artifact first.

decision: Build one backend-owned activity ledger:
- subject types: `job_scrape`, `resume_revision`, `cover_letter`, `ats_report`, `tracker_event`, `llm_run`
- actor/source metadata
- tool/provider/model metadata
- linked artifact ids
- timestamps
- reproducibility payload pointers

reason: One event model is simpler to query, audit, debug, and extend than multiple silo tables.

### Company analyzer

decision: Start with a bounded company profile enrichment module, not a freeform analyzer.

scope:
- company basics
- hiring context
- recent signals
- role-fit hints
- red flags / unknowns

reason: This keeps the feature actionable for applications and avoids an unbounded intelligence rabbit hole.

### App settings / provider switching

decision: Build one `Configuration` area in the AppShell backed by backend APIs.

scope:
- providers enabled
- default model per task
- local vs remote mode
- Ollama discovered models
- API key state present/absent
- feature toggles safe for users

reason: Model switching without a configuration system creates drift and hidden state.

### Dark / light mode

decision: Treat theme switching as a design-system maturity task, not a product priority.

reason: It is useful, but it does not strengthen the application core more than security, auditability, and workflow integrity.

### BYOK

decision: Do not expose raw secrets as editable source-file-like fields.

decision: Use backend-owned secret slots:
- masked in UI
- write-only from the browser
- encrypted or OS-keyring-backed at rest when possible
- never returned in plaintext
- redact in logs

reason: This is the minimum acceptable model for trust.

### Ollama model detection

decision: Do not make users type model ids manually by default.

decision: Detect local Ollama catalog through a backend probe and expose validated selectable models in settings.

reason: This reduces misconfiguration and makes the local-first story much stronger.

### Pro / commercial license

decision: Defer product implementation.

decision: First decide legal model:
- open core with commercial restriction is not OSI open source
- dual licensing is possible
- service terms for hosted use are different from source license

reason: This is a legal/product decision first, not an engineering run.

### Workflow automation

decision: Do not trigger automation only from "a checkbox after upload."

decision: Build explicit workflow states:
- scrape completed
- opportunity created
- CV version linked
- cover letter linked
- ATS report linked
- tracker entry created
- ready to apply

reason: A stateful workflow is auditable and resumable; a checkbox trigger alone is brittle.

### In-app guide

decision: Prefer a compact operator manual inside the app shell tied to current features and statuses.

reason: Static explanations age fast. The guide should point to actual workflows, not marketing copy.

### Auto release CI

decision: Start with guarded release automation:
- tag validation
- changelog presence
- build matrix
- release artifact draft

reason: Full unattended release is risky until the security and validation baseline is stronger.

## Runs

contract: Recommended next runs are:

### Run 14 — Security and secret boundary hardening

goal: Reduce the main trust risks before adding more product surface.

scope:
- BYOK UI + backend secret storage
- log redaction audit
- template import hardening review
- uploaded file validation audit
- dependency and config hardening
- release and CI secret hygiene
- `AGENTS.md`
- dead-file purge / repo hygiene

### Run 15 — Configuration and local runtime control

goal: Make the app operable without source edits.

scope:
- AppShell `Configuration`
- provider/model switching per task
- Ollama model discovery
- Bun dev reload in development
- runtime diagnostics panel

### Run 16 — ATS transparency and evaluation integrity

goal: Make ATS scoring credible and inspectable.

scope:
- strict vs standard ATS mode
- published rubric
- deduction reasons
- evidence-backed severity
- score history linkage to resume/job context

### Run 17 — Unified activity history and workflow ledger

goal: Make the application auditable and resumable across the full candidate workflow.

scope:
- backend event ledger
- history UI for scrapes, reports, resumes, cover letters, and model runs
- lineage links between artifacts

### Run 18 — Application workflow orchestration

goal: Turn the current tools into one coherent candidate pipeline.

scope:
- scrape -> opportunity creation
- resume linking
- cover letter linking and history
- tracker auto-entry from explicit workflow completion
- reminder and follow-up scheduling

### Run 19 — Recruiter intelligence layer

goal: Add bounded opportunity intelligence after workflow and history are stable.

scope:
- company profile enrichment
- role-fit summary
- recruiter context and risk flags

### Run 20 — Product polish and optional UX features

goal: Add lower-leverage UX enhancements after core stability work.

scope:
- dark/light mode
- in-app guide
- markdown workspace DOCX export

## Additional foundation proposals

contract: Additional foundation work worth adding:

- permissions and threat model document for secrets, uploads, templates, and generated exports
- structured audit log for security-sensitive actions
- backup/export path for user-owned local configuration and secrets metadata
- schema/version migration policy for resumes, templates, and event history
- periodic fixture refresh for E2E realism
- compatibility matrix for providers and local modes
- storage compaction / retention strategy for histories and generated artifacts
- fail-closed behavior for unsafe template packages or unsupported renderer inputs

## Deferred

deferred: RSS-based motivation quotes do not strengthen core product value now.

deferred: Commercial licensing implementation should wait for a legal/product decision package.

## Test

test: Each run should end with:
- backend validation for new contracts
- frontend lint/typecheck
- renderer validation if rendering paths changed
- updated browser E2E for any workflow-level change
- explicit security checks for secret-handling changes

## Working notes

- Theme switching is not useless, but it is a classic trap: visible, easy to discuss, low leverage for trust and workflow completion.
- "Company analyzer" is likely valuable only if it feeds a concrete action: CV tailoring, ATS hints, or application prioritization.
- The right history primitive is probably event-sourced enough to track lineage, but not so abstract that it becomes an internal framework.
