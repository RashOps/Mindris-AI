milestone: Phase 17 (see docs/roadmap.md)

# Run 17 - Unified activity history

contract: Mindris must expose one backend-owned history surface that makes the candidate workflow auditable across scraped jobs, ATS reports, cover letters, resume revisions, tracker items, and model-backed operations.

invariant: The frontend remains a client-only surface. History aggregation, lineage computation, and artifact metadata stay backend-owned.

decision: Preserve existing history endpoints as implementation inputs, then add one unified ledger contract instead of multiplying page-specific history APIs.

contract: The unified activity ledger must support these subject types:
- `job_scrape`
- `resume_revision`
- `cover_letter`
- `ats_report`
- `tracker_event`
- `llm_run`

contract: Each ledger item must expose:
- stable `id`
- `subject_type`
- `subject_id`
- `title`
- `summary`
- `timestamp`
- `provider` and `model_name` when relevant
- `status` when relevant
- `links` to related artifacts
- a small `metadata` object for audit details that do not belong in the title/summary

decision: Run 17 will build lineage links from existing persisted records before introducing a general event-sourcing model.

contract: Lineage links for this run must support:
- job -> ATS reports
- job -> cover letters
- job -> tracker entries
- ATS report -> tracker entries
- cover letter -> tracker entries
- resume revision -> resume document

decision: `llm_run` is represented in this run as best-effort derived metadata from persisted ATS reports and cover letters, not as a new standalone execution log table.

reason: This closes the operator audit gap with the data we already persist, without overbuilding a new event infrastructure before workflow orchestration.

contract: The backend must expose one aggregate history endpoint with optional filters for:
- subject type
- related job id
- related resume id
- limit
- offset

contract: The UI must expose one audit-oriented page inside the AppShell that lets operators:
- browse recent activity chronologically
- filter by artifact type
- inspect lineage for a selected item
- jump to linked artifacts when they exist

decision: The first history UI will be utilitarian, not illustrative.

failure: Missing links must degrade to empty arrays, never to server errors.

failure: If older records predate added metadata, the ledger still emits valid items with partial metadata and no broken links.

test: Backend tests must validate:
- aggregate ledger response shape
- lineage links between persisted artifacts
- filtering by subject type and job id
- compatibility with pre-existing ATS and cover letter records

test: Frontend tests must validate:
- filter state and type normalization for the history page/store helpers
- rendering logic for mixed artifact types
- no frontend-local hidden source of truth for lineage

deferred: Automatic workflow state transitions remain part of Phase 18.

deferred: A dedicated standalone execution log table for every LLM call is not part of this run.

## Working notes

- Existing backend pieces already available:
  - `services/api-gateway/routers/history.py`
  - ATS report persistence and serialization
  - cover letter persistence and serialization
  - resume revision history in `persistence.py`
  - tracker full view with linked ATS / cover letter / job
- Existing gap:
  - no unified chronological ledger
  - no reusable lineage model
  - no dedicated AppShell audit page for operators
