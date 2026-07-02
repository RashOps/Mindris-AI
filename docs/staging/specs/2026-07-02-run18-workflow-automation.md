milestone: Phase 18 (see docs/roadmap.md)

# Run 18 - Workflow automation

contract: Mindris must expose one backend-owned application workflow that turns disconnected tools into an explicit candidate pipeline.

invariant: The frontend remains a client-only surface. Workflow state, transitions, artifact linkage, and automation rules remain backend-owned.

decision: The workflow backbone for this run is explicit persisted state, not a new orchestration dependency.

decision: LangGraph, LangChain, and CrewAI remain available for AI subflows, but the application workflow itself is modeled as backend state transitions and API endpoints.

reason: The current gap is product orchestration and auditability, not missing workflow runtime libraries.

contract: The workflow must support these states:
- `scrape_completed`
- `opportunity_created`
- `resume_linked`
- `cover_letter_linked`
- `ats_report_linked`
- `tracker_entry_created`
- `ready_to_apply`

contract: A workflow instance must expose:
- stable workflow id
- current state
- linked job id when present
- linked resume id and locale when present
- linked ATS report id when present
- linked cover letter id when present
- linked tracker application id when present
- timestamps for creation and last transition
- a chronological transition log

decision: The workflow subject for this run is an `opportunity` record that anchors one application attempt.

contract: An opportunity record must minimally store:
- source job id or source URL
- company
- role/title
- status/workflow state
- selected resume linkage
- ATS linkage
- cover letter linkage
- tracker linkage
- notes / operator metadata

decision: This run introduces explicit operator actions instead of hidden automatic chaining.

contract: The backend must expose actions to:
- create an opportunity from an analyzed or manually supplied job
- link a resume to an opportunity
- link a generated ATS report to an opportunity
- link a generated cover letter to an opportunity
- create or attach a tracker entry from an opportunity
- mark the opportunity `ready_to_apply`

decision: Auto-creation of a tracker item is allowed only through explicit workflow completion or explicit operator action.

failure: Missing optional artifacts must not block the workflow API from returning the current state.

failure: Re-linking an artifact replaces the prior linkage but appends a transition entry.

contract: The workflow history must integrate with the existing unified activity ledger from Phase 17.

contract: Workflow-related ledger entries for this run must appear as `tracker_event` and `job_scrape` lineage extensions or as a dedicated `opportunity` subject type if needed by implementation.

decision: The UI must provide one guided workflow surface that:
- shows the current state
- displays linked artifacts
- exposes the next valid actions
- allows operators to continue from any partially completed point

test: Backend tests must validate:
- opportunity creation
- state transitions and transition log
- artifact linking and replacement semantics
- tracker creation/attachment from workflow context
- ready-to-apply state resolution

test: Frontend tests must validate:
- rendering of workflow states
- progression logic based on backend payload
- no frontend-local hidden state for orchestration

deferred: Reminders and follow-up scheduling remain a later part of Phase 18 expansion or the next run if needed.

deferred: Full enterprise analyzer integration remains Phase 19.

## Working notes

- Existing primitives already available:
  - scraped jobs
  - ATS reports with context
  - cover letters
  - tracker items
  - unified ledger
- Missing today:
  - one opportunity anchor
  - explicit state machine
  - backend linking endpoints
  - guided workflow UI
